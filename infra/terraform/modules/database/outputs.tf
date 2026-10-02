output "instance_name" {
  description = "Nombre de la instancia."
  value       = google_sql_database_instance.pg.name
}

output "connection_name" {
  description = "project:region:instance (Cloud SQL Auth Proxy)."
  value       = google_sql_database_instance.pg.connection_name
}

output "private_ip" {
  description = "IP privada de la instancia."
  value       = google_sql_database_instance.pg.private_ip_address
}

output "database_name" {
  description = "Base de la aplicación."
  value       = google_sql_database.g3.name
}

output "admin_password_secret_id" {
  description = "Secreto con la contraseña de postgres."
  value       = google_secret_manager_secret.admin_password.secret_id
}

output "password_secret_ids" {
  description = "servicio → secreto con la contraseña de g3_<svc>."
  value       = { for k, s in google_secret_manager_secret.svc_password : k => s.secret_id }
}

output "url_secret_ids" {
  description = "servicio → secreto con el DATABASE_URL de g3_<svc>."
  value       = { for k, s in google_secret_manager_secret.svc_url : k => s.secret_id }
}

output "url_secret_versions" {
  description = "servicio → versión actual del DATABASE_URL (para forzar nuevas revisiones al rotar)."
  value       = { for k, v in google_secret_manager_secret_version.svc_url : k => v.version }
}
