variable "project_id" {
  description = "Proyecto GCP de producción."
  type        = string
}

variable "region" {
  description = "Región principal."
  type        = string
  default     = "us-central1"
}

variable "api_domain" {
  description = "Dominio del API."
  type        = string
}

variable "admin_domain" {
  description = "Dominio del panel."
  type        = string
}

variable "dns_managed_zone" {
  description = "Zona de Cloud DNS (null = DNS externo)."
  type        = string
  default     = null
}

variable "deploy_workloads" {
  description = "Fase 2 del primer despliegue (ver DEPLOY.md)."
  type        = bool
  default     = false
}

variable "image_tag" {
  description = "Tag de imagen para crear servicios/jobs (el SHA del primer build)."
  type        = string
  default     = "bootstrap"
}

variable "platform_company_id" {
  description = "G3_PLATFORM_COMPANY_ID."
  type        = string
  default     = ""
}

variable "extra_env" {
  description = "Variables en claro adicionales por servicio."
  type        = map(map(string))
  default     = {}
}

variable "extra_secret_env" {
  description = "Variables desde secretos existentes por servicio."
  type        = map(map(string))
  default     = {}
}

variable "extra_secret_access" {
  description = "Secretos que un servicio lee por referencia."
  type        = map(list(string))
  default     = {}
}

variable "api_allowed_regions" {
  description = "Países permitidos para el API (vacío = todos)."
  type        = list(string)
  default     = []
}

variable "admin_allowed_regions" {
  description = "Países permitidos para el panel (vacío = todos)."
  type        = list(string)
  default     = []
}

variable "alert_emails" {
  description = "Correos on-call."
  type        = list(string)
}

variable "runbook_url" {
  description = "URL de docs/ops/RUNBOOK.md."
  type        = string
}

variable "billing_account" {
  description = "Cuenta de facturación para el budget (null = sin budget)."
  type        = string
  default     = null
}

variable "budget_amount" {
  description = "Presupuesto mensual."
  type        = number
  default     = 1500
}

variable "budget_currency" {
  description = "Moneda de la cuenta de facturación."
  type        = string
  default     = "USD"
}

variable "cloudbuild_repository" {
  description = "Repositorio Cloud Build 2nd gen (null = sin trigger)."
  type        = string
  default     = null
}
