output "lb_ip" {
  description = "IP del Load Balancer: crea los registros A de api.* y admin.* (si el DNS no es Cloud DNS)."
  value       = module.edge.lb_ip
}

output "api_url" {
  description = "URL pública del API."
  value       = "https://${var.api_domain}"
}

output "admin_url" {
  description = "URL pública del panel."
  value       = "https://${var.admin_domain}"
}

output "registry" {
  description = "Artifact Registry (_REGISTRY de Cloud Build)."
  value       = local.registry
}

output "service_urls" {
  description = "URLs internas (*.run.app) por servicio."
  value       = local.run_url
}

output "migrate_jobs" {
  description = "Jobs de migración por servicio."
  value       = { for s in var.migrate_services : s => "migrate-${s}" }
}

output "sql_instance" {
  description = "Instancia Cloud SQL."
  value       = module.database.instance_name
}

output "sql_connection_name" {
  description = "connection_name de Cloud SQL (Auth Proxy)."
  value       = module.database.connection_name
}

output "sql_private_ip" {
  description = "IP privada de Cloud SQL."
  value       = module.database.private_ip
}

output "redis_host" {
  description = "IP privada de Memorystore."
  value       = module.redis.host
}

output "app_secrets_to_load" {
  description = "Secretos que hay que cargar a mano (gcloud secrets versions add) con el comando sugerido."
  value       = { for k, v in local.app_secrets : v.id => v.how }
}

output "evidence_bucket" {
  description = "Bucket de evidencias (EVIDENCE_BUCKET)."
  value       = google_storage_bucket.evidence.name
}

output "admin_bucket" {
  description = "Bucket del panel (BUCKET en admin/deploy/deploy.sh)."
  value       = google_storage_bucket.admin.name
}

output "admin_backend_bucket" {
  description = "Backend bucket (BACKEND_BUCKET en admin/deploy/deploy.sh)."
  value       = module.edge.admin_backend_bucket_name
}

output "cdn_url_map" {
  description = "URL map (CDN_URL_MAP en admin/deploy/deploy.sh)."
  value       = module.edge.url_map_name
}

output "deployer_service_account" {
  description = "Cuenta de servicio de Cloud Build."
  value       = google_service_account.deployer.email
}

output "service_accounts" {
  description = "Cuentas de servicio de runtime por servicio."
  value       = { for s, sa in google_service_account.svc : s => sa.email }
}

output "pubsub_topic" {
  description = "Tópico de eventos de dominio."
  value       = google_pubsub_topic.domain_events.name
}

output "db_connections_budget" {
  description = "Σ(max_instances × DB_POOL_MAX) + 20 frente a max_connections."
  value       = "${local.db_connections_budget} / ${var.sql_max_connections}"
}
