# G3 · staging. Ver docs/ops/DEPLOY.md para el primer despliegue.
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
    prefix = "g3/staging"
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
  env              = "staging"
  short_env        = "stg"
  api_domain       = var.api_domain
  admin_domain     = var.admin_domain
  dns_managed_zone = var.dns_managed_zone

  deploy_workloads = var.deploy_workloads
  image_tag        = var.image_tag

  # Staging: zonal, sin réplica de Redis y escala a cero (más barato). Misma
  # topología que producción para que las pruebas de despliegue sean válidas.
  sql_tier                   = "db-custom-1-3840"
  sql_high_availability      = false
  sql_max_connections        = 200
  sql_backup_retention_count = 7
  sql_pitr_days              = 3
  sql_disk_size_gb           = 20
  redis_tier                 = "BASIC"
  redis_memory_gb            = 1
  db_pool_max                = 4
  deletion_protection        = false

  services = {
    gateway      = { max_instances = 4 }
    auth         = { max_instances = 3 }
    alerts       = { min_instances = 1, max_instances = 3 }
    fleet        = { max_instances = 4 }
    trips        = { max_instances = 3 }
    integrations = { max_instances = 3 }
    billing      = { max_instances = 2 }
    drivers      = { max_instances = 2 }
    ai           = { max_instances = 2, memory = "1Gi" }
  }

  # La primera semana: WAF en preview para afinar falsos positivos.
  waf_preview = var.waf_preview

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
  deploy_branch_regex     = "^main$"
  require_deploy_approval = false
}
