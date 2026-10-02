variable "project_id" {
  description = "Proyecto GCP."
  type        = string
}

variable "region" {
  description = "Región de la instancia."
  type        = string
}

variable "instance_name" {
  description = "Nombre de la instancia Cloud SQL (no se puede reutilizar hasta una semana después de borrarla)."
  type        = string
}

variable "database_name" {
  description = "Base de datos de la aplicación."
  type        = string
  default     = "g3"
}

variable "network_id" {
  description = "VPC con Private Service Access ya conectado."
  type        = string
}

variable "tier" {
  description = "Tipo de máquina (p. ej. db-custom-2-8192)."
  type        = string
}

variable "high_availability" {
  description = "true = REGIONAL (failover automático entre zonas)."
  type        = bool
}

variable "disk_size_gb" {
  description = "Disco inicial (crece solo)."
  type        = number
  default     = 20
}

variable "disk_autoresize_limit_gb" {
  description = "Tope de crecimiento automático del disco (0 = sin tope)."
  type        = number
  default     = 500
}

variable "max_connections" {
  description = "Flag max_connections. Debe cubrir Σ(max_instancias × DB_POOL_MAX) + jobs + margen."
  type        = number
}

variable "log_min_duration_ms" {
  description = "Registra consultas más lentas que esto (ms)."
  type        = number
  default     = 500
}

variable "extra_flags" {
  description = "Flags adicionales de Postgres."
  type        = map(string)
  default     = {}
}

variable "backup_start_time" {
  description = "Hora UTC de inicio del backup diario (HH:MM). 08:00 UTC = 02:00 CDMX."
  type        = string
  default     = "08:00"
}

variable "backup_location" {
  description = "Ubicación de los backups (multi-región, p. ej. us). null = la de la instancia."
  type        = string
  default     = "us"
}

variable "backup_retention_count" {
  description = "Número de backups diarios que se conservan."
  type        = number
}

variable "pitr_days" {
  description = "Días de logs de transacciones para point-in-time recovery (1-7 en ENTERPRISE)."
  type        = number
  default     = 7
}

variable "maintenance_day" {
  description = "Día de mantenimiento (1=lunes … 7=domingo)."
  type        = number
  default     = 7
}

variable "maintenance_hour" {
  description = "Hora UTC de mantenimiento (0-23). 9 UTC = 03:00 CDMX."
  type        = number
  default     = 9
}

variable "deletion_protection" {
  description = "Protección contra borrado (Terraform y API)."
  type        = bool
  default     = true
}

variable "service_roles" {
  description = "Servicios con schema propio: se genera contraseña y DATABASE_URL para g3_<svc>."
  type        = list(string)
}

variable "client_sslmode" {
  description = "sslmode del DATABASE_URL (no-verify: cifrado sin validar certificado; ver PRODUCTION-READINESS)."
  type        = string
  default     = "no-verify"
}

variable "password_rotation_id" {
  description = "Cambiarlo regenera TODAS las contraseñas (admin y servicios). Ver RUNBOOK › Rotación."
  type        = string
  default     = "1"
}

variable "labels" {
  description = "Etiquetas."
  type        = map(string)
  default     = {}
}
