output "lb_ip" {
  description = "IP pública del LB: apunta api.* y admin.* (registros A) aquí."
  value       = google_compute_global_address.lb.address
}

output "url_map_name" {
  description = "URL map HTTPS (para invalidar Cloud CDN: CDN_URL_MAP en admin/deploy/deploy.sh)."
  value       = google_compute_url_map.https.name
}

output "admin_backend_bucket_name" {
  description = "Backend bucket del panel (BACKEND_BUCKET en admin/deploy/deploy.sh)."
  value       = google_compute_backend_bucket.admin.name
}

output "api_security_policy" {
  description = "Política Cloud Armor del API."
  value       = google_compute_security_policy.api.name
}

output "certificate_name" {
  description = "Certificado administrado (estado: gcloud compute ssl-certificates describe)."
  value       = google_compute_managed_ssl_certificate.this.name
}
