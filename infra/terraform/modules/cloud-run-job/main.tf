# Cloud Run Job de G3 (migraciones `migrate-<svc>` y `g3-db-bootstrap`).
# Igual que en los servicios, la imagen la actualiza el pipeline
# (`gcloud run jobs update --image`) antes de ejecutarlo.

terraform {
  required_version = ">= 1.6"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.0, < 7.0"
    }
  }
}

resource "google_cloud_run_v2_job" "this" {
  project             = var.project_id
  name                = var.name
  location            = var.region
  labels              = var.labels
  deletion_protection = var.deletion_protection

  template {
    task_count  = 1
    parallelism = 1
    labels      = var.labels

    template {
      service_account       = var.service_account_email
      execution_environment = "EXECUTION_ENVIRONMENT_GEN2"
      timeout               = "${var.timeout_seconds}s"
      max_retries           = var.max_retries

      vpc_access {
        egress = "PRIVATE_RANGES_ONLY"
        network_interfaces {
          network    = var.network
          subnetwork = var.subnetwork
        }
      }

      containers {
        name    = "job"
        image   = var.image
        command = var.command
        args    = var.args

        resources {
          limits = {
            cpu    = var.cpu
            memory = var.memory
          }
        }

        dynamic "env" {
          for_each = var.env
          content {
            name  = env.key
            value = env.value
          }
        }

        dynamic "env" {
          for_each = var.secret_env
          content {
            name = env.key
            value_source {
              secret_key_ref {
                secret  = env.value
                version = "latest"
              }
            }
          }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].template[0].containers[0].image,
      client,
      client_version,
      template[0].labels["commit-sha"],
      template[0].annotations,
    ]
  }
}
