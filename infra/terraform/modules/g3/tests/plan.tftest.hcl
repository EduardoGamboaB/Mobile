# Pruebas del módulo con providers simulados (sin credenciales ni GCP):
#   cd infra/terraform/modules/g3 && terraform init -backend=false && terraform test
# Verifican el cableado: invocadores entre servicios, secretos por servicio,
# variables de entorno y jobs.

mock_provider "google" {
  mock_data "google_project" {
    defaults = {
      number = "123456789012"
    }
  }
  mock_data "google_secret_manager_secret_version" {
    defaults = {
      secret_data = "token-de-prueba"
    }
  }
}

mock_provider "google-beta" {}
mock_provider "random" {}

variables {
  project_id                 = "g3-test"
  env                        = "staging"
  short_env                  = "stg"
  api_domain                 = "api.example.test"
  admin_domain               = "admin.example.test"
  sql_tier                   = "db-custom-1-3840"
  sql_high_availability      = false
  sql_max_connections        = 500
  sql_backup_retention_count = 7
  redis_tier                 = "BASIC"
  alert_emails               = ["oncall@example.test"]
  deploy_workloads           = true
  image_tag                  = "abc123"
}

run "fase_2_completa" {
  command = plan

  # Servicios HTTP: todos menos invoicing.
  assert {
    condition     = length(module.service) == 9
    error_message = "Se esperaban 9 servicios Cloud Run."
  }

  assert {
    condition     = !contains(keys(module.service), "invoicing")
    error_message = "invoicing no tiene servidor HTTP."
  }

  # Jobs de migración: uno por servicio con schema.
  assert {
    condition     = length(module.migrate_job) == 8
    error_message = "Se esperaban 8 jobs migrate-<svc>."
  }

  # Pares de invocación (mínimo privilegio).
  assert {
    condition     = sort(local.callers["integrations"]) == sort(["alerts", "auth", "billing", "gateway", "invoicing"])
    error_message = "integrations debe ser invocable solo por gateway, auth, alerts, billing e invoicing."
  }

  assert {
    condition     = sort(local.callers["auth"]) == sort(["gateway", "integrations", "trips"])
    error_message = "auth debe ser invocable solo por gateway, trips e integrations."
  }

  assert {
    condition     = sort(local.callers["alerts"]) == sort(["fleet", "gateway"])
    error_message = "alerts: gateway y fleet (+ Cloud Scheduler aparte)."
  }

  assert {
    condition     = local.callers["drivers"] == ["gateway"]
    error_message = "drivers: solo gateway."
  }

  # Variables que producción exige.
  assert {
    condition     = alltrue([for k in ["ALERTS_URL", "TRIPS_URL", "TELEMETRY_RETENTION_MONTHS"] : contains(keys(local.env["fleet"]), k)])
    error_message = "fleet necesita ALERTS_URL, TRIPS_URL y TELEMETRY_RETENTION_MONTHS."
  }

  assert {
    condition     = alltrue([for k in ["INTERNAL_TOKEN", "DATABASE_URL", "REDIS_URL"] : contains(keys(local.secret_env["fleet"]), k)])
    error_message = "fleet necesita INTERNAL_TOKEN, DATABASE_URL y REDIS_URL."
  }

  assert {
    condition     = local.env["trips"]["AUTH_URL"] == "https://g3-auth-123456789012.us-central1.run.app"
    error_message = "trips debe apuntar a la URL determinista de auth."
  }

  assert {
    condition     = !contains(keys(local.secret_env["gateway"]), "INTERNAL_TOKEN")
    error_message = "El gateway no debe tener INTERNAL_TOKEN."
  }

  assert {
    condition     = local.env["auth"]["SERVICE_AUTH"] == "gcp" && local.env["auth"]["NODE_ENV"] == "production"
    error_message = "SERVICE_AUTH=gcp y NODE_ENV=production en todos."
  }

  # Mantenimiento de telemetría y escalamiento.
  assert {
    condition     = length(module.fleet_maintenance_job) == 1 && length(google_cloud_scheduler_job.escalations) == 1
    error_message = "Faltan el job de mantenimiento o el scheduler de escalamiento."
  }

  assert {
    condition     = google_cloud_scheduler_job.escalations[0].http_target[0].uri == "https://g3-alerts-123456789012.us-central1.run.app/api/incidents/escalations/run"
    error_message = "URI del escalamiento incorrecta."
  }

  # Solo trips administra el bucket de evidencias.
  assert {
    condition     = google_storage_bucket_iam_member.evidence_trips.role == "roles/storage.objectAdmin"
    error_message = "trips debe tener objectAdmin del bucket de evidencias."
  }
}

run "fase_1_sin_cargas" {
  command = plan

  variables {
    deploy_workloads = false
  }

  assert {
    condition     = length(module.service) == 0 && length(module.migrate_job) == 0 && length(google_cloud_scheduler_job.escalations) == 0
    error_message = "En fase 1 no se crean servicios, jobs ni scheduler."
  }
}

run "conexiones_postgres" {
  command = plan

  variables {
    sql_max_connections = 100
  }

  expect_failures = [check.postgres_connections]
}
