# ── Mantenimiento de telemetría (fleet): particiones futuras + retención ────
# `node dist/maintenance.js` crea las particiones del mes anterior, el actual
# y los 3 siguientes, y borra las más viejas que TELEMETRY_RETENTION_MONTHS.
# Idempotente: si un día falla, el siguiente lo recupera (3 meses de holgura).

variable "telemetry_retention_months" {
  description = "TELEMETRY_RETENTION_MONTHS de fleet: meses de telemetría que se conservan (0 = no borra)."
  type        = number
  default     = 13
}

variable "fleet_maintenance_schedule" {
  description = "Cron del job g3-fleet-maintenance (zona scheduler_time_zone). Default 03:17 diario."
  type        = string
  default     = "17 3 * * *"
}

module "fleet_maintenance_job" {
  source = "../cloud-run-job"
  count  = var.deploy_workloads ? 1 : 0

  project_id            = var.project_id
  region                = var.region
  name                  = "g3-fleet-maintenance"
  image                 = "${local.registry}/fleet:${var.image_tag}"
  command               = ["node"]
  args                  = ["dist/maintenance.js"]
  service_account_email = google_service_account.svc["fleet"].email
  env = {
    NODE_ENV                   = "production"
    G3_ENV                     = var.env
    DB_POOL_MAX                = "2"
    TELEMETRY_RETENTION_MONTHS = tostring(var.telemetry_retention_months)
  }
  secret_env = {
    DATABASE_URL = module.database.url_secret_ids["fleet"]
  }
  timeout_seconds = 1800
  max_retries     = 2
  network         = module.network.network_id
  subnetwork      = module.network.run_subnet_id
  labels          = merge(local.labels, { service = "fleet", job = "maintenance" })

  depends_on = [google_secret_manager_secret_iam_member.svc]
}

# Cloud Scheduler ejecuta el job por la API de Cloud Run (OAuth de g3-scheduler).
resource "google_cloud_run_v2_job_iam_member" "fleet_maintenance_scheduler" {
  count    = var.deploy_workloads ? 1 : 0
  project  = var.project_id
  location = var.region
  name     = module.fleet_maintenance_job[0].name
  role     = "roles/run.invoker"
  member   = google_service_account.scheduler.member
}

resource "google_cloud_scheduler_job" "fleet_maintenance" {
  count            = var.deploy_workloads ? 1 : 0
  project          = var.project_id
  region           = var.region
  name             = "g3-fleet-maintenance"
  description      = "Diario: particiones de telemetría y retención (job g3-fleet-maintenance)"
  schedule         = var.fleet_maintenance_schedule
  time_zone        = var.scheduler_time_zone
  attempt_deadline = "60s"

  retry_config {
    retry_count          = 3
    min_backoff_duration = "300s"
  }

  http_target {
    http_method = "POST"
    uri         = "https://run.googleapis.com/v2/projects/${var.project_id}/locations/${var.region}/jobs/${module.fleet_maintenance_job[0].name}:run"
    oauth_token {
      service_account_email = google_service_account.scheduler.email
      scope                 = "https://www.googleapis.com/auth/cloud-platform"
    }
  }

  depends_on = [google_cloud_run_v2_job_iam_member.fleet_maintenance_scheduler]
}
