output "state_bucket" {
  description = "Bucket del state (terraform init -backend-config=\"bucket=…\")."
  value       = google_storage_bucket.tfstate.name
}

output "wif_provider" {
  description = "Proveedor WIF (variable GCP_WIF_PROVIDER_<ENV> en GitHub)."
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "tf_plan_service_account" {
  description = "Cuenta para terraform plan (GCP_TF_PLAN_SA_<ENV>)."
  value       = google_service_account.tf_plan.email
}

output "tf_apply_service_account" {
  description = "Cuenta para terraform apply (GCP_TF_APPLY_SA_<ENV>)."
  value       = google_service_account.tf_apply.email
}
