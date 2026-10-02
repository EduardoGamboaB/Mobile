# G3 · producción. Ver docs/ops/DEPLOY.md para el primer despliegue.
#
#   cd infra/terraform/envs/production
#   cp terraform.tfvars.example terraform.tfvars   # y ajusta (no lleva secretos)
#   terraform init -backend-config="bucket=<proyecto>-tfstate"
#   terraform plan -out plan.tfplan && terraform apply plan.tfplan

terraform {
  required_version = ">= 1.6"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # El bucket se pasa con -backend-config (lo crea infra/terraform/bootstrap).
  backend "gcs" {
    prefix = "g3/production"
  }
}

provider "google" {
  project               = var.project_id
  region                = var.region
  billing_project       = var.project_id
  user_project_override = true
}

provider "google-beta" {
  project               = var.project_id
  region                = var.region
  billing_project       = var.project_id
  user_project_override = true
}

module "g3" {
  source = "../../modules/g3"

  project_id       = var.project_id
  region           = var.region
  env              = "production"
  short_env        = "prd"
  api_domain       = var.api_domain
  admin_domain     = var.admin_domain
  dns_managed_zone = var.dns_managed_zone

  deploy_workloads = var.deploy_workloads
  image_tag        = var.image_tag

  # Alta disponibilidad: Cloud SQL regional, Redis con réplica, instancias mínimas.
  sql_tier                   = "db-custom-2-8192"
  sql_high_availability      = true
  sql_max_connections        = 500
  sql_backup_retention_count = 30
  sql_pitr_days              = 7
  sql_disk_size_gb           = 50
  redis_tier                 = "STANDARD_HA"
  redis_memory_gb            = 1
  db_pool_max                = 5
  deletion_protection        = true

  services = {
    gateway = { min_instances = 2, max_instances = 20, memory = "512Mi", concurrency = 80 }
    auth    = { min_instances = 1, max_instances = 10 }
    alerts  = { min_instances = 1, max_instances = 10 }
    # fleet manda señales a alerts después de responder: CPU siempre asignada.
    fleet        = { min_instances = 1, max_instances = 20, concurrency = 100, cpu_idle = false }
    trips        = { min_instances = 1, max_instances = 10 }
    integrations = { min_instances = 1, max_instances = 6 }
    billing      = { max_instances = 6 }
    drivers      = { max_instances = 6 }
    ai           = { max_instances = 4, memory = "1Gi" }
  }

  platform_company_id   = var.platform_company_id
  extra_env             = var.extra_env
  extra_secret_env      = var.extra_secret_env
  extra_secret_access   = var.extra_secret_access
  api_allowed_regions   = var.api_allowed_regions
  admin_allowed_regions = var.admin_allowed_regions

  alert_emails    = var.alert_emails
  runbook_url     = var.runbook_url
  billing_account = var.billing_account
  budget_amount   = var.budget_amount
  budget_currency = var.budget_currency

  cloudbuild_repository   = var.cloudbuild_repository
  deploy_tag_regex        = "^v[0-9]+\\.[0-9]+\\.[0-9]+$"
  require_deploy_approval = true
}
