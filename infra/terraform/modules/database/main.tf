# Cloud SQL para PostgreSQL 16: una instancia, base `g3`, IP privada, TLS
# obligatorio, backups + PITR, flags de auditoría y Query Insights.
#
# Usuarios: Terraform solo fija la contraseña de `postgres` (admin). Los roles
# de servicio NO se crean por la API de Cloud SQL (eso los haría miembros de
# cloudsqlsuperuser); los crea el job g3-db-bootstrap con
# backend/infra/db/init-schemas.sql usando las contraseñas que se generan
# aquí y se guardan en Secret Manager. Por servicio hay dos roles:
#   g3_<svc>_migrator  dueño del schema (jobs de migración/mantenimiento)
#   g3_<svc>           runtime de Cloud Run (solo DML)

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

locals {
  base_flags = {
    # Consultas lentas (control DSI Cloud SQL-12: slow query logs).
    "log_min_duration_statement" = tostring(var.log_min_duration_ms)
    "log_checkpoints"            = "on"
    "log_connections"            = "on"
    "log_disconnections"         = "on"
    "log_lock_waits"             = "on"
    "log_temp_files"             = "0"
    "max_connections"            = tostring(var.max_connections)
    # Auditoría de DDL y cambios de roles (pgaudit).
    "cloudsql.enable_pgaudit" = "on"
    "pgaudit.log"             = "ddl,role"
    # Corta transacciones abiertas olvidadas (bloquean vacuum).
    "idle_in_transaction_session_timeout" = "300000"
  }
  flags = merge(local.base_flags, var.extra_flags)
}

resource "google_sql_database_instance" "pg" {
  project             = var.project_id
  name                = var.instance_name
  region              = var.region
  database_version    = "POSTGRES_16"
  deletion_protection = var.deletion_protection

  settings {
    tier                        = var.tier
    edition                     = "ENTERPRISE"
    availability_type           = var.high_availability ? "REGIONAL" : "ZONAL"
    disk_type                   = "PD_SSD"
    disk_size                   = var.disk_size_gb
    disk_autoresize             = true
    disk_autoresize_limit       = var.disk_autoresize_limit_gb
    deletion_protection_enabled = var.deletion_protection
    user_labels                 = var.labels

    ip_configuration {
      ipv4_enabled                                  = false # sin IP pública (control DSI Cloud SQL-10)
      private_network                               = var.network_id
      enable_private_path_for_google_cloud_services = true
      ssl_mode                                      = "ENCRYPTED_ONLY"
    }

    backup_configuration {
      enabled                        = true
      start_time                     = var.backup_start_time
      location                       = var.backup_location
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = var.pitr_days

      backup_retention_settings {
        retained_backups = var.backup_retention_count
        retention_unit   = "COUNT"
      }
    }

    maintenance_window {
      day          = var.maintenance_day
      hour         = var.maintenance_hour
      update_track = "stable"
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 2048
      record_application_tags = true
      record_client_address   = false
      query_plans_per_minute  = 5
    }

    password_validation_policy {
      enable_password_policy      = true
      min_length                  = 24
      complexity                  = "COMPLEXITY_DEFAULT"
      disallow_username_substring = true
    }

    dynamic "database_flags" {
      for_each = local.flags
      content {
        name  = database_flags.key
        value = database_flags.value
      }
    }
  }

  lifecycle {
    # El tamaño de disco crece solo (autoresize): no pelear con Terraform.
    ignore_changes = [settings[0].disk_size]
  }
}

resource "google_sql_database" "g3" {
  project  = var.project_id
  instance = google_sql_database_instance.pg.name
  name     = var.database_name
  # Nunca borrar la base desde Terraform.
  deletion_policy = "ABANDON"
}

# ── Contraseñas ─────────────────────────────────────────────────────────────
# Viven en el state (bucket GCS privado y versionado) y en Secret Manager.
# Para rotar: cambiar `password_rotation_id` (ver docs/ops/RUNBOOK.md).
resource "random_password" "admin" {
  length  = 40
  special = false
  keepers = { rotation = var.password_rotation_id }
}

resource "google_sql_user" "admin" {
  project         = var.project_id
  instance        = google_sql_database_instance.pg.name
  name            = "postgres"
  password        = random_password.admin.result
  deletion_policy = "ABANDON"
}

resource "random_password" "svc" {
  for_each = toset(var.service_roles)
  length   = 40
  special  = false
  keepers  = { rotation = var.password_rotation_id }
}

resource "random_password" "migrator" {
  for_each = toset(var.service_roles)
  length   = 40
  special  = false
  keepers  = { rotation = var.password_rotation_id }
}

resource "google_secret_manager_secret" "admin_password" {
  project   = var.project_id
  secret_id = "g3-db-admin-password"
  labels    = var.labels
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "admin_password" {
  secret      = google_secret_manager_secret.admin_password.id
  secret_data = random_password.admin.result
}

resource "google_secret_manager_secret" "svc_password" {
  for_each  = toset(var.service_roles)
  project   = var.project_id
  secret_id = "g3-db-password-${each.key}"
  labels    = var.labels
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "svc_password" {
  for_each    = toset(var.service_roles)
  secret      = google_secret_manager_secret.svc_password[each.key].id
  secret_data = random_password.svc[each.key].result
}

# DATABASE_URL completo por servicio (rol g3_<svc>, IP privada, TLS).
# sslmode=no-verify: cifrado obligatorio (la instancia es ENCRYPTED_ONLY)
# sin validar el certificado, porque el certificado de Cloud SQL no trae la
# IP privada como SAN. Riesgo residual y alternativa (Auth Proxy sidecar o
# CA administrada + DNS) en docs/ops/PRODUCTION-READINESS.md.
resource "google_secret_manager_secret" "svc_url" {
  for_each  = toset(var.service_roles)
  project   = var.project_id
  secret_id = "g3-db-url-${each.key}"
  labels    = var.labels
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "svc_url" {
  for_each = toset(var.service_roles)
  secret   = google_secret_manager_secret.svc_url[each.key].id
  secret_data = format(
    "postgres://g3_%s:%s@%s:5432/%s?sslmode=%s",
    each.key,
    random_password.svc[each.key].result,
    google_sql_database_instance.pg.private_ip_address,
    var.database_name,
    var.client_sslmode,
  )
}

# ── Rol dueño (migrator): contraseña y DATABASE_URL para los jobs ──────────
resource "google_secret_manager_secret" "migrator_password" {
  for_each  = toset(var.service_roles)
  project   = var.project_id
  secret_id = "g3-db-migrator-password-${each.key}"
  labels    = var.labels
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "migrator_password" {
  for_each    = toset(var.service_roles)
  secret      = google_secret_manager_secret.migrator_password[each.key].id
  secret_data = random_password.migrator[each.key].result
}

resource "google_secret_manager_secret" "migrator_url" {
  for_each  = toset(var.service_roles)
  project   = var.project_id
  secret_id = "g3-db-migrator-url-${each.key}"
  labels    = var.labels
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "migrator_url" {
  for_each = toset(var.service_roles)
  secret   = google_secret_manager_secret.migrator_url[each.key].id
  secret_data = format(
    "postgres://g3_%s_migrator:%s@%s:5432/%s?sslmode=%s",
    each.key,
    random_password.migrator[each.key].result,
    google_sql_database_instance.pg.private_ip_address,
    var.database_name,
    var.client_sslmode,
  )
}
