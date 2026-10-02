output "lb_ip" {
  description = "IP pública del LB (registros A de api/admin)."
  value       = module.g3.lb_ip
}

output "api_url" {
  description = "URL del API."
  value       = module.g3.api_url
}

output "admin_url" {
  description = "URL del panel."
  value       = module.g3.admin_url
}

output "registry" {
  description = "Artifact Registry."
  value       = module.g3.registry
}

output "service_urls" {
  description = "URLs internas por servicio."
  value       = module.g3.service_urls
}

output "app_secrets_to_load" {
  description = "Secretos a cargar a mano."
  value       = module.g3.app_secrets_to_load
}

output "admin_deploy" {
  description = "Variables para admin/deploy/deploy.sh."
  value = {
    BUCKET         = module.g3.admin_bucket
    BACKEND_BUCKET = module.g3.admin_backend_bucket
    CDN_URL_MAP    = module.g3.cdn_url_map
    API_BASE_URL   = module.g3.api_url
  }
}

output "sql_instance" {
  description = "Instancia Cloud SQL."
  value       = module.g3.sql_instance
}

output "redis_host" {
  description = "Memorystore."
  value       = module.g3.redis_host
}

output "deployer_service_account" {
  description = "Cuenta de Cloud Build."
  value       = module.g3.deployer_service_account
}

output "db_connections_budget" {
  description = "Conexiones posibles vs max_connections."
  value       = module.g3.db_connections_budget
}
