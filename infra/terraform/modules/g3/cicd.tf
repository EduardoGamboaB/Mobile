# Despliegue continuo: Cloud Build (backend/infra/ci/cloudbuild.yaml) corre
# con la cuenta g3-deployer, que puede subir imágenes, actualizar servicios y
# jobs (actAs sobre las cuentas de runtime) y publicar el panel. No puede
# leer secretos ni administrar IAM.

resource "google_service_account" "deployer" {
  project      = var.project_id
  account_id   = "g3-deployer"
  display_name = "G3 deployer (Cloud Build)"
  description  = "Build, push, migraciones y deploy de Cloud Run; publica el panel."
}

resource "google_project_iam_member" "deployer" {
  for_each = toset([
    "roles/run.developer",     # deploy de servicios, update/execute de jobs
    "roles/logging.logWriter", # logs de Cloud Build
  ])
  project = var.project_id
  role    = each.value
  member  = google_service_account.deployer.member
}

resource "google_artifact_registry_repository_iam_member" "deployer" {
  project    = var.project_id
  location   = var.region
  repository = google_artifact_registry_repository.g3.name
  role       = "roles/artifactregistry.writer"
  member     = google_service_account.deployer.member
}

# actAs: desplegar una revisión que corre como g3-<svc> / g3-db-bootstrap.
resource "google_service_account_iam_member" "deployer_act_as" {
  for_each = merge(
    { for s in keys(local.catalog) : s => google_service_account.svc[s].name },
    { for s in local.db_services : "mig-${s}" => google_service_account.migrator[s].name },
    { "db-bootstrap" = google_service_account.db_bootstrap.name },
  )
  service_account_id = each.value
  role               = "roles/iam.serviceAccountUser"
  member             = google_service_account.deployer.member
}

# Publicar el panel: escribir el bucket e invalidar Cloud CDN / headers del backend bucket.
resource "google_storage_bucket_iam_member" "deployer_admin_bucket" {
  bucket = google_storage_bucket.admin.name
  role   = "roles/storage.objectAdmin"
  member = google_service_account.deployer.member
}

resource "google_project_iam_custom_role" "admin_publisher" {
  project     = var.project_id
  role_id     = "g3AdminPublisher_${var.short_env}"
  title       = "G3 publicar panel (CDN)"
  description = "Invalidar Cloud CDN y actualizar headers del backend bucket del panel."
  permissions = [
    "compute.backendBuckets.get",
    "compute.backendBuckets.update",
    "compute.globalOperations.get",
    "compute.urlMaps.get",
    "compute.urlMaps.invalidateCache",
  ]
}

resource "google_project_iam_member" "deployer_admin_publisher" {
  project = var.project_id
  role    = google_project_iam_custom_role.admin_publisher.id
  member  = google_service_account.deployer.member
}

# Trigger opcional (requiere conectar el repo de GitHub a Cloud Build 2nd gen: acción humana).
resource "google_cloudbuild_trigger" "deploy" {
  count           = var.cloudbuild_repository == null ? 0 : 1
  project         = var.project_id
  location        = var.region
  name            = "g3-backend-deploy-${var.short_env}"
  description     = "Build, migraciones y deploy de G3 a ${var.env}"
  filename        = "backend/infra/ci/cloudbuild.yaml"
  service_account = google_service_account.deployer.id
  included_files  = ["backend/**"]

  repository_event_config {
    repository = var.cloudbuild_repository
    push {
      branch = var.deploy_tag_regex == null ? var.deploy_branch_regex : null
      tag    = var.deploy_tag_regex
    }
  }

  substitutions = {
    _ENV        = var.env
    _REGION     = var.region
    _API_DOMAIN = var.api_domain
  }

  approval_config {
    approval_required = var.require_deploy_approval
  }
}
