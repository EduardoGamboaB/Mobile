module "edge" {
  source = "../edge"

  project_id                   = var.project_id
  region                       = var.region
  name_prefix                  = local.name_prefix
  api_domain                   = var.api_domain
  admin_domain                 = var.admin_domain
  gateway_service_name         = "g3-gateway"
  admin_bucket_name            = google_storage_bucket.admin.name
  admin_bucket_public          = var.admin_bucket_public
  dns_managed_zone             = var.dns_managed_zone
  auth_rate_limit_per_minute   = var.auth_rate_limit_per_minute
  ingest_rate_limit_per_minute = var.ingest_rate_limit_per_minute
  waf_preview                  = var.waf_preview
  stripe_webhook_enabled       = var.stripe_webhook_enabled
  api_allowed_regions          = var.api_allowed_regions
  admin_allowed_regions        = var.admin_allowed_regions

  depends_on = [google_project_service.apis]
}

module "monitoring" {
  source = "../monitoring"

  project_id                = var.project_id
  env                       = var.env
  notification_emails       = var.alert_emails
  api_domain                = var.api_domain
  admin_domain              = var.admin_domain
  sql_instance_name         = module.database.instance_name
  redis_instance_id         = module.redis.id
  runbook_url               = var.runbook_url
  sql_connections_threshold = floor(var.sql_max_connections * 0.8)

  depends_on = [google_project_service.apis]
}

# ── Presupuesto ─────────────────────────────────────────────────────────────
resource "google_billing_budget" "monthly" {
  count           = var.billing_account == null ? 0 : 1
  billing_account = var.billing_account
  display_name    = "G3 ${var.env} mensual"

  budget_filter {
    projects               = ["projects/${data.google_project.this.number}"]
    credit_types_treatment = "INCLUDE_ALL_CREDITS"
  }

  amount {
    specified_amount {
      currency_code = var.budget_currency
      units         = tostring(var.budget_amount)
    }
  }

  threshold_rules {
    threshold_percent = 0.5
  }
  threshold_rules {
    threshold_percent = 0.9
  }
  threshold_rules {
    threshold_percent = 1.0
  }
  threshold_rules {
    threshold_percent = 1.0
    spend_basis       = "FORECASTED_SPEND"
  }

  all_updates_rule {
    monitoring_notification_channels = module.monitoring.notification_channel_ids
    disable_default_iam_recipients   = false
  }
}
