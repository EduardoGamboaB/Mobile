variable "project_id" {
  description = "Proyecto GCP."
  type        = string
}

variable "region" {
  description = "Región."
  type        = string
}

variable "name" {
  description = "Nombre del servicio (g3-<svc>)."
  type        = string
}

variable "description" {
  description = "Descripción."
  type        = string
  default     = null
}

variable "image" {
  description = "Imagen inicial (después la cambia el pipeline)."
  type        = string
}

variable "service_account_email" {
  description = "Cuenta de servicio dedicada del servicio."
  type        = string
}

variable "ingress" {
  description = "INGRESS_TRAFFIC_INTERNAL_ONLY (servicios internos) o INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER (gateway detrás del LB)."
  type        = string
  default     = "INGRESS_TRAFFIC_INTERNAL_ONLY"
}

variable "invokers" {
  description = "Miembros con roles/run.invoker: { etiqueta = \"serviceAccount:…\" }."
  type        = map(string)
  default     = {}
}

variable "env" {
  description = "Variables de entorno en claro (nada secreto)."
  type        = map(string)
  default     = {}
}

variable "secret_env" {
  description = "Variables desde Secret Manager: { VAR = \"secret-id\" } (versión latest)."
  type        = map(string)
  default     = {}
}

variable "secret_files" {
  description = "Secretos montados como archivo: { volumen = { secret_id, mount_path, file_name } }."
  type = map(object({
    secret_id  = string
    mount_path = string
    file_name  = string
  }))
  default = {}
}

variable "cpu" {
  description = "vCPU por instancia."
  type        = string
  default     = "1"
}

variable "memory" {
  description = "Memoria por instancia."
  type        = string
  default     = "512Mi"
}

variable "cpu_idle" {
  description = "true = CPU solo durante peticiones (más barato)."
  type        = bool
  default     = true
}

variable "min_instances" {
  description = "Instancias mínimas (evita arranques en frío)."
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Tope de instancias (control DSI Cloud Run-03; acota también conexiones a Postgres)."
  type        = number
  default     = 10
}

variable "concurrency" {
  description = "Peticiones simultáneas por instancia (control DSI Cloud Run-04)."
  type        = number
  default     = 80
}

variable "request_timeout_seconds" {
  description = "Timeout por petición."
  type        = number
  default     = 60
}

variable "network" {
  description = "VPC para Direct VPC egress."
  type        = string
}

variable "subnetwork" {
  description = "Subred para Direct VPC egress."
  type        = string
}

variable "vpc_egress" {
  description = "PRIVATE_RANGES_ONLY (control DSI Cloud Run-02) o ALL_TRAFFIC (requiere Cloud NAT)."
  type        = string
  default     = "PRIVATE_RANGES_ONLY"
}

variable "startup_probe_path" {
  description = "Ruta del startup probe (readiness)."
  type        = string
  default     = "/ready"
}

variable "startup_failure_threshold" {
  description = "Intentos del startup probe (cada 5 s)."
  type        = number
  default     = 24
}

variable "liveness_probe_path" {
  description = "Ruta del liveness probe."
  type        = string
  default     = "/health"
}

variable "binary_authorization" {
  description = "Exigir Binary Authorization (política por defecto del proyecto)."
  type        = bool
  default     = false
}

variable "deletion_protection" {
  description = "Protección contra borrado."
  type        = bool
  default     = true
}

variable "labels" {
  description = "Etiquetas."
  type        = map(string)
  default     = {}
}
