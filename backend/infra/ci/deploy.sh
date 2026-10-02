#!/usr/bin/env bash
# G3 backend — despliegue MANUAL de respaldo (el principal es Cloud Build:
# backend/infra/ci/cloudbuild.yaml). Mismo orden que el pipeline:
# build → push → g3-db-bootstrap → migrate-<svc> → deploy (internos, gateway)
# → smoke test de /health y /ready vía el gateway → rollback si falla.
#
# La infraestructura y la configuración de Cloud Run (cuentas de servicio,
# red, secretos, escalado) las crea Terraform (infra/terraform, ver
# docs/ops/DEPLOY.md). Este script SOLO cambia imágenes.
#
# Uso:
#   PROJECT_ID=g3-staging API_DOMAIN=api.staging.g3logistics.mx ./infra/ci/deploy.sh
#
# Variables: REGION (us-central1), TAG (git short SHA), SKIP_BUILD=1 (reusar
# imágenes ya subidas con ese TAG).

set -euo pipefail

PROJECT_ID="${PROJECT_ID:?PROJECT_ID requerido}"
API_DOMAIN="${API_DOMAIN:?API_DOMAIN requerido (p. ej. api.g3logistics.mx)}"
REGION="${REGION:-us-central1}"
REGISTRY="${REGISTRY:-${REGION}-docker.pkg.dev/${PROJECT_ID}/g3}"
TAG="${TAG:-$(git rev-parse --short HEAD)}"

SERVICES=(integrations auth billing drivers fleet trips alerts ai)
MIGRATE=(auth billing drivers fleet trips alerts integrations invoicing)
JOB_ONLY=(invoicing)

BACKEND_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$BACKEND_ROOT"

log() { printf "\033[1;34m[deploy]\033[0m %s\n" "$*"; }
die() { printf "\033[1;31m[deploy]\033[0m %s\n" "$*" >&2; exit 1; }

command -v gcloud >/dev/null || die "gcloud no está instalado"
gcloud config set project "$PROJECT_ID" >/dev/null
if [[ -n "$(git status --porcelain)" ]]; then log "AVISO: hay cambios sin commit; el tag $TAG no los describe."; fi

log "Proyecto $PROJECT_ID · región $REGION · tag $TAG"

if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  command -v docker >/dev/null || die "docker no está instalado"
  gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
  log "Build…"
  export DOCKER_BUILDKIT=1
  docker build -q -f infra/docker/service.Dockerfile --build-arg SERVICE=gateway --build-arg GIT_SHA="$TAG" \
    -t "$REGISTRY/gateway:$TAG" . >/dev/null
  for s in "${SERVICES[@]}" "${JOB_ONLY[@]}"; do
    docker build -q -f infra/docker/service.Dockerfile --build-arg "SERVICE=services/$s" --build-arg GIT_SHA="$TAG" \
      -t "$REGISTRY/$s:$TAG" . >/dev/null
    log "  ✓ $s"
  done
  docker build -q -f infra/db/Dockerfile -t "$REGISTRY/db-bootstrap:$TAG" infra/db >/dev/null
  log "Push…"
  for s in gateway "${SERVICES[@]}" "${JOB_ONLY[@]}" db-bootstrap; do docker push -q "$REGISTRY/$s:$TAG" >/dev/null; done
fi

log "Bootstrap de la base (roles y permisos)…"
gcloud run jobs update g3-db-bootstrap --region="$REGION" --image="$REGISTRY/db-bootstrap:$TAG" --quiet
gcloud run jobs execute g3-db-bootstrap --region="$REGION" --wait

log "Migraciones (si una falla, no se despliega nada)…"
for s in "${MIGRATE[@]}"; do
  [[ -f "services/$s/src/migrate.ts" ]] || { log "  · $s sin migrate.ts (se omite)"; continue; }
  gcloud run jobs update "migrate-$s" --region="$REGION" --image="$REGISTRY/$s:$TAG" --quiet
  gcloud run jobs execute "migrate-$s" --region="$REGION" --wait
  log "  ✓ migrate-$s"
done
gcloud run jobs update g3-fleet-maintenance --region="$REGION" --image="$REGISTRY/fleet:$TAG" --quiet
gcloud run jobs execute g3-db-bootstrap --region="$REGION" --wait # audit_log append-only

log "Deploy…"
declare -A PREV
for s in "${SERVICES[@]}" gateway; do
  PREV[$s]="$(gcloud run services describe "g3-$s" --region="$REGION" --format='value(status.traffic[0].revisionName)' 2>/dev/null || true)"
  gcloud run deploy "g3-$s" --region="$REGION" --image="$REGISTRY/$s:$TAG" --update-labels="commit-sha=$TAG" --quiet
  gcloud run services update-traffic "g3-$s" --region="$REGION" --to-latest --quiet
  log "  ✓ g3-$s (antes: ${PREV[$s]:-ninguna})"
done

log "Smoke test https://${API_DOMAIN}/{health,ready}…"
for i in $(seq 1 12); do
  if curl -fsS --max-time 10 "https://${API_DOMAIN}/health" >/dev/null && curl -fsS --max-time 10 "https://${API_DOMAIN}/ready" >/dev/null; then
    log "✓ Deploy completo ($TAG)"
    exit 0
  fi
  sleep 10
done

log "Smoke test FALLÓ: rollback de tráfico"
for s in "${!PREV[@]}"; do
  [[ -n "${PREV[$s]}" ]] && gcloud run services update-traffic "g3-$s" --region="$REGION" --to-revisions="${PREV[$s]}=100" --quiet || true
done
die "Deploy revertido (las migraciones NO se revierten: deben ser compatibles hacia atrás)."
