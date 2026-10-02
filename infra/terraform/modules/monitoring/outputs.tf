output "notification_channel_ids" {
  description = "Canales de notificación (también los usa el budget)."
  value       = [for c in google_monitoring_notification_channel.email : c.id]
}

output "uptime_check_ids" {
  description = "IDs de los uptime checks."
  value = {
    api   = google_monitoring_uptime_check_config.api.uptime_check_id
    admin = google_monitoring_uptime_check_config.admin.uptime_check_id
  }
}
