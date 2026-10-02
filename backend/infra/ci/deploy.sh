#!/usr/bin/env bash
# G3 Backend — Deploy de los 7 microservicios + gateway a Cloud Run.
#
# Idempotente: corre las veces que quieras, sólo despliega revisiones nuevas.
# Construye en paralelo, despliega secuencial (gateway al final para
# inyectar URLs de los servicios internos).
#
# Uso:
#   PROJECT_ID=g3-prod REGION=us-central1 ./infra/ci/deploy.sh
#
# Requisitos previos (una sola vez):
#   1. gcloud auth login && gcloud config set project $PROJECT_ID
#   2. Habilitar APIs:
#        gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
#          artifactregistry.googleapis.com secretmanager.googleapis.com \
#          pubsub.googleapis.com sqladmin.googleapis.com
#   3. Artifact Registry:
#        gcloud artifacts repositories create g3 --repository-format=docker \
#          --location=$REGION
#   4. Secrets en Secret Manager:
#        echo -n "<32+ chars>" | gcloud secrets create g3-jwt-access --data-file=-
#        echo -n "<32+ chars>" | gcloud secrets create g3-jwt-refresh --data-file=-
#        echo -n "<stripe sk>" | gcloud secrets create g3-stripe-secret --data-file=-
#   5. Service account de runtime:
#        gcloud iam service-accounts create g3-runtime
#        gcloud projects add-iam-policy-binding $PROJECT_ID \
#          --member=serviceAccount:g3-runtime@$PROJECT_ID.iam.gserviceaccount.com \
#          --role=roles/run.invoker
#        (más binding a roles/pubsub.publisher, roles/cloudsql.client si aplica)

set -euo pipefail

PROJECT_ID="${PROJECT_ID:?PROJECT_ID requerido}"
REGION="${REGION:-us-central1}"
REGISTRY="${REGISTRY:-${REGION}-docker.pkg.dev/${PROJECT_ID}/g3}"
TAG="${TAG:-$(git rev-parse --short HEAD 2>/dev/null || date +%s)}"
RUNTIME_SA="${RUNTIME_SA:-g3-runtime@${PROJECT_ID}.iam.gserviceaccount.com}"
MIN_INSTANCES="${MIN_INSTANCES:-0}"
MAX_INSTANCES="${MAX_INSTANCES:-10}"

SERVICES=(auth billing drivers fleet trips alerts ai integrations)

BACKEND_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$BACKEND_ROOT"

log() { printf "\033[1;34m[deploy]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[deploy]\033[0m %s\n" "$*"; }
die() { printf "\033[1;31m[deploy]\033[0m %s\n" "$*" >&2; exit 1; }

command -v gcloud >/dev/null || die "gcloud no está instalado"
command -v docker >/dev/null || die "docker no está instalado"
gcloud config set project "$PROJECT_ID" >/dev/null

log "Proyecto: $PROJECT_ID · región: $REGION · tag: $TAG"
log "Registry: $REGISTRY"

# Autenticación a Artifact Registry
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# ---------------------------------------------------------------------------
# 1. BUILD paralelo de las 8 imágenes
# ---------------------------------------------------------------------------
log "Construyendo imágenes en paralelo…"
declare -a BUILD_PIDS=()

build_image() {
  local svc_dir="$1" image="$2"
  log "  → build $image"
  docker build \
    --quiet \
    -f infra/docker/service.Dockerfile \
    --build-arg "SERVICE=${svc_dir}" \
    -t "${REGISTRY}/${image}:${TAG}" \
    -t "${REGISTRY}/${image}:latest" \
    . >/dev/null
}

build_image "gateway" "gateway" &
BUILD_PIDS+=($!)
for s in "${SERVICES[@]}"; do
  build_image "services/${s}" "${s}" &
  BUILD_PIDS+=($!)
done

# Esperar a todos los builds
for pid in "${BUILD_PIDS[@]}"; do
  wait "$pid" || die "Falló un build (pid=$pid)"
done
log "✓ Builds completos"

# ---------------------------------------------------------------------------
# 2. PUSH a Artifact Registry
# ---------------------------------------------------------------------------
log "Pushing al Artifact Registry…"
push_image() {
  docker push --quiet "${REGISTRY}/$1:${TAG}" >/dev/null
  docker push --quiet "${REGISTRY}/$1:latest" >/dev/null
}
declare -a PUSH_PIDS=()
push_image "gateway" & PUSH_PIDS+=($!)
for s in "${SERVICES[@]}"; do
  push_image "$s" & PUSH_PIDS+=($!)
done
for pid in "${PUSH_PIDS[@]}"; do wait "$pid" || die "Push falló (pid=$pid)"; done
log "✓ Push completo"

# ---------------------------------------------------------------------------
# 3. DEPLOY: servicios internos primero (no allow-unauthenticated)
# ---------------------------------------------------------------------------
log "Desplegando servicios internos a Cloud Run…"
deploy_internal() {
  local svc="$1"
  local cloud_run_name="g3-${svc}"

  gcloud run deploy "$cloud_run_name" \
    --image="${REGISTRY}/${svc}:${TAG}" \
    --region="$REGION" \
    --platform=managed \
    --no-allow-unauthenticated \
    --service-account="$RUNTIME_SA" \
    --min-instances="$MIN_INSTANCES" \
    --max-instances="$MAX_INSTANCES" \
    --memory=512Mi \
    --cpu=1 \
    --port=8080 \
    --set-env-vars="GCP_PROJECT_ID=${PROJECT_ID},PORT=8080,PUBSUB_TOPIC=g3-domain-events" \
    --set-secrets="JWT_ACCESS_SECRET=g3-jwt-access:latest,JWT_REFRESH_SECRET=g3-jwt-refresh:latest" \
    --quiet
}

for s in "${SERVICES[@]}"; do
  log "  → g3-${s}"
  deploy_internal "$s"
done
log "✓ Servicios internos desplegados"

# ---------------------------------------------------------------------------
# 4. Recuperar URLs de cada servicio interno
# ---------------------------------------------------------------------------
log "Recuperando URLs internos…"
declare -A URLS
for s in "${SERVICES[@]}"; do
  URLS[$s]="$(gcloud run services describe "g3-${s}" --region="$REGION" --format='value(status.url)')"
  log "  · ${s}: ${URLS[$s]}"
done

# ---------------------------------------------------------------------------
# 5. DEPLOY gateway (público, con las URLs inyectadas)
# ---------------------------------------------------------------------------
log "Desplegando gateway (público)…"
ENV_VARS="AUTH_URL=${URLS[auth]}"
ENV_VARS+=",BILLING_URL=${URLS[billing]}"
ENV_VARS+=",DRIVERS_URL=${URLS[drivers]}"
ENV_VARS+=",FLEET_URL=${URLS[fleet]}"
ENV_VARS+=",TRIPS_URL=${URLS[trips]}"
ENV_VARS+=",ALERTS_URL=${URLS[alerts]}"
ENV_VARS+=",AI_URL=${URLS[ai]}"
ENV_VARS+=",INTEGRATIONS_URL=${URLS[integrations]}"
ENV_VARS+=",GCP_PROJECT_ID=${PROJECT_ID},PORT=8080"

gcloud run deploy g3-gateway \
  --image="${REGISTRY}/gateway:${TAG}" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --service-account="$RUNTIME_SA" \
  --min-instances="$MIN_INSTANCES" \
  --max-instances="$MAX_INSTANCES" \
  --memory=512Mi \
  --cpu=1 \
  --port=8080 \
  --set-env-vars="$ENV_VARS" \
  --set-secrets="JWT_ACCESS_SECRET=g3-jwt-access:latest,JWT_REFRESH_SECRET=g3-jwt-refresh:latest" \
  --quiet

GATEWAY_URL="$(gcloud run services describe g3-gateway --region="$REGION" --format='value(status.url)')"

# ---------------------------------------------------------------------------
# 6. Smoke test
# ---------------------------------------------------------------------------
log "Smoke test → ${GATEWAY_URL}/health"
if curl -fsS "${GATEWAY_URL}/health" >/dev/null; then
  log "✓ Gateway respondiendo"
else
  warn "Gateway no respondió al health check (puede tardar 30s en estabilizarse)"
fi

echo
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Deploy COMPLETO."
log "Gateway público: $GATEWAY_URL"
log "Usá esta URL como API_BASE_URL en mobile/admin."
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
