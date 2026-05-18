#!/usr/bin/env bash
# G3 — Deploy orquestado: backend primero, después admin apuntando al gateway.
#
# Uso:
#   PROJECT_ID=g3-prod REGION=us-central1 BUCKET=g3-admin-prod ./deploy-all.sh
#
# Esto:
#   1. Despliega los 7 microservicios + gateway a Cloud Run
#   2. Captura la URL del gateway
#   3. Build del admin con NEXT_PUBLIC_API_BASE_URL apuntando al gateway
#   4. Upload del admin estático a Cloud Storage

set -euo pipefail

PROJECT_ID="${PROJECT_ID:?PROJECT_ID requerido}"
REGION="${REGION:-us-central1}"
BUCKET="${BUCKET:?BUCKET requerido (ej. g3-admin-prod)}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { printf "\033[1;32m[deploy-all]\033[0m %s\n" "$*"; }

# --- 1. Backend ---
log "── Fase 1/2: backend ─────────────────────────────"
PROJECT_ID="$PROJECT_ID" REGION="$REGION" bash "$ROOT/backend/infra/ci/deploy.sh"

# --- 2. Recuperar URL del gateway ---
log "Recuperando URL pública del gateway…"
GATEWAY_URL="$(gcloud run services describe g3-gateway \
  --region="$REGION" --format='value(status.url)')"
log "Gateway: $GATEWAY_URL"

# --- 3. Admin ---
log "── Fase 2/2: admin ───────────────────────────────"
PROJECT_ID="$PROJECT_ID" \
BUCKET="$BUCKET" \
API_BASE_URL="$GATEWAY_URL" \
bash "$ROOT/admin/deploy/deploy.sh"

log "✓ Deploy completo."
log "  · API gateway:  $GATEWAY_URL"
log "  · Admin bucket: gs://${BUCKET}"
