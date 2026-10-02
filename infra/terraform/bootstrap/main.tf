# Bootstrap por proyecto (se corre UNA vez, con state local, por una persona
# con Owner del proyecto). Crea:
#   · el bucket GCS del state de Terraform (privado, versionado);
#   · Workload Identity Federation para GitHub Actions (sin llaves JSON);
#   · g3-tf-plan: cuenta que usa el workflow terraform.yml para `plan` en PRs.
#   · g3-tf-apply: cuenta para `apply` (solo desde la rama principal/ambiente
#     protegido de GitHub).
#
#   cd infra/terraform/bootstrap
#   terraform init
#   terraform apply -var project_id=g3-staging -var github_repository=OWNER/REPO
#
# Después: guarda los outputs como *variables* (no secretos) del repo en
# GitHub: GCP_WIF_PROVIDER_<ENV>, GCP_TF_PLAN_SA_<ENV>, GCP_TF_STATE_BUCKET_<ENV>.
# El state local de este bootstrap no contiene secretos; guárdalo en el
# mismo bucket con `terraform init -migrate-state` si se desea.

terraform {
  required_version = ">= 1.6"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

locals {
  apis = [
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
    "storage.googleapis.com",
    "serviceusage.googleapis.com",
  ]
}

resource "google_project_service" "apis" {
  for_each           = toset(local.apis)
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_storage_bucket" "tfstate" {
  project                     = var.project_id
  name                        = "${var.project_id}-tfstate"
  location                    = var.state_location
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false
  labels                      = { app = "g3", area = "ti", ecosistema = "g3", "managed-by" = "terraform" }

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      num_newer_versions = 50
      with_state         = "ARCHIVED"
    }
    action {
      type = "Delete"
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

# ── Workload Identity Federation (GitHub OIDC) ──────────────────────────────
resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "github"
  display_name              = "GitHub Actions"
  depends_on                = [google_project_service.apis]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-oidc"
  display_name                       = "GitHub OIDC"

  attribute_mapping = {
    "google.subject"             = "assertion.sub"
    "attribute.repository"       = "assertion.repository"
    "attribute.ref"              = "assertion.ref"
    "attribute.environment"      = "assertion.environment"
    "attribute.repository_owner" = "assertion.repository_owner"
  }

  # Solo tokens de ESTE repositorio.
  attribute_condition = "assertion.repository == '${var.github_repository}'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Plan (PRs): solo lectura del proyecto + lectura/escritura del lock del state.
resource "google_service_account" "tf_plan" {
  project      = var.project_id
  account_id   = "g3-tf-plan"
  display_name = "Terraform plan (GitHub Actions)"
}

resource "google_project_iam_member" "tf_plan" {
  for_each = toset([
    "roles/viewer",
    "roles/iam.securityReviewer",
    "roles/secretmanager.viewer",
  ])
  project = var.project_id
  role    = each.value
  member  = google_service_account.tf_plan.member
}

# El plan refresca el state (que contiene contraseñas generadas): la cuenta
# lee el bucket del state. Por eso el WIF se restringe a este repo y GitHub
# no entrega tokens OIDC a PRs desde forks.
resource "google_storage_bucket_iam_member" "tf_plan_state" {
  bucket = google_storage_bucket.tfstate.name
  role   = "roles/storage.objectAdmin" # lock del state (.tflock)
  member = google_service_account.tf_plan.member
}

resource "google_service_account_iam_member" "tf_plan_wif" {
  service_account_id = google_service_account.tf_plan.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}"
}

# Apply: solo desde el ambiente protegido de GitHub (revisores obligatorios).
resource "google_service_account" "tf_apply" {
  project      = var.project_id
  account_id   = "g3-tf-apply"
  display_name = "Terraform apply (GitHub Actions, ambiente protegido)"
}

resource "google_project_iam_member" "tf_apply" {
  for_each = toset(var.apply_roles)
  project  = var.project_id
  role     = each.value
  member   = google_service_account.tf_apply.member
}

resource "google_storage_bucket_iam_member" "tf_apply_state" {
  bucket = google_storage_bucket.tfstate.name
  role   = "roles/storage.objectAdmin"
  member = google_service_account.tf_apply.member
}

resource "google_service_account_iam_member" "tf_apply_wif" {
  service_account_id = google_service_account.tf_apply.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.environment/${var.github_environment}"
}
