# Piezas de plataforma: red, base, Redis, registro de imágenes, Pub/Sub,
# secretos de la aplicación y cuentas de servicio.

module "network" {
  source            = "../network"
  project_id        = var.project_id
  region            = var.region
  name_prefix       = local.name_prefix
  run_subnet_cidr   = var.run_subnet_cidr
  psc_endpoint_name = "g3psc${var.short_env}"
  enable_nat        = var.vpc_egress == "ALL_TRAFFIC"
  depends_on        = [google_project_service.apis]
}

module "database" {
  source                 = "../database"
  project_id             = var.project_id
  region                 = var.region
  instance_name          = "${local.name_prefix}-pg16"
  network_id             = module.network.network_id
  tier                   = var.sql_tier
  high_availability      = var.sql_high_availability
  disk_size_gb           = var.sql_disk_size_gb
  max_connections        = var.sql_max_connections
  backup_retention_count = var.sql_backup_retention_count
  pitr_days              = var.sql_pitr_days
  deletion_protection    = var.deletion_protection
  service_roles          = local.db_services
  password_rotation_id   = var.db_password_rotation_id
  labels                 = local.labels
  depends_on             = [module.network]
}

module "redis" {
  source            = "../redis"
  project_id        = var.project_id
  region            = var.region
  name              = "${local.name_prefix}-redis"
  tier              = var.redis_tier
  memory_size_gb    = var.redis_memory_gb
  network_id        = module.network.network_id
  reserved_ip_range = module.network.psa_range_name
  labels            = local.labels
  depends_on        = [module.network]
}

# ── Artifact Registry ───────────────────────────────────────────────────────
resource "google_artifact_registry_repository" "g3" {
  project       = var.project_id
  location      = var.region
  repository_id = "g3"
  format        = "DOCKER"
  description   = "Imágenes de los servicios G3 (tag = commit SHA, inmutables)"
  labels        = local.labels

  docker_config {
    immutable_tags = true
  }

  cleanup_policy_dry_run = false
  cleanup_policies {
    id     = "conservar-recientes"
    action = "KEEP"
    most_recent_versions {
      keep_count = 30
    }
  }
  cleanup_policies {
    id     = "borrar-sin-tag"
    action = "DELETE"
    condition {
      tag_state  = "UNTAGGED"
      older_than = "1209600s" # 14 días
    }
  }

  depends_on = [google_project_service.apis]
}

# ── Pub/Sub ─────────────────────────────────────────────────────────────────
resource "google_pubsub_topic" "domain_events" {
  project                    = var.project_id
  name                       = "g3-domain-events"
  labels                     = local.labels
  message_retention_duration = "604800s" # 7 días: permite re-procesar
  message_storage_policy {
    allowed_persistence_regions = [var.region]
  }
  depends_on = [google_project_service.apis]
}

# DLQ para las suscripciones que se creen sobre g3-domain-events (control DSI Cloud Run-07).
resource "google_pubsub_topic" "domain_events_dlq" {
  project                    = var.project_id
  name                       = "g3-domain-events-dlq"
  labels                     = local.labels
  message_retention_duration = "604800s"
  message_storage_policy {
    allowed_persistence_regions = [var.region]
  }
  depends_on = [google_project_service.apis]
}

# Notificaciones de Secret Manager (cambios y recordatorios de rotación).
resource "google_pubsub_topic" "secret_events" {
  project = var.project_id
  name    = "g3-secret-events"
  labels  = local.labels
  message_storage_policy {
    allowed_persistence_regions = [var.region]
  }
  depends_on = [google_project_service.apis]
}

resource "google_pubsub_topic_iam_member" "secretmanager_publisher" {
  project = var.project_id
  topic   = google_pubsub_topic.secret_events.name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_project_service_identity.secretmanager.email}"
}

# Suscripción de auditoría a los eventos de secretos (revisión por seguridad).
resource "google_pubsub_subscription" "secret_events_audit" {
  project                    = var.project_id
  name                       = "g3-secret-events-audit"
  topic                      = google_pubsub_topic.secret_events.id
  labels                     = local.labels
  message_retention_duration = "604800s"
  ack_deadline_seconds       = 60
  expiration_policy {
    ttl = ""
  }
}

# ── Secretos de la aplicación (contenedores vacíos; valores con gcloud) ─────
resource "google_secret_manager_secret" "app" {
  for_each  = local.app_secrets
  project   = var.project_id
  secret_id = each.value.id
  labels    = merge(local.labels, { env-var = lower(replace(each.value.env, "_", "-")) })

  annotations = {
    generar = each.value.how
  }

  replication {
    auto {}
  }

  topics {
    name = google_pubsub_topic.secret_events.id
  }

  rotation {
    rotation_period    = var.secret_rotation_period
    next_rotation_time = var.secret_rotation_start
  }

  lifecycle {
    # Secret Manager avanza next_rotation_time solo.
    ignore_changes = [rotation[0].next_rotation_time]
  }

  depends_on = [google_pubsub_topic_iam_member.secretmanager_publisher]
}

# ── Cuentas de servicio (una por servicio, sin llaves) ──────────────────────
resource "google_service_account" "svc" {
  for_each     = toset(keys(local.catalog))
  project      = var.project_id
  account_id   = "g3-run-${each.key}"
  display_name = "G3 ${each.key} (Cloud Run)"
  description  = "Runtime de g3-${each.key} y de su job migrate-${each.key}. Mínimo privilegio."
  depends_on   = [google_project_service.apis]
}

resource "google_service_account" "scheduler" {
  project      = var.project_id
  account_id   = "g3-scheduler"
  display_name = "G3 Cloud Scheduler"
  description  = "Invoca alerts (escalamiento de incidentes) con OIDC."
}

resource "google_service_account" "db_bootstrap" {
  project      = var.project_id
  account_id   = "g3-db-bootstrap"
  display_name = "G3 DB bootstrap"
  description  = "Aplica init-schemas.sql (roles y permisos) como administrador de la base."
}

# Cloud SQL client (por si se usa el conector/Auth Proxy; la conexión normal es por IP privada).
resource "google_project_iam_member" "sql_client" {
  for_each = toset(concat(local.db_services, ["db-bootstrap"]))
  project  = var.project_id
  role     = "roles/cloudsql.client"
  member   = each.key == "db-bootstrap" ? google_service_account.db_bootstrap.member : google_service_account.svc[each.key].member
}

# auth publica eventos de dominio.
resource "google_pubsub_topic_iam_member" "auth_publisher" {
  project = var.project_id
  topic   = google_pubsub_topic.domain_events.name
  role    = "roles/pubsub.publisher"
  member  = google_service_account.svc["auth"].member
}

# ai usa Vertex AI.
resource "google_project_iam_member" "ai_vertex" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = google_service_account.svc["ai"].member
}

# trips firma URLs de evidencias con su propia cuenta (signBlob sobre sí misma).
resource "google_service_account_iam_member" "trips_self_sign" {
  service_account_id = google_service_account.svc["trips"].name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = google_service_account.svc["trips"].member
}

# Acceso a secretos: uno por (servicio, secreto).
resource "google_secret_manager_secret_iam_member" "svc" {
  for_each   = local.secret_access
  project    = var.project_id
  secret_id  = each.value.secret
  role       = "roles/secretmanager.secretAccessor"
  member     = google_service_account.svc[each.value.svc].member
  depends_on = [google_secret_manager_secret.app, module.database, module.redis]
}

resource "google_secret_manager_secret_iam_member" "db_bootstrap" {
  for_each   = toset(concat([module.database.admin_password_secret_id], values(module.database.password_secret_ids)))
  project    = var.project_id
  secret_id  = each.value
  role       = "roles/secretmanager.secretAccessor"
  member     = google_service_account.db_bootstrap.member
  depends_on = [module.database]
}

# El plan de Terraform (CI) lee el token interno para el header de Cloud Scheduler.
variable "terraform_plan_member" {
  description = "Miembro (serviceAccount:g3-tf-plan@…) que corre terraform plan en CI. null = ninguno."
  type        = string
  default     = null
}

resource "google_secret_manager_secret_iam_member" "tf_plan_internal_token" {
  count     = var.terraform_plan_member == null ? 0 : 1
  project   = var.project_id
  secret_id = google_secret_manager_secret.app["internal_token"].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = var.terraform_plan_member
}
