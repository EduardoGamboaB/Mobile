# Monitoreo de G3: uptime checks, alertas (SLO de docs/ops/SLO.md) y métricas
# basadas en logs. Cada política enlaza al runbook correspondiente.

terraform {
  required_version = ">= 1.6"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.0, < 7.0"
    }
  }
}

locals {
  channels = [for c in google_monitoring_notification_channel.email : c.id]
  runbook  = var.runbook_url
  sql_id   = "${var.project_id}:${var.sql_instance_name}"
  # Redis: resource.label.instance_id = projects/<p>/locations/<r>/instances/<n>
  redis_id = var.redis_instance_id
}

resource "google_monitoring_notification_channel" "email" {
  for_each     = toset(var.notification_emails)
  project      = var.project_id
  display_name = "G3 ${var.env} · ${each.value}"
  type         = "email"
  labels = {
    email_address = each.value
  }
}

# ── Uptime checks (desde varias regiones, a través del LB) ──────────────────
resource "google_monitoring_uptime_check_config" "api" {
  project      = var.project_id
  display_name = "G3 ${var.env} · API /health"
  timeout      = "10s"
  period       = "60s"

  http_check {
    path           = "/health"
    port           = 443
    use_ssl        = true
    validate_ssl   = true
    request_method = "GET"
    accepted_response_status_codes {
      status_class = "STATUS_CLASS_2XX"
    }
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = var.api_domain
    }
  }
}

resource "google_monitoring_uptime_check_config" "admin" {
  project      = var.project_id
  display_name = "G3 ${var.env} · Admin"
  timeout      = "10s"
  period       = "300s"

  http_check {
    path         = "/"
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = var.admin_domain
    }
  }
}

resource "google_monitoring_alert_policy" "uptime" {
  project      = var.project_id
  display_name = "G3 ${var.env} · Uptime falla (API o Admin)"
  combiner     = "OR"
  severity     = "CRITICAL"

  dynamic "conditions" {
    for_each = {
      api   = google_monitoring_uptime_check_config.api.uptime_check_id
      admin = google_monitoring_uptime_check_config.admin.uptime_check_id
    }
    content {
      display_name = "Uptime ${conditions.key}"
      condition_threshold {
        filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\" AND metric.label.check_id=\"${conditions.value}\""
        comparison      = "COMPARISON_GT"
        threshold_value = 1
        duration        = "180s"
        aggregations {
          alignment_period     = "300s"
          per_series_aligner   = "ALIGN_NEXT_OLDER"
          cross_series_reducer = "REDUCE_COUNT_FALSE"
          group_by_fields      = ["resource.label.*"]
        }
        trigger {
          count = 1
        }
      }
    }
  }

  notification_channels = local.channels
  documentation {
    content   = "El API o el panel no responden desde ≥ 2 regiones. Runbook: ${local.runbook}#api-caida"
    mime_type = "text/markdown"
  }
}

# ── Cloud Run: tasa de 5xx y latencia p95 por servicio (PromQL) ─────────────
resource "google_monitoring_alert_policy" "run_5xx" {
  project      = var.project_id
  display_name = "G3 ${var.env} · Cloud Run 5xx > ${var.error_ratio_threshold * 100}%"
  combiner     = "OR"
  severity     = "ERROR"

  conditions {
    display_name = "Proporción de 5xx por servicio"
    condition_prometheus_query_language {
      query               = <<-EOT
        (
          sum by (service_name) (rate(run_googleapis_com:request_count{monitored_resource="cloud_run_revision",response_code_class="5xx"}[5m]))
          /
          sum by (service_name) (rate(run_googleapis_com:request_count{monitored_resource="cloud_run_revision"}[5m]))
        ) > ${var.error_ratio_threshold}
      EOT
      duration            = "300s"
      evaluation_interval = "60s"
    }
  }

  notification_channels = local.channels
  documentation {
    content   = "Más de ${var.error_ratio_threshold * 100}% de respuestas 5xx en 5 min. Runbook: ${local.runbook}#errores-5xx"
    mime_type = "text/markdown"
  }
}

resource "google_monitoring_alert_policy" "run_latency" {
  project      = var.project_id
  display_name = "G3 ${var.env} · Latencia p95 > ${var.latency_p95_ms} ms"
  combiner     = "OR"
  severity     = "WARNING"

  conditions {
    display_name = "p95 por servicio"
    condition_prometheus_query_language {
      query               = <<-EOT
        histogram_quantile(0.95,
          sum by (service_name, le) (rate(run_googleapis_com:request_latencies_bucket{monitored_resource="cloud_run_revision"}[5m]))
        ) > ${var.latency_p95_ms}
      EOT
      duration            = "600s"
      evaluation_interval = "60s"
    }
  }

  notification_channels = local.channels
  documentation {
    content   = "Latencia p95 sostenida por 10 min. Runbook: ${local.runbook}#latencia"
    mime_type = "text/markdown"
  }
}

resource "google_monitoring_alert_policy" "run_instances" {
  project      = var.project_id
  display_name = "G3 ${var.env} · Cloud Run cerca del máximo de instancias"
  combiner     = "OR"
  severity     = "WARNING"

  conditions {
    display_name = "Instancias activas ≥ ${var.instance_saturation_threshold}"
    condition_threshold {
      filter          = "metric.type=\"run.googleapis.com/container/instance_count\" AND resource.type=\"cloud_run_revision\" AND metric.label.state=\"active\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.instance_saturation_threshold
      duration        = "600s"
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_MAX"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.service_name"]
      }
    }
  }

  notification_channels = local.channels
  documentation {
    content   = "Un servicio se acerca a su max_instances (capacidad y conexiones a Postgres). Runbook: ${local.runbook}#escalado"
    mime_type = "text/markdown"
  }
}

# ── Cloud SQL ───────────────────────────────────────────────────────────────
resource "google_monitoring_alert_policy" "sql" {
  project      = var.project_id
  display_name = "G3 ${var.env} · Cloud SQL (CPU, memoria, disco, conexiones)"
  combiner     = "OR"
  severity     = "ERROR"

  dynamic "conditions" {
    for_each = {
      "CPU > ${var.sql_cpu_threshold * 100}%"         = { metric = "cloudsql.googleapis.com/database/cpu/utilization", threshold = var.sql_cpu_threshold, aligner = "ALIGN_MEAN" }
      "Memoria > ${var.sql_memory_threshold * 100}%"  = { metric = "cloudsql.googleapis.com/database/memory/utilization", threshold = var.sql_memory_threshold, aligner = "ALIGN_MEAN" }
      "Disco > 85%"                                   = { metric = "cloudsql.googleapis.com/database/disk/utilization", threshold = 0.85, aligner = "ALIGN_MAX" }
      "Conexiones > ${var.sql_connections_threshold}" = { metric = "cloudsql.googleapis.com/database/postgresql/num_backends", threshold = var.sql_connections_threshold, aligner = "ALIGN_MAX" }
    }
    content {
      display_name = conditions.key
      condition_threshold {
        filter          = "metric.type=\"${conditions.value.metric}\" AND resource.type=\"cloudsql_database\" AND resource.label.database_id=\"${local.sql_id}\""
        comparison      = "COMPARISON_GT"
        threshold_value = conditions.value.threshold
        duration        = "600s"
        aggregations {
          alignment_period     = "60s"
          per_series_aligner   = conditions.value.aligner
          cross_series_reducer = "REDUCE_SUM"
          group_by_fields      = ["resource.label.database_id"]
        }
      }
    }
  }

  notification_channels = local.channels
  documentation {
    content   = "Cloud SQL saturándose. Runbook: ${local.runbook}#cloud-sql"
    mime_type = "text/markdown"
  }
}

resource "google_monitoring_alert_policy" "sql_down" {
  project      = var.project_id
  display_name = "G3 ${var.env} · Cloud SQL no disponible"
  combiner     = "OR"
  severity     = "CRITICAL"

  conditions {
    display_name = "database/up == 0"
    condition_threshold {
      filter          = "metric.type=\"cloudsql.googleapis.com/database/up\" AND resource.type=\"cloudsql_database\" AND resource.label.database_id=\"${local.sql_id}\""
      comparison      = "COMPARISON_LT"
      threshold_value = 1
      duration        = "120s"
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MIN"
      }
    }
  }

  notification_channels = local.channels
  documentation {
    content   = "La base no responde. Runbook: ${local.runbook}#cloud-sql"
    mime_type = "text/markdown"
  }
}

# ── Memorystore ─────────────────────────────────────────────────────────────
resource "google_monitoring_alert_policy" "redis_memory" {
  project      = var.project_id
  display_name = "G3 ${var.env} · Redis memoria > ${var.redis_memory_threshold * 100}%"
  combiner     = "OR"
  severity     = "WARNING"

  conditions {
    display_name = "usage_ratio"
    condition_threshold {
      filter          = "metric.type=\"redis.googleapis.com/stats/memory/usage_ratio\" AND resource.type=\"redis_instance\" AND resource.label.instance_id=\"${local.redis_id}\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.redis_memory_threshold
      duration        = "600s"
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MAX"
      }
    }
  }

  notification_channels = local.channels
  documentation {
    content   = "Redis se llena (llaves sin TTL o tráfico anómalo). Runbook: ${local.runbook}#redis"
    mime_type = "text/markdown"
  }
}

# ── Métricas basadas en logs ────────────────────────────────────────────────
resource "google_logging_metric" "app_errors" {
  project     = var.project_id
  name        = "g3/app_errors"
  description = "Logs severity>=ERROR de los servicios Cloud Run (logger JSON de @g3/platform)."
  filter      = "resource.type=\"cloud_run_revision\" AND severity>=ERROR"
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
    labels {
      key        = "service"
      value_type = "STRING"
    }
  }
  label_extractors = {
    "service" = "EXTRACT(resource.labels.service_name)"
  }
}

resource "google_logging_metric" "migration_errors" {
  project     = var.project_id
  name        = "g3/migration_errors"
  description = "Errores de los jobs de migración y bootstrap de la base."
  filter      = "resource.type=\"cloud_run_job\" AND (resource.labels.job_name:\"migrate-\" OR resource.labels.job_name=\"g3-db-bootstrap\" OR resource.labels.job_name=\"g3-fleet-maintenance\") AND severity>=ERROR"
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
    labels {
      key        = "job"
      value_type = "STRING"
    }
  }
  label_extractors = {
    "job" = "EXTRACT(resource.labels.job_name)"
  }
}

resource "google_logging_metric" "armor_denied" {
  project     = var.project_id
  name        = "g3/armor_denied"
  description = "Peticiones bloqueadas por Cloud Armor (WAF, rate limit, geo)."
  filter      = "resource.type=\"http_load_balancer\" AND jsonPayload.enforcedSecurityPolicy.outcome=\"DENY\""
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
    labels {
      key        = "rule_priority"
      value_type = "STRING"
    }
  }
  label_extractors = {
    "rule_priority" = "EXTRACT(jsonPayload.enforcedSecurityPolicy.priority)"
  }
}

resource "google_logging_metric" "scheduler_errors" {
  project     = var.project_id
  name        = "g3/scheduler_errors"
  description = "Fallos de Cloud Scheduler (escalamiento de incidentes)."
  filter      = "resource.type=\"cloud_scheduler_job\" AND severity>=ERROR"
  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
    unit        = "1"
  }
}

resource "google_monitoring_alert_policy" "migrations" {
  project      = var.project_id
  display_name = "G3 ${var.env} · Falló una migración / bootstrap de la base"
  combiner     = "OR"
  severity     = "CRITICAL"

  conditions {
    display_name = "Ejecución de job fallida"
    condition_threshold {
      filter          = "metric.type=\"run.googleapis.com/job/completed_execution_count\" AND resource.type=\"cloud_run_job\" AND metric.label.result=\"failed\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "0s"
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_SUM"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.job_name"]
      }
    }
  }

  conditions {
    display_name = "Errores en logs de migración"
    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.migration_errors.name}\" AND resource.type=\"cloud_run_job\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "0s"
      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_SUM"
        cross_series_reducer = "REDUCE_SUM"
      }
    }
  }

  notification_channels = local.channels
  documentation {
    content   = "Un job migrate-<svc> o g3-db-bootstrap falló: el pipeline NO desplegó ese servicio. Runbook: ${local.runbook}#migraciones"
    mime_type = "text/markdown"
  }
}

resource "google_monitoring_alert_policy" "app_errors" {
  project      = var.project_id
  display_name = "G3 ${var.env} · Errores de aplicación elevados"
  combiner     = "OR"
  severity     = "WARNING"

  conditions {
    display_name = "> ${var.app_errors_per_5m} errores en 5 min por servicio"
    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.app_errors.name}\" AND resource.type=\"cloud_run_revision\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.app_errors_per_5m
      duration        = "0s"
      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_SUM"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["metric.label.service"]
      }
    }
  }

  notification_channels = local.channels
  documentation {
    content   = "Revisa Cloud Logging del servicio. Runbook: ${local.runbook}#errores-5xx"
    mime_type = "text/markdown"
  }
}

resource "google_monitoring_alert_policy" "escalations" {
  project      = var.project_id
  display_name = "G3 ${var.env} · Escalamiento de incidentes falla"
  combiner     = "OR"
  severity     = "CRITICAL"

  conditions {
    display_name = "Cloud Scheduler con errores ≥ 3 en 5 min"
    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.scheduler_errors.name}\" AND resource.type=\"cloud_scheduler_job\""
      comparison      = "COMPARISON_GT"
      threshold_value = 2
      duration        = "0s"
      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_SUM"
        cross_series_reducer = "REDUCE_SUM"
      }
    }
  }

  notification_channels = local.channels
  documentation {
    content   = "Los incidentes SOS/críticos no se están escalando. Runbook: ${local.runbook}#escalamiento-de-incidentes"
    mime_type = "text/markdown"
  }
}

resource "google_monitoring_alert_policy" "armor" {
  project      = var.project_id
  display_name = "G3 ${var.env} · Pico de bloqueos de Cloud Armor"
  combiner     = "OR"
  severity     = "WARNING"

  conditions {
    display_name = "> ${var.armor_denied_per_5m} bloqueos en 5 min"
    condition_threshold {
      filter          = "metric.type=\"logging.googleapis.com/user/${google_logging_metric.armor_denied.name}\" AND resource.type=\"http_load_balancer\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.armor_denied_per_5m
      duration        = "0s"
      aggregations {
        alignment_period     = "300s"
        per_series_aligner   = "ALIGN_SUM"
        cross_series_reducer = "REDUCE_SUM"
      }
    }
  }

  notification_channels = local.channels
  documentation {
    content   = "Posible ataque o falso positivo del WAF. Runbook: ${local.runbook}#cloud-armor"
    mime_type = "text/markdown"
  }
}
