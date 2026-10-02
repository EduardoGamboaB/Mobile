# Memorystore for Redis 7: estado efímero compartido entre réplicas
# (EphemeralStore de @g3/platform). AUTH + TLS (SERVER_AUTHENTICATION) y sin
# persistencia: nada que no se pueda perder vive aquí.
#
# Secretos que produce:
#   g3-redis-url  → REDIS_URL = rediss://:<auth>@<host>:<port>
#   g3-redis-ca   → CA del servidor (se monta como archivo y se apunta con
#                   NODE_EXTRA_CA_CERTS para que ioredis valide el TLS).

terraform {
  required_version = ">= 1.6"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.0, < 7.0"
    }
  }
}

resource "google_redis_instance" "this" {
  project        = var.project_id
  name           = var.name
  region         = var.region
  tier           = var.tier
  memory_size_gb = var.memory_size_gb
  redis_version  = var.redis_version
  display_name   = "G3 ${var.name}"
  labels         = var.labels

  authorized_network = var.network_id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"
  reserved_ip_range  = var.reserved_ip_range

  auth_enabled            = true
  transit_encryption_mode = "SERVER_AUTHENTICATION"

  redis_configs = {
    # Solo llaves con TTL deberían existir; si se llena, se expulsan esas primero.
    "maxmemory-policy" = "volatile-lru"
  }

  persistence_config {
    persistence_mode = "DISABLED"
  }

  maintenance_policy {
    weekly_maintenance_window {
      day = var.maintenance_day
      start_time {
        hours   = var.maintenance_hour
        minutes = 0
        seconds = 0
        nanos   = 0
      }
    }
  }
}

resource "google_secret_manager_secret" "url" {
  project   = var.project_id
  secret_id = "g3-redis-url"
  labels    = var.labels
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "url" {
  secret = google_secret_manager_secret.url.id
  secret_data = format(
    "rediss://:%s@%s:%d",
    google_redis_instance.this.auth_string,
    google_redis_instance.this.host,
    google_redis_instance.this.port,
  )
}

resource "google_secret_manager_secret" "ca" {
  project   = var.project_id
  secret_id = "g3-redis-ca"
  labels    = var.labels
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "ca" {
  secret      = google_secret_manager_secret.ca.id
  secret_data = join("\n", [for c in google_redis_instance.this.server_ca_certs : c.cert])
}
