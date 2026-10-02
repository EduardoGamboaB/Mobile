variable "project_id" {
  description = "Proyecto GCP."
  type        = string
}

variable "env" {
  description = "staging | production."
  type        = string
}

variable "notification_emails" {
  description = "Correos que reciben las alertas (on-call)."
  type        = list(string)
}

variable "api_domain" {
  description = "Dominio del API."
  type        = string
}

variable "admin_domain" {
  description = "Dominio del panel."
  type        = string
}

variable "sql_instance_name" {
  description = "Instancia Cloud SQL."
  type        = string
}

variable "redis_instance_id" {
  description = "ID de Memorystore (projects/…/locations/…/instances/…)."
  type        = string
}

variable "runbook_url" {
  description = "URL del RUNBOOK (docs/ops/RUNBOOK.md en el repo)."
  type        = string
}

variable "error_ratio_threshold" {
  description = "Proporción de 5xx que dispara la alerta."
  type        = number
  default     = 0.02
}

variable "latency_p95_ms" {
  description = "Umbral de latencia p95 (ms)."
  type        = number
  default     = 1500
}

variable "instance_saturation_threshold" {
  description = "Instancias activas por servicio que disparan aviso de saturación."
  type        = number
  default     = 8
}

variable "sql_cpu_threshold" {
  description = "CPU de Cloud SQL (0-1)."
  type        = number
  default     = 0.8
}

variable "sql_memory_threshold" {
  description = "Memoria de Cloud SQL (0-1)."
  type        = number
  default     = 0.9
}

variable "sql_connections_threshold" {
  description = "Conexiones (num_backends) que disparan alerta (≈ 80% de max_connections)."
  type        = number
}

variable "redis_memory_threshold" {
  description = "Uso de memoria de Redis (0-1)."
  type        = number
  default     = 0.8
}

variable "app_errors_per_5m" {
  description = "Errores de aplicación por servicio en 5 min."
  type        = number
  default     = 50
}

variable "armor_denied_per_5m" {
  description = "Bloqueos de Cloud Armor en 5 min."
  type        = number
  default     = 500
}
