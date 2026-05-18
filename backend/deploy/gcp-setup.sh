#!/usr/bin/env bash
# G3 Backend — provisión inicial de GCP.
# Idempotente: puede correrse varias veces.
# Requiere: gcloud auth login + gcloud config set project <id>.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project)}"
REGION="${REGION:-us-central1}"
DB_INSTANCE="g3-postgres"
DB_NAME="g3"
DB_USER="g3"
SA_EMAIL="g3-backend@${PROJECT_ID}.iam.gserviceaccount.com"

echo "▶ Habilitando APIs..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  pubsub.googleapis.com \
  bigquery.googleapis.com \
  aiplatform.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  --project="${PROJECT_ID}"

echo "▶ Service account..."
gcloud iam service-accounts create g3-backend --display-name "G3 Backend" --project="${PROJECT_ID}" || true
for ROLE in roles/cloudsql.client roles/secretmanager.secretAccessor roles/pubsub.publisher roles/aiplatform.user roles/bigquery.dataEditor; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" --member="serviceAccount:${SA_EMAIL}" --role="${ROLE}" >/dev/null
done

echo "▶ Artifact Registry..."
gcloud artifacts repositories create g3 --repository-format=docker --location="${REGION}" --project="${PROJECT_ID}" || true

echo "▶ Cloud SQL Postgres..."
gcloud sql instances create "${DB_INSTANCE}" \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region="${REGION}" \
  --project="${PROJECT_ID}" || true
gcloud sql databases create "${DB_NAME}" --instance="${DB_INSTANCE}" --project="${PROJECT_ID}" || true
DB_PASS="$(openssl rand -base64 24)"
gcloud sql users create "${DB_USER}" --instance="${DB_INSTANCE}" --password="${DB_PASS}" --project="${PROJECT_ID}" || true

DB_URL="postgres://${DB_USER}:${DB_PASS}@/${DB_NAME}?host=/cloudsql/${PROJECT_ID}:${REGION}:${DB_INSTANCE}"
echo "▶ Secretos en Secret Manager..."
printf "%s" "${DB_URL}"            | gcloud secrets create g3-db-url --replication-policy=automatic --data-file=- --project="${PROJECT_ID}" || \
printf "%s" "${DB_URL}"            | gcloud secrets versions add g3-db-url --data-file=- --project="${PROJECT_ID}"
echo "${JWT_SECRET:-$(openssl rand -hex 32)}"         | gcloud secrets create g3-jwt-secret         --replication-policy=automatic --data-file=- --project="${PROJECT_ID}" 2>/dev/null || true
echo "${JWT_REFRESH_SECRET:-$(openssl rand -hex 32)}" | gcloud secrets create g3-jwt-refresh-secret --replication-policy=automatic --data-file=- --project="${PROJECT_ID}" 2>/dev/null || true
echo "REPLACE_WITH_STRIPE_SK"      | gcloud secrets create g3-stripe-sk     --replication-policy=automatic --data-file=- --project="${PROJECT_ID}" 2>/dev/null || true
echo "REPLACE_WITH_STRIPE_WHSEC"   | gcloud secrets create g3-stripe-whsec --replication-policy=automatic --data-file=- --project="${PROJECT_ID}" 2>/dev/null || true

echo "▶ Pub/Sub topics..."
gcloud pubsub topics create g3-domain-events --project="${PROJECT_ID}" || true
gcloud pubsub topics create g3-alerts        --project="${PROJECT_ID}" || true

echo "▶ BigQuery dataset (data lake)..."
bq --location="${REGION}" mk --dataset --project_id="${PROJECT_ID}" "${PROJECT_ID}:g3_warehouse" || true

echo "✅ Setup GCP completo. Siguiente paso: gcloud builds submit"
