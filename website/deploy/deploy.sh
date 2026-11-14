#!/usr/bin/env bash
# G3 Website — Deploy del sitio público (g3logistics.mx).
#
# Next.js con output:'export' genera HTML/JS estático en /out — lo subimos
# a un bucket de Cloud Storage con Load Balancer + Cloud CDN al frente.
#
# Uso:
#   PROJECT_ID=g3-prod BUCKET=g3-website-prod ./deploy/deploy.sh
#
# Requisitos previos (una sola vez):
#   1. gcloud auth login && gcloud config set project $PROJECT_ID
#   2. Crear bucket:
#        gsutil mb -l us-central1 gs://$BUCKET
#        gsutil iam ch allUsers:objectViewer gs://$BUCKET
#        gsutil web set -m index.html -e 404/index.html gs://$BUCKET
#   3. Load Balancer + Cloud CDN + cert managed para www.g3logistics.mx

set -euo pipefail

PROJECT_ID="${PROJECT_ID:?PROJECT_ID requerido}"
BUCKET="${BUCKET:?BUCKET requerido (ej. g3-website-prod)}"
CDN_URL_MAP="${CDN_URL_MAP:-}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

log() { printf "\033[1;34m[website-deploy]\033[0m %s\n" "$*"; }
die() { printf "\033[1;31m[website-deploy]\033[0m %s\n" "$*" >&2; exit 1; }

command -v gcloud >/dev/null || die "gcloud no instalado"
command -v gsutil >/dev/null || die "gsutil no instalado"
command -v npm >/dev/null || die "npm no instalado"

gcloud config set project "$PROJECT_ID" >/dev/null

log "Instalando dependencias…"
npm ci --no-audit --no-fund --ignore-scripts >/dev/null 2>&1 || npm install --no-audit --no-fund --ignore-scripts >/dev/null

log "Typecheck…"
npm run typecheck

# URL de la Cloud Run function del formulario (functions/contacto). Si no
# se pasa FORM_ENDPOINT, se toma de la función desplegada en el proyecto.
REGION="${REGION:-us-central1}"
FORM_ENDPOINT="${FORM_ENDPOINT:-$(gcloud functions describe g3-contacto --gen2 --region="$REGION" --format='value(serviceConfig.uri)' 2>/dev/null || true)}"
if [[ -n "$FORM_ENDPOINT" ]]; then
  export NEXT_PUBLIC_FORM_ENDPOINT="$FORM_ENDPOINT"
  log "Formulario → $FORM_ENDPOINT"
else
  log "AVISO: g3-contacto no está desplegada; el formulario abrirá WhatsApp como respaldo."
fi

log "Build estático…"
rm -rf .next out
npm run build
[[ -d out ]] || die "next build no generó /out — revisa output:'export' en next.config.js"

log "Subiendo a gs://${BUCKET} …"
# Assets con hash → cache 1 año immutable
# -j: compresión gzip en tránsito para texto (HTML, CSS, JS, XML, SVG, TXT)
GZIP_EXT="html,css,js,json,xml,svg,txt"
gsutil -m -h "Cache-Control:public, max-age=31536000, immutable" \
  rsync -r -d -j "$GZIP_EXT" -x "(.*\.html$|^[^/]*$)" out "gs://${BUCKET}" >/dev/null

# HTML → no cache
gsutil -m -h "Cache-Control:public, max-age=0, must-revalidate" \
  cp -r -j "$GZIP_EXT" out/**/*.html out/*.html "gs://${BUCKET}/" 2>/dev/null || true
[[ -f out/index.html ]] && gsutil -h "Cache-Control:public, max-age=0, must-revalidate" \
  cp -j "$GZIP_EXT" out/index.html "gs://${BUCKET}/index.html" >/dev/null

if [[ -n "$CDN_URL_MAP" ]]; then
  log "Invalidando Cloud CDN ($CDN_URL_MAP)…"
  gcloud compute url-maps invalidate-cdn-cache "$CDN_URL_MAP" --path="/*" --async --quiet
fi

BUCKET_URL="https://storage.googleapis.com/${BUCKET}/index.html"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Website desplegado."
log "Preview: ${BUCKET_URL}"
log "(Apuntar www.g3logistics.mx al Load Balancer del bucket)"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
