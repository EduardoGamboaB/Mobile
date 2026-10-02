variable "project_id" {
  description = "Proyecto GCP."
  type        = string
}

variable "region" {
  description = "Región."
  type        = string
}

variable "name" {
  description = "Nombre del job."
  type        = string
}

variable "image" {
  description = "Imagen inicial (después la cambia el pipeline)."
  type        = string
}

variable "command" {
  description = "Entrypoint (null = el de la imagen)."
  type        = list(string)
  default     = null
}

variable "args" {
  description = "Argumentos."
  type        = list(string)
  default     = null
}

variable "service_account_email" {
  description = "Cuenta de servicio con la que corre."
  type        = string
}

variable "env" {
  description = "Variables en claro."
  type        = map(string)
  default     = {}
}

variable "secret_env" {
  description = "Variables desde Secret Manager: { VAR = \"secret-id\" }."
  type        = map(string)
  default     = {}
}

variable "timeout_seconds" {
  description = "Tiempo máximo por ejecución."
  type        = number
  default     = 900
}

variable "max_retries" {
  description = "Reintentos de la tarea. Las migraciones son transaccionales e idempotentes."
  type        = number
  default     = 1
}

variable "cpu" {
  description = "vCPU."
  type        = string
  default     = "1"
}

variable "memory" {
  description = "Memoria."
  type        = string
  default     = "512Mi"
}

variable "network" {
  description = "VPC."
  type        = string
}

variable "subnetwork" {
  description = "Subred."
  type        = string
}

variable "deletion_protection" {
  description = "Protección contra borrado."
  type        = bool
  default     = false
}

variable "labels" {
  description = "Etiquetas."
  type        = map(string)
  default     = {}
}
