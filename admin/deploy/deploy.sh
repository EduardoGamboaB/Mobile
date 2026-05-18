#!/usr/bin/env bash
# G3 Admin — Deploy del panel a Cloud Storage + Cloud CDN.
#
# Next.js con output:'export' genera HTML/JS estático en /out — lo subimos
# a un bucket público con un Load Balancer + Cloud CDN al frente.
#
# Uso:
#   PROJECT_ID=g3-prod BUCKET=g3-admin-prod \
#   API_BASE_URL=https://g3-gateway-xxx.run.app \
#   ./deploy/deploy.sh
#
# Requisitos previos (una sola vez):
#   1. gcloud auth login && gcloud config set project $PROJECT_ID
#   2. Crear bucket:
#        gsutil mb -l us-central1 gs://$BUCKET
#        gsutil iam ch allUsers:objectViewer gs://$BUCKET
#        gsutil web set -m index.html -e 404/index.html gs://$BUCKET
#   3. (Opcional, dominio propio) Crear Load Balancer + Cloud CDN +
#      certificado managed:
#        gcloud compute backend-buckets create g3-admin-backend \
#          --gcs-bucket-name=$BUCKET --enable-cdn
#        … URL map + target proxy + global forwarding rule → admin.tudominio.mx

set -euo pipefail

PROJECT_ID="${PROJECT_ID:?PROJECT_ID requerido}"
BUCKET="${BUCKET:?BUCKET requerido (ej. g3-admin-prod)}"
API_BASE_URL="${API_BASE_URL:?API_BASE_URL requerido (URL pública del gateway)}"
REGION="${REGION:-us-central1}"
CDN_URL_MAP="${CDN_URL_MAP:-}"   # opcional para invalidar caché

ADMIN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ADMIN_ROOT"

log() { printf "\033[1;34m[admin-deploy]\033[0m %s\n" "$*"; }
die() { printf "\033[1;31m[admin-deploy]\033[0m %s\n" "$*" >&2; exit 1; }

command -v gcloud >/dev/null || die "gcloud no está instalado"
command -v gsutil >/dev/null || die "gsutil no está instalado"
command -v npm >/dev/null || die "npm no está instalado"

gcloud config set project "$PROJECT_ID" >/dev/null

# ---------------------------------------------------------------------------
# 1. INSTALAR dependencias y CORRER TESTS (no deployamos si falla)
# ---------------------------------------------------------------------------
log "Instalando dependencias…"
npm ci --no-audit --no-fund --ignore-scripts >/dev/null 2>&1 || npm install --no-audit --no-fund --ignore-scripts >/dev/null

log "Corriendo typecheck + tests (no deployamos si rompen)…"
npm run typecheck
npm test -- --silent --passWithNoTests

# ---------------------------------------------------------------------------
# 2. BUILD estático con NEXT_PUBLIC_API_BASE_URL apuntando al gateway real
# ---------------------------------------------------------------------------
log "Compilando con NEXT_PUBLIC_API_BASE_URL=${API_BASE_URL}…"
export NEXT_PUBLIC_API_BASE_URL="$API_BASE_URL"
rm -rf .next out
npm run build

[[ -d out ]] || die "next build no generó /out — ¿está output:'export' en next.config.js?"

# ---------------------------------------------------------------------------
# 3. SYNC al bucket con cache-control distinto para HTML vs assets
# ---------------------------------------------------------------------------
log "Subiendo a gs://${BUCKET}/ …"

# Assets con hash (Next.js los pone en _next/static/) → cacheables 1 año
gsutil -m -h "Cache-Control:public, max-age=31536000, immutable" \
  rsync -r -d -x "(.*\.html$|^[^/]*$)" out "gs://${BUCKET}" >/dev/null

# HTML y root → no cache (para que un nuevo deploy se vea inmediatamente)
gsutil -m -h "Cache-Control:public, max-age=0, must-revalidate" \
  cp -r out/**/*.html out/*.html "gs://${BUCKET}/" 2>/dev/null || true

# Específicamente index.html
[[ -f out/index.html ]] && gsutil -h "Cache-Control:public, max-age=0, must-revalidate" \
  cp out/index.html "gs://${BUCKET}/index.html" >/dev/null

# ---------------------------------------------------------------------------
# 4. INVALIDAR Cloud CDN si configuraste un URL map
# ---------------------------------------------------------------------------
if [[ -n "$CDN_URL_MAP" ]]; then
  log "Invalidando Cloud CDN ($CDN_URL_MAP)…"
  gcloud compute url-maps invalidate-cdn-cache "$CDN_URL_MAP" \
    --path="/*" --async --quiet
fi

# ---------------------------------------------------------------------------
# 5. Mostrar URL
# ---------------------------------------------------------------------------
BUCKET_URL="https://storage.googleapis.com/${BUCKET}/index.html"

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Admin desplegado."
log "Bucket público: ${BUCKET_URL}"
log "(Para dominio propio, configurá Load Balancer + Cloud CDN al bucket)"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
