data "google_project" "this" {
  project_id = var.project_id
}

locals {
  name_prefix = "g3-${var.short_env}"

  labels = merge({
    app          = "g3"
    env          = var.env
    area         = var.label_area
    ecosistema   = var.label_ecosistema
    "managed-by" = "terraform"
  }, var.extra_labels)

  registry = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.g3.repository_id}"

  # ── Catálogo de servicios ─────────────────────────────────────────────────
  # http        : tiene servidor HTTP (Cloud Run service). invoicing hoy es
  #               solo librería + schema: tiene job de migración, no servicio.
  # db / redis  : recibe DATABASE_URL (rol g3_<svc>) / REDIS_URL.
  # app_secrets : secretos de la app que lee (claves de local.app_secrets).
  # calls       : servicios que invoca (→ <SVC>_URL + run.invoker sobre ellos).
  catalog = {
    gateway = {
      http        = true
      db          = false
      redis       = true
      public      = true
      app_secrets = ["jwt_access"]
      calls       = ["auth", "billing", "drivers", "fleet", "trips", "alerts", "ai", "integrations"]
    }
    auth = {
      http        = true
      db          = true
      redis       = true
      public      = false
      app_secrets = ["jwt_access", "jwt_refresh", "mfa_encryption_key", "mfa_token_secret", "recovery_pepper", "internal_token", "audit_ingest_token"]
      calls       = ["integrations"]
    }
    billing = {
      http        = true
      db          = true
      redis       = true
      public      = false
      app_secrets = ["internal_token", "audit_ingest_token"]
      calls       = ["integrations"]
    }
    drivers = {
      http        = true
      db          = true
      redis       = true
      public      = false
      app_secrets = []
      calls       = []
    }
    fleet = {
      http        = true
      db          = true
      redis       = true
      public      = false
      app_secrets = ["internal_token", "audit_ingest_token"]
      calls       = ["alerts", "trips"]
    }
    trips = {
      http        = true
      db          = true
      redis       = true
      public      = false
      app_secrets = ["internal_token", "audit_ingest_token"]
      calls       = ["auth"]
    }
    alerts = {
      http        = true
      db          = true
      redis       = true
      public      = false
      app_secrets = ["internal_token", "audit_ingest_token"]
      calls       = ["integrations"]
    }
    ai = {
      http        = true
      db          = false
      redis       = false
      public      = false
      app_secrets = []
      calls       = []
    }
    integrations = {
      http        = true
      db          = true
      redis       = true
      public      = false
      app_secrets = ["internal_token", "audit_ingest_token", "integrations_encryption_key"]
      calls       = ["auth"]
    }
    invoicing = {
      http        = false
      db          = true
      redis       = false
      public      = false
      app_secrets = ["internal_token", "audit_ingest_token"]
      calls       = ["integrations"]
    }
  }

  http_services = [for s, c in local.catalog : s if c.http]
  db_services   = [for s, c in local.catalog : s if c.db]

  # URL determinista de Cloud Run: https://<servicio>-<número de proyecto>.<región>.run.app
  # (evita ciclos entre servicios que se llaman mutuamente, p. ej. auth ↔ integrations).
  run_url = { for s in local.http_services : s => "https://g3-${s}-${data.google_project.this.number}.${var.region}.run.app" }

  # Quién llama a quién (inverso de `calls`) → run.invoker.
  callers = {
    for target in local.http_services : target => [
      for caller, c in local.catalog : caller if contains(c.calls, target)
    ]
  }

  # ── Secretos de la aplicación (sin valores: se cargan con gcloud, ver DEPLOY.md) ──
  app_secrets = {
    jwt_access                  = { id = "g3-jwt-access", env = "JWT_ACCESS_SECRET", how = "openssl rand -hex 32" }
    jwt_refresh                 = { id = "g3-jwt-refresh", env = "JWT_REFRESH_SECRET", how = "openssl rand -hex 32" }
    mfa_encryption_key          = { id = "g3-mfa-encryption-key", env = "MFA_ENCRYPTION_KEY", how = "openssl rand -base64 32" }
    mfa_token_secret            = { id = "g3-mfa-token-secret", env = "MFA_TOKEN_SECRET", how = "openssl rand -hex 32" }
    recovery_pepper             = { id = "g3-mfa-recovery-pepper", env = "MFA_RECOVERY_PEPPER", how = "openssl rand -hex 32" }
    integrations_encryption_key = { id = "g3-integrations-encryption-key", env = "INTEGRATIONS_ENCRYPTION_KEY", how = "openssl rand -base64 32" }
    internal_token              = { id = "g3-internal-token", env = "INTERNAL_TOKEN", how = "openssl rand -hex 32" }
    audit_ingest_token          = { id = "g3-audit-ingest-token", env = "AUDIT_INGEST_TOKEN", how = "openssl rand -hex 32" }
  }

  # ── Tamaños ───────────────────────────────────────────────────────────────
  default_sizing = {
    min_instances = 0
    max_instances = 10
    cpu           = "1"
    memory        = "512Mi"
    concurrency   = 80
    cpu_idle      = true
  }
  sizing = {
    for s in local.http_services : s => {
      min_instances = coalesce(try(var.services[s].min_instances, null), local.default_sizing.min_instances)
      max_instances = coalesce(try(var.services[s].max_instances, null), local.default_sizing.max_instances)
      cpu           = coalesce(try(var.services[s].cpu, null), local.default_sizing.cpu)
      memory        = coalesce(try(var.services[s].memory, null), local.default_sizing.memory)
      concurrency   = coalesce(try(var.services[s].concurrency, null), local.default_sizing.concurrency)
      cpu_idle      = coalesce(try(var.services[s].cpu_idle, null), local.default_sizing.cpu_idle)
    }
  }

  # ── Variables de entorno ──────────────────────────────────────────────────
  redis_ca_dir = "/secrets/redis-ca"

  specific_env = {
    gateway = {
      # Saltos de proxy confiables: Google Front End + LB.
      TRUST_PROXY_HOPS   = "2"
      RATE_LIMIT_ENABLED = "1"
    }
    auth = {
      GCP_PROJECT_ID     = var.project_id
      PUBSUB_TOPIC       = google_pubsub_topic.domain_events.name
      SSO_REDIRECT_URI   = "https://${var.admin_domain}/login/sso/callback"
      PASSWORD_RESET_URL = "https://${var.admin_domain}/login/reset"
      MFA_ISSUER         = var.mfa_issuer
    }
    billing = {}
    drivers = {}
    fleet = {
      TELEMETRY_RETENTION_MONTHS = tostring(var.telemetry_retention_months)
    }
    trips = {
      EVIDENCE_BUCKET    = google_storage_bucket.evidence.name
      EVIDENCE_SIGNER_SA = google_service_account.svc["trips"].email
    }
    alerts = {}
    ai = {
      GCP_PROJECT_ID  = var.project_id
      VERTEX_LOCATION = var.region
    }
    integrations = var.platform_company_id == "" ? {} : { G3_PLATFORM_COMPANY_ID = var.platform_company_id }
    invoicing    = {}
  }

  env = {
    for s, c in local.catalog : s => merge(
      {
        NODE_ENV     = "production"
        G3_ENV       = var.env
        SERVICE_AUTH = "gcp"
      },
      c.db ? { DB_POOL_MAX = tostring(var.db_pool_max), DB_MIGRATE_ON_BOOT = "0" } : {},
      c.redis ? { NODE_EXTRA_CA_CERTS = "${local.redis_ca_dir}/ca.pem" } : {},
      { for callee in c.calls : "${upper(callee)}_URL" => local.run_url[callee] },
      local.specific_env[s],
      lookup(var.extra_env, s, {}),
    )
  }

  secret_env = {
    for s, c in local.catalog : s => merge(
      { for k in c.app_secrets : local.app_secrets[k].env => google_secret_manager_secret.app[k].secret_id },
      c.db ? { DATABASE_URL = module.database.url_secret_ids[s] } : {},
      c.redis ? { REDIS_URL = module.redis.url_secret_id } : {},
      lookup(var.extra_secret_env, s, {}),
    )
  }

  # Pares (servicio, secreto) → secretAccessor por secreto (mínimo privilegio).
  secret_access = merge([
    for s, c in local.catalog : merge(
      { for env_name, secret_id in local.secret_env[s] : "${s}/${secret_id}" => { svc = s, secret = secret_id } },
      c.redis ? { "${s}/${module.redis.ca_secret_id}" = { svc = s, secret = module.redis.ca_secret_id } } : {},
      { for secret_id in lookup(var.extra_secret_access, s, []) : "${s}/${secret_id}" => { svc = s, secret = secret_id } },
    )
  ]...)

  # Conexiones máximas que pueden abrir los servicios con base.
  db_connections_budget = sum([for s in local.db_services : try(local.sizing[s].max_instances, 1) * var.db_pool_max]) + 20
}

check "postgres_connections" {
  assert {
    condition     = local.db_connections_budget <= var.sql_max_connections
    error_message = "Σ(max_instances × DB_POOL_MAX) + 20 (${local.db_connections_budget}) supera sql_max_connections (${var.sql_max_connections}). Sube max_connections/tier o baja instancias/pool."
  }
}
