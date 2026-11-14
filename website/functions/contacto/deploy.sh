#!/usr/bin/env bash
# Despliega la Cloud Run function del formulario de contacto (g3-contacto).
#
# Uso (una vez creado el secreto, ver README.md):
#   PROJECT_ID=g3-prod SMTP_USER=fletes@g3logistics.mx ./deploy.sh
#
# Variables opcionales:
#   REGION (us-central1) · SMTP_HOST (smtp.gmail.com) · SMTP_PORT (465)
#   MAIL_TO (fletes@g3logistics.mx) · MAIL_FROM ("G3 Logistics <$SMTP_USER>")
#   SMTP_SECRET (g3-smtp-pass) · ALLOWED_ORIGINS (https://www.g3logistics.mx,https://g3logistics.mx)
#   HUBSPOT_SECRET (g3-hubspot-token): si el secreto existe, cada solicitud se registra en HubSpot

set -euo pipefail

PROJECT_ID="${PROJECT_ID:?PROJECT_ID requerido}"
SMTP_USER="${SMTP_USER:?SMTP_USER requerido (cuenta que envía el correo)}"
REGION="${REGION:-us-central1}"
SMTP_HOST="${SMTP_HOST:-smtp.gmail.com}"
SMTP_PORT="${SMTP_PORT:-465}"
MAIL_TO="${MAIL_TO:-fletes@g3logistics.mx}"
MAIL_FROM="${MAIL_FROM:-G3 Logistics <${SMTP_USER}>}"
SMTP_SECRET="${SMTP_SECRET:-g3-smtp-pass}"
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-https://www.g3logistics.mx,https://g3logistics.mx}"
HUBSPOT_SECRET="${HUBSPOT_SECRET:-g3-hubspot-token}"

cd "$(dirname "${BASH_SOURCE[0]}")"
log() { printf "\033[1;34m[contacto-deploy]\033[0m %s\n" "$*"; }

gcloud config set project "$PROJECT_ID" >/dev/null
gcloud services enable cloudfunctions.googleapis.com run.googleapis.com \
  cloudbuild.googleapis.com secretmanager.googleapis.com artifactregistry.googleapis.com >/dev/null

gcloud secrets describe "$SMTP_SECRET" >/dev/null 2>&1 || {
  echo "Falta el secreto '$SMTP_SECRET'. Créalo con:" >&2
  echo "  printf '%s' 'CONTRASEÑA_SMTP' | gcloud secrets create $SMTP_SECRET --data-file=-" >&2
  exit 1
}

# La cuenta de servicio de la función necesita leer el secreto.
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
gcloud secrets add-iam-policy-binding "$SMTP_SECRET" \
  --member="serviceAccount:${RUNTIME_SA}" --role=roles/secretmanager.secretAccessor >/dev/null

SECRETS="SMTP_PASS=${SMTP_SECRET}:latest"
if gcloud secrets describe "$HUBSPOT_SECRET" >/dev/null 2>&1; then
  gcloud secrets add-iam-policy-binding "$HUBSPOT_SECRET" \
    --member="serviceAccount:${RUNTIME_SA}" --role=roles/secretmanager.secretAccessor >/dev/null
  SECRETS="${SECRETS},HUBSPOT_TOKEN=${HUBSPOT_SECRET}:latest"
  log "HubSpot: activado (secreto ${HUBSPOT_SECRET})"
else
  log "HubSpot: sin secreto '${HUBSPOT_SECRET}', solo se enviará el correo"
fi

log "Corriendo pruebas…"
npm ci --no-audit --no-fund >/dev/null
npm test >/dev/null

log "Desplegando g3-contacto en ${REGION}…"
# ^|^ cambia el separador de --set-env-vars para permitir comas en ALLOWED_ORIGINS
gcloud functions deploy g3-contacto \
  --gen2 --runtime=nodejs20 --region="$REGION" \
  --source=. --entry-point=contacto --trigger-http --allow-unauthenticated \
  --memory=256Mi --timeout=30s --max-instances=5 \
  --set-env-vars="^|^SMTP_HOST=${SMTP_HOST}|SMTP_PORT=${SMTP_PORT}|SMTP_USER=${SMTP_USER}|MAIL_TO=${MAIL_TO}|MAIL_FROM=${MAIL_FROM}|ALLOWED_ORIGINS=${ALLOWED_ORIGINS}" \
  --set-secrets="${SECRETS}"

URL="$(gcloud functions describe g3-contacto --gen2 --region="$REGION" --format='value(serviceConfig.uri)')"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Formulario listo: $URL"
log "El deploy del sitio (website/deploy/deploy.sh) toma esta URL automáticamente."
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
