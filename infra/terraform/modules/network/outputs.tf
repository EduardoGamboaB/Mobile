output "network_id" {
  description = "ID de la VPC."
  value       = google_compute_network.vpc.id
}

output "network_name" {
  description = "Nombre de la VPC."
  value       = google_compute_network.vpc.name
}

output "run_subnet_id" {
  description = "ID de la subred de Cloud Run."
  value       = google_compute_subnetwork.run.id
}

output "run_subnet_name" {
  description = "Nombre de la subred de Cloud Run."
  value       = google_compute_subnetwork.run.name
}

output "psa_range_name" {
  description = "Nombre del rango PSA (Memorystore lo usa como reserved_ip_range)."
  value       = google_compute_global_address.psa.name
}

output "psa_connection_id" {
  description = "Peering de servicios (dependencia para Cloud SQL y Redis)."
  value       = google_service_networking_connection.psa.id
}

output "psc_address" {
  description = "IP del endpoint PSC de APIs de Google."
  value       = google_compute_global_address.psc.address
}
