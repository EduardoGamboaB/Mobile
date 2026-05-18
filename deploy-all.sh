#!/usr/bin/env bash
# G3 — Deploy orquestado: backend → admin → website.
#
# Uso:
#   PROJECT_ID=g3-prod REGION=us-central1 \
#   ADMIN_BUCKET=g3-admin-prod \
#   WEBSITE_BUCKET=g3-website-prod \
#   ./deploy-all.sh
#
# Esto:
#   1. Despliega los 7 microservicios + gateway a Cloud Run
#   2. Captura la URL pública del gateway
#   3. Build del admin con NEXT_PUBLIC_API_BASE_URL → gateway → upload al bucket
#   4. Build del website público → upload al bucket (no necesita API_BASE_URL)

set -euo pipefail

PROJECT_ID="${PROJECT_ID:?PROJECT_ID requerido}"
REGION="${REGION:-us-central1}"
ADMIN_BUCKET="${ADMIN_BUCKET:?ADMIN_BUCKET requerido (ej. g3-admin-prod)}"
WEBSITE_BUCKET="${WEBSITE_BUCKET:?WEBSITE_BUCKET requerido (ej. g3-website-prod)}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { printf "\033[1;32m[deploy-all]\033[0m %s\n" "$*"; }

# --- 1. Backend ---
log "── Fase 1/3: backend ─────────────────────────────"
PROJECT_ID="$PROJECT_ID" REGION="$REGION" bash "$ROOT/backend/infra/ci/deploy.sh"

# --- 2. Recuperar URL del gateway ---
log "Recuperando URL pública del gateway…"
GATEWAY_URL="$(gcloud run services describe g3-gateway \
  --region="$REGION" --format='value(status.url)')"
log "Gateway: $GATEWAY_URL"

# --- 3. Admin ---
log "── Fase 2/3: admin (panel privado) ───────────────"
PROJECT_ID="$PROJECT_ID" \
BUCKET="$ADMIN_BUCKET" \
API_BASE_URL="$GATEWAY_URL" \
bash "$ROOT/admin/deploy/deploy.sh"

# --- 4. Website ---
log "── Fase 3/3: website (sitio público) ─────────────"
PROJECT_ID="$PROJECT_ID" \
BUCKET="$WEBSITE_BUCKET" \
bash "$ROOT/website/deploy/deploy.sh"

log "✓ Deploy completo."
log "  · API gateway: $GATEWAY_URL"
log "  · Admin:       gs://${ADMIN_BUCKET}"
log "  · Website:     gs://${WEBSITE_BUCKET}"
