variable "project_id" {
  description = "Proyecto GCP."
  type        = string
}

variable "region" {
  description = "Región."
  type        = string
}

variable "name" {
  description = "Nombre de la instancia."
  type        = string
}

variable "tier" {
  description = "BASIC (staging) o STANDARD_HA (producción: réplica y failover automático)."
  type        = string

  validation {
    condition     = contains(["BASIC", "STANDARD_HA"], var.tier)
    error_message = "tier debe ser BASIC o STANDARD_HA."
  }
}

variable "memory_size_gb" {
  description = "Memoria en GB."
  type        = number
  default     = 1
}

variable "redis_version" {
  description = "Versión de Redis."
  type        = string
  default     = "REDIS_7_2"
}

variable "network_id" {
  description = "VPC con Private Service Access."
  type        = string
}

variable "reserved_ip_range" {
  description = "Nombre del rango PSA asignado."
  type        = string
}

variable "maintenance_day" {
  description = "Día de mantenimiento (MONDAY…SUNDAY)."
  type        = string
  default     = "SUNDAY"
}

variable "maintenance_hour" {
  description = "Hora UTC de mantenimiento."
  type        = number
  default     = 9
}

variable "labels" {
  description = "Etiquetas."
  type        = map(string)
  default     = {}
}
