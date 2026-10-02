# Red privada de G3: VPC propia, subred para Direct VPC egress de Cloud Run,
# rango de Private Service Access (Cloud SQL y Memorystore por IP privada) y
# un endpoint de Private Service Connect a las APIs de Google para que las
# llamadas servicio→servicio a *.run.app viajen por la VPC (los servicios
# internos usan ingress=internal y egress PRIVATE_RANGES_ONLY, control DSI
# Google-Cloud Run-02).

terraform {
  required_version = ">= 1.6"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.0, < 7.0"
    }
  }
}

resource "google_compute_network" "vpc" {
  project                 = var.project_id
  name                    = "${var.name_prefix}-vpc"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
}

# Subred de Cloud Run (Direct VPC egress usa IPs de aquí; /24 ≈ 250 instancias).
resource "google_compute_subnetwork" "run" {
  project                  = var.project_id
  name                     = "${var.name_prefix}-run-${var.region}"
  region                   = var.region
  network                  = google_compute_network.vpc.id
  ip_cidr_range            = var.run_subnet_cidr
  private_ip_google_access = true

  # Flow logs (control DSI de networking: flow logs en subredes con LB/servicios).
  log_config {
    aggregation_interval = "INTERVAL_5_MIN"
    flow_sampling        = var.flow_logs_sampling
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# ── Private Service Access: Cloud SQL y Memorystore con IP privada ──────────
resource "google_compute_global_address" "psa" {
  project       = var.project_id
  name          = "${var.name_prefix}-psa"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  address       = var.psa_range_address
  prefix_length = var.psa_range_prefix
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "psa" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.psa.name]
  # Al destruir, abandonar el peering (si no, falla mientras existan Cloud SQL/Redis).
  deletion_policy = "ABANDON"
}

# ── Private Service Connect a las APIs de Google (incluye *.run.app) ────────
resource "google_compute_global_address" "psc" {
  project      = var.project_id
  name         = "${var.name_prefix}-psc-apis"
  purpose      = "PRIVATE_SERVICE_CONNECT"
  address_type = "INTERNAL"
  address      = var.psc_address
  network      = google_compute_network.vpc.id
}

resource "google_compute_global_forwarding_rule" "psc" {
  project               = var.project_id
  name                  = var.psc_endpoint_name # 1-20 caracteres, [a-z][a-z0-9]*
  target                = "all-apis"
  network               = google_compute_network.vpc.id
  ip_address            = google_compute_global_address.psc.id
  load_balancing_scheme = ""
}

# DNS privado: *.run.app → endpoint PSC (IP RFC1918), así el egress
# PRIVATE_RANGES_ONLY enruta por la VPC y Cloud Run trata la petición como
# interna (requisito de ingress=internal).
resource "google_dns_managed_zone" "run_app" {
  project     = var.project_id
  name        = "${var.name_prefix}-run-app"
  dns_name    = "run.app."
  description = "Cloud Run por Private Service Connect (servicio→servicio por la VPC)"
  visibility  = "private"

  private_visibility_config {
    networks {
      network_url = google_compute_network.vpc.id
    }
  }
}

resource "google_dns_record_set" "run_app_wildcard" {
  project      = var.project_id
  managed_zone = google_dns_managed_zone.run_app.name
  name         = "*.run.app."
  type         = "A"
  ttl          = 300
  rrdatas      = [google_compute_global_address.psc.address]
}

resource "google_dns_record_set" "run_app_apex" {
  project      = var.project_id
  managed_zone = google_dns_managed_zone.run_app.name
  name         = "run.app."
  type         = "A"
  ttl          = 300
  rrdatas      = [google_compute_global_address.psc.address]
}

# ── Firewall: la VPC no recibe tráfico de Internet ──────────────────────────
# (Cloud Run no necesita reglas de ingreso; Cloud SQL/Redis viven en la VPC
# de Google peered.) Se deja explícita la regla de bloqueo con logs.
resource "google_compute_firewall" "deny_ingress" {
  project   = var.project_id
  name      = "${var.name_prefix}-deny-all-ingress"
  network   = google_compute_network.vpc.id
  direction = "INGRESS"
  priority  = 65000

  deny {
    protocol = "all"
  }
  source_ranges = ["0.0.0.0/0"]

  log_config {
    metadata = "INCLUDE_ALL_METADATA"
  }
}

# ── Cloud NAT (solo si algún servicio usa egress ALL_TRAFFIC) ───────────────
resource "google_compute_router" "nat" {
  count   = var.enable_nat ? 1 : 0
  project = var.project_id
  name    = "${var.name_prefix}-router"
  region  = var.region
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "nat" {
  count                              = var.enable_nat ? 1 : 0
  project                            = var.project_id
  name                               = "${var.name_prefix}-nat"
  router                             = google_compute_router.nat[0].name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}
