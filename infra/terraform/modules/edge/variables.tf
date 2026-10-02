variable "project_id" {
  description = "Proyecto GCP."
  type        = string
}

variable "region" {
  description = "Región del gateway."
  type        = string
}

variable "name_prefix" {
  description = "Prefijo de nombres."
  type        = string
}

variable "api_domain" {
  description = "Dominio del API (p. ej. api.g3logistics.mx)."
  type        = string
}

variable "admin_domain" {
  description = "Dominio del panel (p. ej. admin.g3logistics.mx)."
  type        = string
}

variable "gateway_service_name" {
  description = "Nombre del servicio Cloud Run del gateway."
  type        = string
}

variable "admin_bucket_name" {
  description = "Bucket con el build estático del panel."
  type        = string
}

variable "admin_bucket_public" {
  description = "false = bucket privado leído por la cuenta de Cloud CDN (recomendado). true = allUsers lector (excepción)."
  type        = bool
  default     = false
}

variable "dns_managed_zone" {
  description = "Zona de Cloud DNS donde crear los registros A (null = DNS externo, se usa el output lb_ip)."
  type        = string
  default     = null
}

variable "auth_rate_limit_per_minute" {
  description = "Peticiones por minuto por IP a /api/auth/*."
  type        = number
  default     = 60
}

variable "ingest_rate_limit_per_minute" {
  description = "Peticiones por minuto por IP a /api/telemetry/ingest/* (alinear con RATE_LIMIT_INGEST_MAX del gateway)."
  type        = number
  default     = 6000
}

variable "waf_sensitivity" {
  description = "Sensibilidad de las reglas OWASP preconfiguradas (1 = menos falsos positivos … 4)."
  type        = number
  default     = 1
}

variable "waf_preview" {
  description = "true = las reglas WAF solo registran (modo preview) — útil la primera semana en staging."
  type        = bool
  default     = false
}

variable "api_allowed_regions" {
  description = "Códigos ISO de país permitidos para el API (vacío = sin geo restricción)."
  type        = list(string)
  default     = []
}

variable "admin_allowed_regions" {
  description = "Códigos ISO de país permitidos para el panel (vacío = sin geo restricción)."
  type        = list(string)
  default     = []
}

variable "api_log_sample_rate" {
  description = "Muestreo de logs del LB del API (1.0 = todas las peticiones)."
  type        = number
  default     = 1
}
