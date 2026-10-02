# Un servicio Cloud Run v2 de G3.
#
# Terraform es dueño de la CONFIGURACIÓN (cuenta de servicio, red, escalado,
# probes, variables y secretos). La IMAGEN la cambia el pipeline
# (`gcloud run deploy --image …`), por eso se ignora aquí después de crear el
# servicio: un `terraform apply` nunca regresa a una imagen vieja.

terraform {
  required_version = ">= 1.6"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.0, < 7.0"
    }
  }
}

resource "google_cloud_run_v2_service" "this" {
  project             = var.project_id
  name                = var.name
  location            = var.region
  ingress             = var.ingress
  labels              = var.labels
  deletion_protection = var.deletion_protection
  description         = var.description

  template {
    service_account                  = var.service_account_email
    execution_environment            = "EXECUTION_ENVIRONMENT_GEN2"
    timeout                          = "${var.request_timeout_seconds}s"
    max_instance_request_concurrency = var.concurrency
    labels                           = var.labels

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    vpc_access {
      egress = var.vpc_egress
      network_interfaces {
        network    = var.network
        subnetwork = var.subnetwork
      }
    }

    dynamic "volumes" {
      for_each = var.secret_files
      content {
        name = volumes.key
        secret {
          secret       = volumes.value.secret_id
          default_mode = 292 # 0444
          items {
            version = "latest"
            path    = volumes.value.file_name
          }
        }
      }
    }

    containers {
      name  = "app"
      image = var.image

      ports {
        name           = "http1"
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
        cpu_idle          = var.cpu_idle
        startup_cpu_boost = true
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

      dynamic "volume_mounts" {
        for_each = var.secret_files
        content {
          name       = volume_mounts.key
          mount_path = volume_mounts.value.mount_path
        }
      }

      # Arranque: no recibe tráfico hasta que /ready (DB + Redis) responde 200.
      startup_probe {
        initial_delay_seconds = 0
        period_seconds        = 5
        timeout_seconds       = 3
        failure_threshold     = var.startup_failure_threshold
        http_get {
          path = var.startup_probe_path
          port = 8080
        }
      }

      # Vida: /health solo verifica que el proceso responde (no depende de DB).
      liveness_probe {
        initial_delay_seconds = 0
        period_seconds        = 30
        timeout_seconds       = 3
        failure_threshold     = 3
        http_get {
          path = var.liveness_probe_path
          port = 8080
        }
      }
    }
  }

  dynamic "binary_authorization" {
    for_each = var.binary_authorization ? [1] : []
    content {
      use_default = true
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      client,
      client_version,
      # el pipeline pone la etiqueta del commit desplegado
      template[0].labels["commit-sha"],
      template[0].annotations,
      # rollback con `gcloud run services update-traffic` no debe revertirse en el próximo apply
      traffic,
    ]
  }
}

# Invocadores (run.invoker) por miembro: claves estáticas (nombre del par).
resource "google_cloud_run_v2_service_iam_member" "invoker" {
  for_each = var.invokers
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.this.name
  role     = "roles/run.invoker"
  member   = each.value
}
