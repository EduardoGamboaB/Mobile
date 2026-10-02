# Cargas de trabajo (fase 2, deploy_workloads = true): servicios Cloud Run,
# jobs de migración, bootstrap de la base y Cloud Scheduler.

module "service" {
  source   = "../cloud-run-service"
  for_each = var.deploy_workloads ? toset(local.http_services) : toset([])

  project_id            = var.project_id
  region                = var.region
  name                  = "g3-${each.key}"
  description           = "G3 ${each.key}"
  image                 = "${local.registry}/${each.key}:${var.image_tag}"
  service_account_email = google_service_account.svc[each.key].email

  # gateway: solo a través del LB (Cloud Armor); el resto: solo tráfico interno.
  ingress = local.catalog[each.key].public ? "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER" : "INGRESS_TRAFFIC_INTERNAL_ONLY"

  # run.invoker: gateway público (detrás del LB); internos solo para quien los llama.
  invokers = local.catalog[each.key].public ? { public = "allUsers" } : merge(
    { for caller in local.callers[each.key] : caller => google_service_account.svc[caller].member },
    each.key == "alerts" ? { scheduler = google_service_account.scheduler.member } : {},
  )

  env        = local.env[each.key]
  secret_env = local.secret_env[each.key]
  secret_files = local.catalog[each.key].redis ? {
    redis-ca = { secret_id = module.redis.ca_secret_id, mount_path = local.redis_ca_dir, file_name = "ca.pem" }
  } : {}

  min_instances = local.sizing[each.key].min_instances
  max_instances = local.sizing[each.key].max_instances
  cpu           = local.sizing[each.key].cpu
  memory        = local.sizing[each.key].memory
  concurrency   = local.sizing[each.key].concurrency
  cpu_idle      = local.sizing[each.key].cpu_idle

  network              = module.network.network_id
  subnetwork           = module.network.run_subnet_id
  vpc_egress           = var.vpc_egress
  startup_probe_path   = var.startup_probe_path
  liveness_probe_path  = var.liveness_probe_path
  binary_authorization = var.binary_authorization
  deletion_protection  = var.deletion_protection
  labels               = merge(local.labels, { service = each.key })

  depends_on = [google_secret_manager_secret_iam_member.svc]
}

# ── Migraciones: migrate-<svc> (node dist/migrate.js con el rol g3_<svc>) ───
module "migrate_job" {
  source   = "../cloud-run-job"
  for_each = var.deploy_workloads ? toset(var.migrate_services) : toset([])

  project_id            = var.project_id
  region                = var.region
  name                  = "migrate-${each.key}"
  image                 = "${local.registry}/${each.key}:${var.image_tag}"
  command               = ["node"]
  args                  = ["dist/migrate.js"]
  service_account_email = google_service_account.svc[each.key].email
  env = {
    NODE_ENV    = "production"
    G3_ENV      = var.env
    DB_POOL_MAX = "2"
  }
  secret_env = {
    DATABASE_URL = module.database.url_secret_ids[each.key]
  }
  timeout_seconds = 900
  max_retries     = 1
  network         = module.network.network_id
  subnetwork      = module.network.run_subnet_id
  labels          = merge(local.labels, { service = each.key, job = "migrate" })

  depends_on = [google_secret_manager_secret_iam_member.svc]
}

# ── Bootstrap de la base: schemas, roles g3_<svc>, permisos ─────────────────
module "db_bootstrap_job" {
  source = "../cloud-run-job"
  count  = var.deploy_workloads ? 1 : 0

  project_id            = var.project_id
  region                = var.region
  name                  = "g3-db-bootstrap"
  image                 = "${local.registry}/db-bootstrap:${var.image_tag}"
  service_account_email = google_service_account.db_bootstrap.email
  env = {
    PGHOST     = module.database.private_ip
    PGPORT     = "5432"
    PGDATABASE = module.database.database_name
    PGUSER     = "postgres"
    PGSSLMODE  = "require"
  }
  secret_env = merge(
    { PGPASSWORD = module.database.admin_password_secret_id },
    { for s, id in module.database.password_secret_ids : "G3_PW_${upper(s)}" => id },
  )
  timeout_seconds = 300
  max_retries     = 0
  network         = module.network.network_id
  subnetwork      = module.network.run_subnet_id
  labels          = merge(local.labels, { job = "db-bootstrap" })

  depends_on = [google_secret_manager_secret_iam_member.db_bootstrap]
}

# ── Cloud Scheduler: escalamiento de incidentes cada minuto ─────────────────
# OIDC (run.invoker de g3-scheduler sobre alerts) + x-internal-token. El
# valor del token se lee de Secret Manager al aplicar (queda en el state,
# igual que las contraseñas generadas: el bucket del state es privado).
data "google_secret_manager_secret_version" "internal_token" {
  count   = var.deploy_workloads ? 1 : 0
  project = var.project_id
  secret  = google_secret_manager_secret.app["internal_token"].secret_id
}

resource "google_cloud_scheduler_job" "escalations" {
  count            = var.deploy_workloads ? 1 : 0
  project          = var.project_id
  region           = var.region
  name             = "g3-incident-escalations"
  description      = "POST /api/incidents/escalations/run en alerts (SLA de incidentes)"
  schedule         = var.escalation_schedule
  time_zone        = var.scheduler_time_zone
  attempt_deadline = "30s"

  retry_config {
    retry_count = 0 # la siguiente ejecución es en un minuto
  }

  http_target {
    http_method = "POST"
    uri         = "${local.run_url["alerts"]}/api/incidents/escalations/run"
    body        = base64encode("{}")
    headers = {
      "Content-Type"     = "application/json"
      "x-internal-token" = data.google_secret_manager_secret_version.internal_token[0].secret_data
    }
    oidc_token {
      service_account_email = google_service_account.scheduler.email
      audience              = local.run_url["alerts"]
    }
  }

  depends_on = [module.service]
}
