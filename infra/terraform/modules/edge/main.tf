# Borde público de G3: un Application Load Balancer externo global con
#   api.<dominio>   → gateway (Cloud Run, NEG serverless) + Cloud Armor (WAF + rate limit)
#   admin.<dominio> → bucket estático del panel + Cloud CDN + Cloud Armor edge
# Certificado administrado por Google, TLS ≥ 1.2 (perfil MODERN) y redirección
# HTTP→HTTPS. El gateway tiene ingress "internal + load balancer": su URL
# *.run.app no es alcanzable desde Internet, solo a través de este LB.

terraform {
  required_version = ">= 1.6"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.0, < 7.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.5"
    }
  }
}

data "google_project" "this" {
  project_id = var.project_id
}

locals {
  domains     = [var.api_domain, var.admin_domain]
  cert_suffix = substr(md5(join(",", local.domains)), 0, 6)

  # La ingesta de telemetría manda ASCII binario-ish (Suntech/Queclink) que
  # dispara falsos positivos del WAF: se excluye de las reglas OWASP y se
  # protege con rate limit + token por proveedor (x-g3-ingest-token).
  waf_exclusion = "!request.path.startsWith('/api/telemetry/ingest/')"

  waf_rules = {
    "sqli"             = { priority = 2000, expr = "evaluatePreconfiguredWaf('sqli-v33-stable', {'sensitivity': ${var.waf_sensitivity}})" }
    "xss"              = { priority = 2010, expr = "evaluatePreconfiguredWaf('xss-v33-stable', {'sensitivity': ${var.waf_sensitivity}})" }
    "lfi"              = { priority = 2020, expr = "evaluatePreconfiguredWaf('lfi-v33-stable', {'sensitivity': ${var.waf_sensitivity}})" }
    "rfi"              = { priority = 2030, expr = "evaluatePreconfiguredWaf('rfi-v33-stable', {'sensitivity': ${var.waf_sensitivity}})" }
    "rce"              = { priority = 2040, expr = "evaluatePreconfiguredWaf('rce-v33-stable', {'sensitivity': ${var.waf_sensitivity}})" }
    "methodenforce"    = { priority = 2050, expr = "evaluatePreconfiguredWaf('methodenforcement-v33-stable', {'sensitivity': ${var.waf_sensitivity}})" }
    "scannerdetection" = { priority = 2060, expr = "evaluatePreconfiguredWaf('scannerdetection-v33-stable', {'sensitivity': ${var.waf_sensitivity}})" }
    "protocolattack"   = { priority = 2070, expr = "evaluatePreconfiguredWaf('protocolattack-v33-stable', {'sensitivity': ${var.waf_sensitivity}})" }
    "sessionfixation"  = { priority = 2080, expr = "evaluatePreconfiguredWaf('sessionfixation-v33-stable', {'sensitivity': ${var.waf_sensitivity}})" }
    "nodejs"           = { priority = 2090, expr = "evaluatePreconfiguredWaf('nodejs-v33-stable', {'sensitivity': ${var.waf_sensitivity}})" }
  }

  geo_expr_api   = length(var.api_allowed_regions) == 0 ? null : join(" && ", [for r in var.api_allowed_regions : "origin.region_code != '${r}'"])
  geo_expr_admin = length(var.admin_allowed_regions) == 0 ? null : join(" && ", [for r in var.admin_allowed_regions : "origin.region_code != '${r}'"])
}

resource "google_compute_global_address" "lb" {
  project = var.project_id
  name    = "${var.name_prefix}-lb-ip"
}

resource "google_compute_managed_ssl_certificate" "this" {
  project = var.project_id
  name    = "${var.name_prefix}-cert-${local.cert_suffix}"
  managed {
    domains = local.domains
  }
  lifecycle {
    create_before_destroy = true
  }
}

resource "google_compute_ssl_policy" "modern" {
  project         = var.project_id
  name            = "${var.name_prefix}-tls-modern"
  profile         = "MODERN"
  min_tls_version = "TLS_1_2"
}

# ── Cloud Armor del API ─────────────────────────────────────────────────────
resource "google_compute_security_policy" "api" {
  project     = var.project_id
  name        = "${var.name_prefix}-armor-api"
  description = "G3 API: WAF OWASP (CRS v3.3), rate limit de auth e ingesta, DDoS L7 adaptativo"
  type        = "CLOUD_ARMOR"

  adaptive_protection_config {
    layer_7_ddos_defense_config {
      enable = true
    }
  }

  advanced_options_config {
    json_parsing = "STANDARD"
    log_level    = "VERBOSE"
  }

  # Rate limit por IP: login, OTP, refresh, recuperación (además del límite
  # por cuenta del gateway, que vive en Redis).
  rule {
    priority    = 1000
    action      = "throttle"
    description = "Rate limit /api/auth/* por IP"
    match {
      expr {
        expression = "request.path.startsWith('/api/auth/')"
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"
      rate_limit_threshold {
        count        = var.auth_rate_limit_per_minute
        interval_sec = 60
      }
    }
  }

  # Webhooks de GPS: muchos puntos por proveedor (pocas IPs), tope generoso.
  rule {
    priority    = 1100
    action      = "throttle"
    description = "Rate limit /api/telemetry/ingest/* por IP"
    match {
      expr {
        expression = "request.path.startsWith('/api/telemetry/ingest/')"
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"
      rate_limit_threshold {
        count        = var.ingest_rate_limit_per_minute
        interval_sec = 60
      }
    }
  }

  # Rutas de operación que no deben exponerse por el LB.
  rule {
    priority    = 1200
    action      = "deny(404)"
    description = "Rutas internas (/api/*/internal/*, escalamientos) nunca desde Internet"
    match {
      expr {
        expression = "request.path.matches('^/api/[a-z-]+/internal/.*') || request.path.startsWith('/api/incidents/escalations/')"
      }
    }
  }

  dynamic "rule" {
    for_each = local.geo_expr_api == null ? [] : [1]
    content {
      priority    = 1500
      action      = "deny(403)"
      description = "Geo restricción del API"
      match {
        expr {
          # La ingesta de GPS queda fuera de la geo restricción (proveedores en el extranjero).
          expression = "(${local.geo_expr_api}) && ${local.waf_exclusion}"
        }
      }
    }
  }

  dynamic "rule" {
    for_each = local.waf_rules
    content {
      priority    = rule.value.priority
      action      = var.waf_preview ? "allow" : "deny(403)"
      preview     = var.waf_preview
      description = "WAF OWASP: ${rule.key}"
      match {
        expr {
          expression = "${rule.value.expr} && ${local.waf_exclusion}"
        }
      }
    }
  }

  rule {
    priority    = 2147483647
    action      = "allow"
    description = "Regla por defecto"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
  }
}

# ── Cloud Armor edge para el panel estático ─────────────────────────────────
resource "google_compute_security_policy" "admin_edge" {
  project     = var.project_id
  name        = "${var.name_prefix}-armor-admin-edge"
  description = "G3 Admin (Cloud CDN): política edge"
  type        = "CLOUD_ARMOR_EDGE"

  dynamic "rule" {
    for_each = local.geo_expr_admin == null ? [] : [1]
    content {
      priority    = 1000
      action      = "deny(403)"
      description = "Geo restricción del panel"
      match {
        expr {
          expression = local.geo_expr_admin
        }
      }
    }
  }

  rule {
    priority    = 2147483647
    action      = "allow"
    description = "Regla por defecto"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
  }
}

# ── Backend: gateway en Cloud Run ───────────────────────────────────────────
resource "google_compute_region_network_endpoint_group" "gateway" {
  project               = var.project_id
  name                  = "${var.name_prefix}-gateway-neg"
  region                = var.region
  network_endpoint_type = "SERVERLESS"
  cloud_run {
    service = var.gateway_service_name
  }
}

resource "google_compute_backend_service" "gateway" {
  project               = var.project_id
  name                  = "${var.name_prefix}-gateway-be"
  protocol              = "HTTPS"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  security_policy       = google_compute_security_policy.api.id
  enable_cdn            = false

  backend {
    group = google_compute_region_network_endpoint_group.gateway.id
  }

  log_config {
    enable      = true
    sample_rate = var.api_log_sample_rate
  }
}

# ── Backend: bucket del panel + Cloud CDN ───────────────────────────────────
resource "google_compute_backend_bucket" "admin" {
  project              = var.project_id
  name                 = "${var.name_prefix}-admin-be"
  bucket_name          = var.admin_bucket_name
  enable_cdn           = true
  compression_mode     = "AUTOMATIC"
  edge_security_policy = google_compute_security_policy.admin_edge.id

  cdn_policy {
    cache_mode        = "CACHE_ALL_STATIC"
    default_ttl       = 3600
    client_ttl        = 3600
    max_ttl           = 86400
    negative_caching  = true
    serve_while_stale = 86400
  }

  lifecycle {
    # Los headers de seguridad (CSP, HSTS…) los aplica admin/deploy/deploy.sh
    # desde admin/security-headers.js en cada despliegue.
    ignore_changes = [custom_response_headers]
  }
}

# El bucket del panel es PRIVADO (control DSI Storage-08): Cloud CDN lo lee
# con su cuenta de servicio de llenado de caché. Esa cuenta existe a partir
# de la primera llave de firma del backend bucket, por eso se crea una
# (no se usa para firmar URLs).
resource "random_id" "cdn_key" {
  byte_length = 16
}

resource "google_compute_backend_bucket_signed_url_key" "admin" {
  count          = var.admin_bucket_public ? 0 : 1
  project        = var.project_id
  name           = "${var.name_prefix}-admin-cdn-key"
  key_value      = random_id.cdn_key.b64_url
  backend_bucket = google_compute_backend_bucket.admin.name
}

resource "google_storage_bucket_iam_member" "cdn_fill" {
  count      = var.admin_bucket_public ? 0 : 1
  bucket     = var.admin_bucket_name
  role       = "roles/storage.objectViewer"
  member     = "serviceAccount:service-${data.google_project.this.number}@cloud-cdn-fill.iam.gserviceaccount.com"
  depends_on = [google_compute_backend_bucket_signed_url_key.admin]
}

# Alternativa si la lectura privada no funcionara en tu organización: bucket
# público de solo lectura (documentado como excepción en security/).
resource "google_storage_bucket_iam_member" "public_read" {
  count  = var.admin_bucket_public ? 1 : 0
  bucket = var.admin_bucket_name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# ── URL map, proxies y forwarding rules ─────────────────────────────────────
resource "google_compute_url_map" "https" {
  project         = var.project_id
  name            = "${var.name_prefix}-https"
  default_service = google_compute_backend_bucket.admin.id

  host_rule {
    hosts        = [var.api_domain]
    path_matcher = "api"
  }

  host_rule {
    hosts        = [var.admin_domain]
    path_matcher = "admin"
  }

  path_matcher {
    name            = "api"
    default_service = google_compute_backend_service.gateway.id
  }

  path_matcher {
    name            = "admin"
    default_service = google_compute_backend_bucket.admin.id
  }
}

resource "google_compute_target_https_proxy" "this" {
  project          = var.project_id
  name             = "${var.name_prefix}-https-proxy"
  url_map          = google_compute_url_map.https.id
  ssl_certificates = [google_compute_managed_ssl_certificate.this.id]
  ssl_policy       = google_compute_ssl_policy.modern.id
}

resource "google_compute_global_forwarding_rule" "https" {
  project               = var.project_id
  name                  = "${var.name_prefix}-https"
  target                = google_compute_target_https_proxy.this.id
  ip_address            = google_compute_global_address.lb.id
  port_range            = "443"
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

resource "google_compute_url_map" "http_redirect" {
  project = var.project_id
  name    = "${var.name_prefix}-http-redirect"
  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

resource "google_compute_target_http_proxy" "redirect" {
  project = var.project_id
  name    = "${var.name_prefix}-http-proxy"
  url_map = google_compute_url_map.http_redirect.id
}

resource "google_compute_global_forwarding_rule" "http" {
  project               = var.project_id
  name                  = "${var.name_prefix}-http"
  target                = google_compute_target_http_proxy.redirect.id
  ip_address            = google_compute_global_address.lb.id
  port_range            = "80"
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# ── DNS (opcional: solo si la zona vive en Cloud DNS de este proyecto) ──────
resource "google_dns_record_set" "api" {
  count        = var.dns_managed_zone == null ? 0 : 1
  project      = var.project_id
  managed_zone = var.dns_managed_zone
  name         = "${var.api_domain}."
  type         = "A"
  ttl          = 300
  rrdatas      = [google_compute_global_address.lb.address]
}

resource "google_dns_record_set" "admin" {
  count        = var.dns_managed_zone == null ? 0 : 1
  project      = var.project_id
  managed_zone = var.dns_managed_zone
  name         = "${var.admin_domain}."
  type         = "A"
  ttl          = 300
  rrdatas      = [google_compute_global_address.lb.address]
}
