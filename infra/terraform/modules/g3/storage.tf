# Buckets: evidencias (trips), panel estático (admin) y logs de acceso.
# Todos con acceso uniforme, prevención de acceso público (salvo la excepción
# documentada del panel), etiquetas DSI y logs de acceso (Storage-05).

resource "google_storage_bucket" "access_logs" {
  project                     = var.project_id
  name                        = "${var.project_id}-g3-access-logs"
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  labels                      = local.labels
  force_destroy               = false

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type = "Delete"
    }
  }

  depends_on = [google_project_service.apis]
}

# Cloud Storage escribe los usage logs con este grupo de Google.
resource "google_storage_bucket_iam_member" "access_logs_writer" {
  bucket = google_storage_bucket.access_logs.name
  role   = "roles/storage.objectCreator"
  member = "group:cloud-storage-analytics@google.com"
}

# ── Evidencias de viaje (fotos, firmas, PODs) ───────────────────────────────
resource "google_storage_bucket" "evidence" {
  project                     = var.project_id
  name                        = "${var.project_id}-g3-evidence"
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  labels                      = local.labels
  force_destroy               = false

  versioning {
    enabled = true
  }

  soft_delete_policy {
    retention_duration_seconds = 604800 # 7 días
  }

  logging {
    log_bucket        = google_storage_bucket.access_logs.name
    log_object_prefix = "evidence/"
  }

  dynamic "encryption" {
    for_each = var.kms_key_name == null ? [] : [1]
    content {
      default_kms_key_name = var.kms_key_name
    }
  }

  # Subidas con URL firmada desde el navegador del panel.
  cors {
    origin          = ["https://${var.admin_domain}"]
    method          = ["GET", "HEAD", "PUT"]
    response_header = ["Content-Type", "Content-MD5", "x-goog-meta-*"]
    max_age_seconds = 3600
  }

  # Versiones anteriores: 30 días.
  lifecycle_rule {
    condition {
      days_since_noncurrent_time = 30
      with_state                 = "ARCHIVED"
    }
    action {
      type = "Delete"
    }
  }

  lifecycle_rule {
    condition {
      age        = 90
      with_state = "LIVE"
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age        = 365
      with_state = "LIVE"
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  dynamic "lifecycle_rule" {
    for_each = var.evidence_retention_days > 0 ? [1] : []
    content {
      condition {
        age        = var.evidence_retention_days
        with_state = "LIVE"
      }
      action {
        type = "Delete"
      }
    }
  }

  # Subidas que nunca se completaron.
  lifecycle_rule {
    condition {
      age = 7
    }
    action {
      type = "AbortIncompleteMultipartUpload"
    }
  }

  depends_on = [google_project_service.apis]
}

# Solo trips escribe/lee evidencias.
resource "google_storage_bucket_iam_member" "evidence_trips" {
  bucket = google_storage_bucket.evidence.name
  role   = "roles/storage.objectAdmin"
  member = google_service_account.svc["trips"].member
}

# ── Panel (Next.js export estático) ─────────────────────────────────────────
resource "google_storage_bucket" "admin" {
  project                     = var.project_id
  name                        = "${var.project_id}-g3-admin"
  location                    = var.region
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = var.admin_bucket_public ? "inherited" : "enforced"
  labels                      = local.labels
  force_destroy               = false

  website {
    main_page_suffix = "index.html"
    not_found_page   = "404.html"
  }

  versioning {
    enabled = true
  }

  logging {
    log_bucket        = google_storage_bucket.access_logs.name
    log_object_prefix = "admin/"
  }

  lifecycle_rule {
    condition {
      days_since_noncurrent_time = 30
      with_state                 = "ARCHIVED"
    }
    action {
      type = "Delete"
    }
  }

  depends_on = [google_project_service.apis]
}
