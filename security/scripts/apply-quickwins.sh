#!/usr/bin/env bash
# G3 · Aplica los 8 quick wins de seguridad detectados en la auditoría
# inicial del catálogo DSI.
#
# Cada quick win es idempotente — corre las veces que quieras, solo
# aplica si falta el control.
#
# Uso:
#   PROJECT_ID=g3-prod REGION=us-central1 \
#     ./security/scripts/apply-quickwins.sh
#
# Modo dry-run (solo muestra qué haría):
#   DRY_RUN=true PROJECT_ID=g3-prod ./security/scripts/apply-quickwins.sh
#
# Pre-requisitos:
#   - gcloud auth login con rol roles/owner o roles/security-admin
#   - APIs habilitadas (cloudkms, secretmanager, compute, run, sql)

set -euo pipefail

PROJECT_ID="${PROJECT_ID:?PROJECT_ID requerido}"
REGION="${REGION:-us-central1}"
DRY_RUN="${DRY_RUN:-false}"

log()  { printf "\033[1;34m[quickwin]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[quickwin]\033[0m %s\n" "$*"; }
die()  { printf "\033[1;31m[quickwin]\033[0m %s\n" "$*" >&2; exit 1; }

run() {
  if [ "$DRY_RUN" = "true" ]; then
    echo "  DRY-RUN: $*"
  else
    eval "$@"
  fi
}

command -v gcloud >/dev/null || die "gcloud no instalado"
gcloud config set project "$PROJECT_ID" >/dev/null

log "Proyecto: $PROJECT_ID · región: $REGION · dry-run: $DRY_RUN"

# ─────────────────────────────────────────────────────────────────
# QW-01 · Cloud Audit Logs en todos los servicios sensibles
# Controles afectados: Google-Secrets Manager-01, Google-IAM-*,
#                      Google-Cloud Run-*, Google-Vertex AI-*
# ─────────────────────────────────────────────────────────────────
log "QW-01 · Habilitando Cloud Audit Logs en servicios críticos"

cat > /tmp/audit-policy.yaml <<EOF
auditConfigs:
  - service: secretmanager.googleapis.com
    auditLogConfigs:
      - logType: DATA_READ
      - logType: DATA_WRITE
      - logType: ADMIN_READ
  - service: iam.googleapis.com
    auditLogConfigs:
      - logType: DATA_READ
      - logType: DATA_WRITE
      - logType: ADMIN_READ
  - service: run.googleapis.com
    auditLogConfigs:
      - logType: DATA_READ
      - logType: DATA_WRITE
      - logType: ADMIN_READ
  - service: aiplatform.googleapis.com
    auditLogConfigs:
      - logType: DATA_READ
      - logType: DATA_WRITE
      - logType: ADMIN_READ
  - service: storage.googleapis.com
    auditLogConfigs:
      - logType: DATA_READ
      - logType: DATA_WRITE
      - logType: ADMIN_READ
  - service: sqladmin.googleapis.com
    auditLogConfigs:
      - logType: DATA_READ
      - logType: DATA_WRITE
      - logType: ADMIN_READ
EOF

if [ "$DRY_RUN" = "false" ]; then
  # Merge audit configs (gcloud no soporta append directo, hay que rebuild)
  TMP_POLICY=$(mktemp)
  gcloud projects get-iam-policy "$PROJECT_ID" --format=json > "$TMP_POLICY"
  # Si no hay auditConfigs, agregar; si hay, hacer set explícito
  warn "Habilitar auditConfigs requiere edición manual de IAM policy."
  warn "  Ver: gcloud projects set-iam-policy $PROJECT_ID /tmp/audit-policy.yaml"
  warn "  Recomendado: aplica vía Terraform/IaC, no a mano (drift)."
else
  echo "  DRY-RUN: habilitaría Audit Logs en: secretmanager, iam, run, aiplatform, storage, sqladmin"
fi

# ─────────────────────────────────────────────────────────────────
# QW-02 · Eliminar roles primitivos (Owner/Editor/Viewer) en SAs
# ─────────────────────────────────────────────────────────────────
log "QW-02 · Detectando service accounts con roles primitivos"

BAD_SAS=$(gcloud projects get-iam-policy "$PROJECT_ID" --format=json 2>/dev/null \
  | jq -r '.bindings[] | select(.role | test("^roles/(owner|editor|viewer)$"))
           | .members[] | select(startswith("serviceAccount:"))' | sort -u || echo "")

if [ -z "$BAD_SAS" ]; then
  log "  ✓ Sin service accounts con roles primitivos"
else
  warn "  Service accounts con rol primitivo detectados:"
  echo "$BAD_SAS" | sed 's/^/    · /'
  warn "  No los removemos automáticamente — requiere análisis caso por caso."
  warn "  Asignar role específico antes de revocar el primitivo."
fi

# ─────────────────────────────────────────────────────────────────
# QW-03 · Public access prevention en Cloud Storage
# Control: Google-Cloud Storage-01
# ─────────────────────────────────────────────────────────────────
log "QW-03 · Public access prevention en buckets"

BUCKETS=$(gsutil ls -p "$PROJECT_ID" 2>/dev/null | sed 's/gs:\/\///;s/\/$//' || echo "")

if [ -z "$BUCKETS" ]; then
  warn "  Sin buckets en el proyecto"
else
  for b in $BUCKETS; do
    log "  Procesando $b..."
    run "gsutil pap set enforced gs://${b}"
    run "gsutil ubla set on gs://${b}"
  done
  log "  ✓ Public access prevention enforced en todos los buckets"
fi

# ─────────────────────────────────────────────────────────────────
# QW-04 · KMS keyring para CMEK
# Habilitamos KMS y creamos keyring + keys para SQL y Storage
# ─────────────────────────────────────────────────────────────────
log "QW-04 · KMS keyring + keys para CMEK (Cloud SQL + Storage)"

run "gcloud services enable cloudkms.googleapis.com --project=$PROJECT_ID"

KEYRING="g3-prod-keyring"
if ! gcloud kms keyrings describe "$KEYRING" --location="$REGION" >/dev/null 2>&1; then
  run "gcloud kms keyrings create $KEYRING --location=$REGION"
else
  log "  · keyring $KEYRING ya existe"
fi

for key in sql-data storage-data; do
  if ! gcloud kms keys describe "$key" --keyring="$KEYRING" --location="$REGION" >/dev/null 2>&1; then
    run "gcloud kms keys create $key \
      --keyring=$KEYRING --location=$REGION \
      --purpose=encryption --rotation-period=90d --next-rotation=\$(date -u -d '+1 day' +%Y-%m-%dT%H:%M:%SZ)"
  else
    log "  · key $key ya existe"
  fi
done

warn "  CMEK requiere asignar la key al recurso (SQL instance / bucket) — manual:"
warn "    gcloud sql instances create XXX --disk-encryption-key=projects/$PROJECT_ID/locations/$REGION/keyRings/$KEYRING/cryptoKeys/sql-data"

# ─────────────────────────────────────────────────────────────────
# QW-05 · VPC Service Controls perimeter (skeleton)
# ─────────────────────────────────────────────────────────────────
log "QW-05 · VPC Service Controls"

warn "  VPC SC requiere Access Context Manager + organización (no solo proyecto)."
warn "  Configuración manual recomendada en consola:"
warn "    1. Crear access-policy en org"
warn "    2. Definir perimeter que incluya aiplatform.googleapis.com y sqladmin.googleapis.com"
warn "    3. Agregar el proyecto $PROJECT_ID al perimeter"
warn "  Docs: https://cloud.google.com/vpc-service-controls/docs/create-service-perimeters"

# ─────────────────────────────────────────────────────────────────
# QW-06 · Rotación automática de secretos (Secret Manager)
# ─────────────────────────────────────────────────────────────────
log "QW-06 · Rotación de secretos"

SECRETS=$(gcloud secrets list --format='value(name)' 2>/dev/null || echo "")
if [ -z "$SECRETS" ]; then
  warn "  Sin secretos en el proyecto"
else
  for s in $SECRETS; do
    NEXT=$(gcloud secrets describe "$s" --format='value(rotation.nextRotationTime)' 2>/dev/null || echo "")
    if [ -z "$NEXT" ]; then
      warn "  · $s — sin rotación configurada"
    else
      log "  · $s — próxima rotación: $NEXT"
    fi
  done
  warn "  Para configurar rotación (ejemplo 90 días):"
  warn "    gcloud secrets update SECRET --next-rotation-time=\$(date -u -d '+90 days' +%Y-%m-%dT%H:%M:%SZ) --rotation-period=7776000s"
  warn "  Requiere Pub/Sub topic + Cloud Function que rote el valor."
fi

# ─────────────────────────────────────────────────────────────────
# QW-07 · Cloud Armor delante del gateway público
# ─────────────────────────────────────────────────────────────────
log "QW-07 · Cloud Armor security policy"

POLICY="g3-gateway-armor"
if ! gcloud compute security-policies describe "$POLICY" >/dev/null 2>&1; then
  log "  · Creando $POLICY..."
  run "gcloud compute security-policies create $POLICY \
    --description='G3 gateway WAF + rate limit'"

  # OWASP Top 10 rules (preset CRS)
  run "gcloud compute security-policies rules create 1000 \
    --security-policy=$POLICY \
    --expression='evaluatePreconfiguredExpr(\"sqli-stable\")' \
    --action=deny-403 --description='Block SQLi'"

  run "gcloud compute security-policies rules create 1001 \
    --security-policy=$POLICY \
    --expression='evaluatePreconfiguredExpr(\"xss-stable\")' \
    --action=deny-403 --description='Block XSS'"

  run "gcloud compute security-policies rules create 1002 \
    --security-policy=$POLICY \
    --expression='evaluatePreconfiguredExpr(\"lfi-stable\")' \
    --action=deny-403 --description='Block LFI'"

  run "gcloud compute security-policies rules create 1003 \
    --security-policy=$POLICY \
    --expression='evaluatePreconfiguredExpr(\"rfi-stable\")' \
    --action=deny-403 --description='Block RFI'"

  run "gcloud compute security-policies rules create 1004 \
    --security-policy=$POLICY \
    --expression='evaluatePreconfiguredExpr(\"rce-stable\")' \
    --action=deny-403 --description='Block RCE'"

  # Rate limit: 100 req/min por IP
  run "gcloud compute security-policies rules create 2000 \
    --security-policy=$POLICY \
    --expression='true' \
    --action=rate-based-ban \
    --rate-limit-threshold-count=100 \
    --rate-limit-threshold-interval-sec=60 \
    --ban-duration-sec=600 \
    --conform-action=allow \
    --exceed-action=deny-429 \
    --enforce-on-key=IP"

  log "  ✓ Policy $POLICY creada con OWASP CRS + rate limit"
else
  log "  · Policy $POLICY ya existe"
fi

warn "  Para asignar al load balancer del gateway:"
warn "    gcloud compute backend-services update g3-gateway-backend \\"
warn "      --security-policy=$POLICY --global"

# ─────────────────────────────────────────────────────────────────
# QW-08 · Reducir allUsers / allAuthenticatedUsers en Cloud Run
# Control: Google-Cloud Run-01
# ─────────────────────────────────────────────────────────────────
log "QW-08 · Restringir invocadores en Cloud Run interno"

INTERNAL_SVCS="g3-auth g3-billing g3-drivers g3-fleet g3-trips g3-alerts g3-ai"

for svc in $INTERNAL_SVCS; do
  if gcloud run services describe "$svc" --region="$REGION" >/dev/null 2>&1; then
    # Remover public access
    POLICY=$(gcloud run services get-iam-policy "$svc" --region="$REGION" --format=json 2>/dev/null || echo "{}")
    HAS_PUBLIC=$(echo "$POLICY" | jq -r '.bindings[]? | select(.members[]? | (. == "allUsers" or . == "allAuthenticatedUsers")) | .role' | head -1)

    if [ -n "$HAS_PUBLIC" ]; then
      warn "  · $svc tiene rol público ($HAS_PUBLIC) — removiendo allUsers/allAuthenticatedUsers"
      run "gcloud run services remove-iam-policy-binding $svc --region=$REGION --member=allUsers --role=roles/run.invoker || true"
      run "gcloud run services remove-iam-policy-binding $svc --region=$REGION --member=allAuthenticatedUsers --role=roles/run.invoker || true"
    else
      log "  · $svc OK (no público)"
    fi
  else
    log "  · $svc no desplegado"
  fi
done

warn "  El gateway (g3-gateway) DEBE quedar público — es el único allow-unauthenticated."

# ─────────────────────────────────────────────────────────────────
# Resumen
# ─────────────────────────────────────────────────────────────────

log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Quick wins procesados:"
log "  QW-01 Cloud Audit Logs              (review manual)"
log "  QW-02 Roles primitivos en SAs       (detección + reporte)"
log "  QW-03 Public access prevention      (aplicado en buckets)"
log "  QW-04 KMS keyring + keys CMEK       (creados, asignación manual)"
log "  QW-05 VPC Service Controls          (skeleton, requiere org)"
log "  QW-06 Rotación de secretos          (detección + recomendación)"
log "  QW-07 Cloud Armor policy            (creada con OWASP CRS)"
log "  QW-08 Cloud Run sin público         (revocado allUsers en internos)"
log ""
log "Re-corre 'security/scripts/audit-controls.sh' para verificar deltas."
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
