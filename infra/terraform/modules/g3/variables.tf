# ── Identidad del ambiente ──────────────────────────────────────────────────
variable "project_id" {
  description = "Proyecto GCP del ambiente (uno por ambiente: g3-staging, g3-prod…)."
  type        = string
}

variable "region" {
  description = "Región principal (Cloud Run, Cloud SQL, Redis, Artifact Registry)."
  type        = string
  default     = "us-central1"
}

variable "env" {
  description = "Ambiente: staging | production. Se publica como G3_ENV (prefijo de llaves en Redis)."
  type        = string

  validation {
    condition     = contains(["staging", "production"], var.env)
    error_message = "env debe ser staging o production."
  }
}

variable "short_env" {
  description = "Abreviatura para nombres con límite de longitud (stg, prd)."
  type        = string
}

variable "api_domain" {
  description = "Dominio público del API (api.<dominio>)."
  type        = string
}

variable "admin_domain" {
  description = "Dominio público del panel (admin.<dominio>)."
  type        = string
}

variable "dns_managed_zone" {
  description = "Zona de Cloud DNS (en este proyecto) donde crear los A de api/admin. null = DNS externo."
  type        = string
  default     = null
}

# ── Despliegue en dos fases ─────────────────────────────────────────────────
variable "deploy_workloads" {
  description = <<-EOT
    false en el primer apply (fase 1: red, base, Redis, secretos vacíos, registro, IAM, LB).
    true cuando ya se cargaron los secretos y se subieron las imágenes (fase 2: Cloud Run,
    jobs, Cloud Scheduler). Ver docs/ops/DEPLOY.md.
  EOT
  type        = bool
  default     = false
}

variable "image_tag" {
  description = "Tag de imagen con el que se CREAN los servicios/jobs (después el pipeline cambia la imagen)."
  type        = string
  default     = "bootstrap"
}

# ── Tamaños ─────────────────────────────────────────────────────────────────
variable "services" {
  description = "Ajustes por servicio (sobrescriben los defaults): min/max instancias, cpu, memoria, concurrencia, cpu_idle."
  type = map(object({
    min_instances = optional(number)
    max_instances = optional(number)
    cpu           = optional(string)
    memory        = optional(string)
    concurrency   = optional(number)
    cpu_idle      = optional(bool)
  }))
  default = {}
}

variable "db_pool_max" {
  description = "DB_POOL_MAX por instancia (Σ max_instances × pool debe caber en max_connections)."
  type        = number
  default     = 5
}

variable "sql_tier" {
  description = "Tipo de máquina de Cloud SQL."
  type        = string
}

variable "sql_high_availability" {
  description = "Cloud SQL REGIONAL (HA)."
  type        = bool
}

variable "sql_max_connections" {
  description = "max_connections de Postgres."
  type        = number
}

variable "sql_backup_retention_count" {
  description = "Backups diarios conservados."
  type        = number
}

variable "sql_pitr_days" {
  description = "Días de PITR (1-7)."
  type        = number
  default     = 7
}

variable "sql_disk_size_gb" {
  description = "Disco inicial de Cloud SQL."
  type        = number
  default     = 20
}

variable "db_password_rotation_id" {
  description = "Cambiar para regenerar contraseñas de la base (RUNBOOK › Rotación)."
  type        = string
  default     = "1"
}

variable "redis_tier" {
  description = "BASIC | STANDARD_HA."
  type        = string
}

variable "redis_memory_gb" {
  description = "Memoria de Redis."
  type        = number
  default     = 1
}

variable "deletion_protection" {
  description = "Protección contra borrado de Cloud SQL y Cloud Run."
  type        = bool
  default     = true
}

# ── Red ─────────────────────────────────────────────────────────────────────
variable "run_subnet_cidr" {
  description = "Subred de Direct VPC egress."
  type        = string
  default     = "10.10.0.0/24"
}

variable "vpc_egress" {
  description = "Egress de Cloud Run: PRIVATE_RANGES_ONLY (default, control DSI Run-02) o ALL_TRAFFIC (+ Cloud NAT)."
  type        = string
  default     = "PRIVATE_RANGES_ONLY"
}

# ── Aplicación ──────────────────────────────────────────────────────────────
variable "platform_company_id" {
  description = "G3_PLATFORM_COMPANY_ID (compañía de G3 Tech). Vacío hasta registrarla."
  type        = string
  default     = ""
}

variable "mfa_issuer" {
  description = "Emisor que muestra la app autenticadora."
  type        = string
  default     = "G3 Admin"
}

variable "extra_env" {
  description = "Variables en claro adicionales por servicio: { auth = { BCRYPT_ROUNDS = \"12\" } }."
  type        = map(map(string))
  default     = {}
}

variable "extra_secret_env" {
  description = "Variables desde secretos ya existentes por servicio: { alerts = { WHATSAPP_ACCESS_TOKEN = \"g3-whatsapp-token\" } }. Se otorga secretAccessor."
  type        = map(map(string))
  default     = {}
}

variable "extra_secret_access" {
  description = "Secretos adicionales que un servicio lee en runtime por referencia (p. ej. client_secret de SSO): { auth = [\"g3-sso-google\"] }."
  type        = map(list(string))
  default     = {}
}

variable "migrate_services" {
  description = "Servicios con job migrate-<svc> (deben tener src/migrate.ts)."
  type        = list(string)
  default     = ["auth", "billing", "drivers", "fleet", "trips", "alerts", "integrations", "invoicing"]
}

variable "startup_probe_path" {
  description = "Ruta del startup probe (readiness: DB + Redis)."
  type        = string
  default     = "/ready"
}

variable "liveness_probe_path" {
  description = "Ruta del liveness probe."
  type        = string
  default     = "/health"
}

variable "binary_authorization" {
  description = "Exigir Binary Authorization en Cloud Run (control DSI Run-09; requiere política y attestors)."
  type        = bool
  default     = false
}

# ── Escalamiento de incidentes ──────────────────────────────────────────────
variable "escalation_schedule" {
  description = "Cron de Cloud Scheduler para POST /api/incidents/escalations/run."
  type        = string
  default     = "* * * * *"
}

variable "scheduler_time_zone" {
  description = "Zona horaria de Cloud Scheduler."
  type        = string
  default     = "America/Mexico_City"
}

# ── Storage ─────────────────────────────────────────────────────────────────
variable "evidence_retention_days" {
  description = "Días que se conservan las evidencias (SAT: 5 años para soporte de CFDI/Carta Porte). 0 = sin borrado."
  type        = number
  default     = 1825
}

variable "admin_bucket_public" {
  description = "Excepción: bucket del panel público si la lectura por la cuenta de Cloud CDN no funciona."
  type        = bool
  default     = false
}

variable "kms_key_name" {
  description = "Llave CMEK opcional para buckets (null = cifrado administrado por Google)."
  type        = string
  default     = null
}

# ── Borde (Cloud Armor) ─────────────────────────────────────────────────────
variable "auth_rate_limit_per_minute" {
  description = "Cloud Armor: peticiones/min por IP a /api/auth/*."
  type        = number
  default     = 60
}

variable "ingest_rate_limit_per_minute" {
  description = "Cloud Armor: peticiones/min por IP a /api/telemetry/ingest/*."
  type        = number
  default     = 6000
}

variable "waf_preview" {
  description = "Reglas WAF en modo preview (solo registran)."
  type        = bool
  default     = false
}

variable "api_allowed_regions" {
  description = "Países permitidos en el API (vacío = todos)."
  type        = list(string)
  default     = []
}

variable "admin_allowed_regions" {
  description = "Países permitidos en el panel (vacío = todos)."
  type        = list(string)
  default     = []
}

# ── Monitoreo y costos ──────────────────────────────────────────────────────
variable "alert_emails" {
  description = "Correos on-call para alertas."
  type        = list(string)
}

variable "runbook_url" {
  description = "URL del RUNBOOK en el repositorio."
  type        = string
  default     = "https://github.com/OWNER/REPO/blob/main/docs/ops/RUNBOOK.md"
}

variable "billing_account" {
  description = "Cuenta de facturación para el budget (XXXXXX-XXXXXX-XXXXXX). null = sin budget."
  type        = string
  default     = null
}

variable "budget_amount" {
  description = "Presupuesto mensual."
  type        = number
  default     = 500
}

variable "budget_currency" {
  description = "Moneda del presupuesto (debe coincidir con la de la cuenta de facturación)."
  type        = string
  default     = "USD"
}

# ── CI/CD ───────────────────────────────────────────────────────────────────
variable "cloudbuild_repository" {
  description = "Repositorio de Cloud Build 2nd gen (projects/…/locations/…/connections/…/repositories/…). null = sin trigger."
  type        = string
  default     = null
}

variable "deploy_branch_regex" {
  description = "Rama que despliega (staging). Ignorado si deploy_tag_regex está definido."
  type        = string
  default     = "^main$"
}

variable "deploy_tag_regex" {
  description = "Tag que despliega (producción, p. ej. ^v[0-9]+\\.[0-9]+\\.[0-9]+$). null = por rama."
  type        = string
  default     = null
}

variable "require_deploy_approval" {
  description = "El trigger de Cloud Build espera aprobación manual (producción)."
  type        = bool
  default     = false
}

# ── Seguridad ───────────────────────────────────────────────────────────────
variable "secret_rotation_period" {
  description = "Periodo de recordatorio de rotación de secretos de la app (Secret Manager publica en g3-secret-events)."
  type        = string
  default     = "7776000s" # 90 días
}

variable "secret_rotation_start" {
  description = "Primera fecha de recordatorio de rotación (RFC3339)."
  type        = string
  default     = "2027-01-04T15:00:00Z"
}

variable "label_area" {
  description = "Etiqueta `area` (control DSI Storage-03)."
  type        = string
  default     = "ti"
}

variable "label_ecosistema" {
  description = "Etiqueta `ecosistema` (control DSI Storage-03)."
  type        = string
  default     = "g3"
}

variable "extra_labels" {
  description = "Etiquetas adicionales."
  type        = map(string)
  default     = {}
}

variable "stripe_webhook_enabled" {
  description = "Abre /api/webhooks/stripe en el borde (pendiente: handler en billing)."
  type        = bool
  default     = false
}
