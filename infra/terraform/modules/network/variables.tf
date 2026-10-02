variable "project_id" {
  description = "Proyecto GCP."
  type        = string
}

variable "region" {
  description = "Región de la subred de Cloud Run."
  type        = string
}

variable "name_prefix" {
  description = "Prefijo de nombres (p. ej. g3-prod)."
  type        = string
}

variable "run_subnet_cidr" {
  description = "Rango de la subred para Direct VPC egress de Cloud Run (mínimo /26; recomendado /24)."
  type        = string
  default     = "10.10.0.0/24"
}

variable "psa_range_address" {
  description = "Inicio del rango reservado para Private Service Access (Cloud SQL, Memorystore)."
  type        = string
  default     = "10.20.0.0"
}

variable "psa_range_prefix" {
  description = "Tamaño del rango PSA."
  type        = number
  default     = 16
}

variable "psc_address" {
  description = "IP interna del endpoint de Private Service Connect a las APIs de Google (fuera de las subredes y del rango PSA)."
  type        = string
  default     = "10.30.0.2"
}

variable "psc_endpoint_name" {
  description = "Nombre del forwarding rule PSC: 1-20 caracteres, minúsculas y dígitos, empieza con letra."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9]{0,19}$", var.psc_endpoint_name))
    error_message = "psc_endpoint_name: 1-20 caracteres [a-z0-9], empezando con letra."
  }
}

variable "flow_logs_sampling" {
  description = "Muestreo de VPC flow logs (0-1)."
  type        = number
  default     = 0.5
}

variable "enable_nat" {
  description = "Crea Cloud Router + Cloud NAT (solo necesario si algún servicio usa egress ALL_TRAFFIC)."
  type        = bool
  default     = false
}
