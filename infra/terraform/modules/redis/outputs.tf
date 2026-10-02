output "id" {
  description = "ID de la instancia (projects/…/locations/…/instances/…)."
  value       = google_redis_instance.this.id
}

output "name" {
  description = "Nombre de la instancia."
  value       = google_redis_instance.this.name
}

output "host" {
  description = "IP privada."
  value       = google_redis_instance.this.host
}

output "port" {
  description = "Puerto TLS."
  value       = google_redis_instance.this.port
}

output "url_secret_id" {
  description = "Secreto con REDIS_URL."
  value       = google_secret_manager_secret.url.secret_id
}

output "ca_secret_id" {
  description = "Secreto con la CA del servidor."
  value       = google_secret_manager_secret.ca.secret_id
}
