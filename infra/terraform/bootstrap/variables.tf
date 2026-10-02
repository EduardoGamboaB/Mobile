variable "project_id" {
  description = "Proyecto GCP del ambiente."
  type        = string
}

variable "region" {
  description = "Región por defecto."
  type        = string
  default     = "us-central1"
}

variable "state_location" {
  description = "Ubicación del bucket del state."
  type        = string
  default     = "US"
}

variable "github_repository" {
  description = "Repositorio de GitHub (OWNER/REPO) autorizado por WIF."
  type        = string
}

variable "github_environment" {
  description = "Ambiente de GitHub protegido (con revisores) que puede hacer apply (p. ej. production, staging)."
  type        = string
}

variable "apply_roles" {
  description = "Roles de la cuenta de apply. Owner simplifica; restringir cuando la infraestructura se estabilice."
  type        = list(string)
  default     = ["roles/owner"]
}
