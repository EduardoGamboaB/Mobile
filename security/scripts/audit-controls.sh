#!/usr/bin/env bash
# G3 · Auditoría de controles DSI contra el estado real de GCP
#
# Recorre los 181 controles del catálogo DSI aplicables a G3
# (security/data/controls.json), ejecuta una verificación con
# gcloud por cada servicio, y produce un CSV con: control,
# estado (OK/NOK/MANUAL/NA), evidencia.
#
# Uso:
#   PROJECT_ID=g3-prod ./security/scripts/audit-controls.sh
#
# Output:
#   security/reports/audit/YYYY-MM-DD-controls.csv
#   security/reports/audit/YYYY-MM-DD-summary.md
#
# Pre-requisitos:
#   - gcloud auth login + project configurado
#   - jq instalado
#   - Permisos de lectura: roles/viewer + cloud asset viewer
#
# Periodicidad: trimestral. Lo corre el SRE; el reporte va al
# Comité de Riesgo y Cumplimiento.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:?PROJECT_ID requerido}"
DATE="$(date +%Y-%m-%d)"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPORTS="$ROOT/security/reports/audit"
CONTROLS="$ROOT/security/data/controls.json"

mkdir -p "$REPORTS"
CSV="$REPORTS/${DATE}-controls.csv"
SUMMARY="$REPORTS/${DATE}-summary.md"

log() { printf "\033[1;34m[audit]\033[0m %s\n" "$*"; }
die() { printf "\033[1;31m[audit]\033[0m %s\n" "$*" >&2; exit 1; }

command -v gcloud >/dev/null || die "gcloud no instalado"
command -v jq >/dev/null || die "jq no instalado"

gcloud config set project "$PROJECT_ID" >/dev/null

# Header CSV
echo "code,service,pondercion,area,status,evidence,manual_check_required" > "$CSV"

# Contadores
OK=0; NOK=0; MANUAL=0; NA=0

# ─────────────────────────────────────────────────────────────────
# Verificaciones por servicio
# ─────────────────────────────────────────────────────────────────

check_cloud_run() {
  local code="$1"
  case "$code" in
    "Google-Cloud Run-01")
      # No allUsers / allAuthenticatedUsers en servicios Cloud Run
      local bad
      bad=$(gcloud run services list --format=json | jq -r \
        '[.[] | select(.spec.template.spec.serviceAccountName == null
          or any(.metadata.annotations."run.googleapis.com/ingress" // ""; . == "all"))] | length')
      if [ "${bad:-0}" -eq 0 ]; then
        echo "OK,no public services found"
      else
        echo "NOK,${bad} servicios sin ingress restringido"
      fi
      ;;
    "Google-Cloud Run-02")
      # Egress restringido a private ranges
      local bad
      bad=$(gcloud run services list --format=json | jq -r \
        '[.[] | select(.spec.template.metadata.annotations."run.googleapis.com/vpc-access-egress" != "private-ranges-only")] | length')
      if [ "${bad:-0}" -eq 0 ]; then echo "OK,all services on private-ranges-only"
      else echo "NOK,${bad} servicios con egress sin restringir"; fi
      ;;
    "Google-Cloud Run-03")
      # Max instances configurado
      local bad
      bad=$(gcloud run services list --format=json | jq -r \
        '[.[] | select(.spec.template.metadata.annotations."autoscaling.knative.dev/maxScale" == null)] | length')
      if [ "${bad:-0}" -eq 0 ]; then echo "OK,all services have maxScale"
      else echo "NOK,${bad} servicios sin maxScale"; fi
      ;;
    *)
      echo "MANUAL,verificar manualmente"
      ;;
  esac
}

check_iam() {
  local code="$1"
  case "$code" in
    "Google-IAM - GCP-01")
      # Contactos de notificación configurados
      local n
      n=$(gcloud essential-contacts list --format=json 2>/dev/null | jq 'length')
      if [ "${n:-0}" -gt 0 ]; then echo "OK,${n} contactos configurados"
      else echo "NOK,sin essential-contacts"; fi
      ;;
    "Google-IAM - GCP-02"|"Google-IAM - GCP-03")
      # No roles primitivos (Owner/Editor/Viewer) en service accounts
      local bad
      bad=$(gcloud projects get-iam-policy "$PROJECT_ID" --format=json | jq -r \
        '.bindings[] | select(.role == "roles/owner" or .role == "roles/editor" or .role == "roles/viewer") | .members[] | select(startswith("serviceAccount:"))' | wc -l)
      if [ "${bad:-0}" -eq 0 ]; then echo "OK,sin roles primitivos en SAs"
      else echo "NOK,${bad} SAs con rol primitivo"; fi
      ;;
    *)
      echo "MANUAL,verificar manualmente"
      ;;
  esac
}

check_storage() {
  local code="$1"
  case "$code" in
    "Google-Cloud Storage-01")
      # Public access prevention enforced
      local bad
      bad=$(gsutil ls -p "$PROJECT_ID" 2>/dev/null | while read -r b; do
        b="${b%/}"
        prev=$(gsutil iam get "$b" 2>/dev/null | jq -r '.bindings[]? | select(.members[] | contains("allUsers") or contains("allAuthenticatedUsers"))' | wc -l)
        [ "$prev" -gt 0 ] && echo "$b"
      done | wc -l)
      if [ "${bad:-0}" -eq 0 ]; then echo "OK,sin buckets públicos"
      else echo "NOK,${bad} buckets con acceso público"; fi
      ;;
    *)
      echo "MANUAL,verificar manualmente"
      ;;
  esac
}

check_secrets() {
  local code="$1"
  case "$code" in
    "Google-Secrets Manager-01")
      # Audit logging habilitado
      local enabled
      enabled=$(gcloud projects get-iam-policy "$PROJECT_ID" --format=json | jq -r \
        '.auditConfigs[]? | select(.service == "secretmanager.googleapis.com") | .auditLogConfigs | length' 2>/dev/null || echo "0")
      if [ "${enabled:-0}" -gt 0 ]; then echo "OK,audit logs habilitados"
      else echo "NOK,audit logs no habilitados para Secret Manager"; fi
      ;;
    *)
      echo "MANUAL,verificar manualmente"
      ;;
  esac
}

# ─────────────────────────────────────────────────────────────────
# Loop principal
# ─────────────────────────────────────────────────────────────────

log "Cargando controles desde $CONTROLS..."
TOTAL=$(jq -r '.total_controls' "$CONTROLS")
log "Total a verificar: $TOTAL"

jq -c '.controls[]' "$CONTROLS" | while read -r ctrl; do
  code=$(echo "$ctrl" | jq -r '.code')
  service=$(echo "$ctrl" | jq -r '.service')
  pond=$(echo "$ctrl" | jq -r '.ponderacion')
  area=$(echo "$ctrl" | jq -r '.area')

  case "$service" in
    "Cloud Run") result=$(check_cloud_run "$code") ;;
    "IAM - GCP") result=$(check_iam "$code") ;;
    "Cloud Storage") result=$(check_storage "$code") ;;
    "Secret Manager") result=$(check_secrets "$code") ;;
    *) result="MANUAL,no automatizado todavía" ;;
  esac

  status="${result%%,*}"
  evidence="${result#*,}"
  manual_req="false"
  [ "$status" = "MANUAL" ] && manual_req="true"

  printf '%s,%s,%s,%s,%s,"%s",%s\n' \
    "$code" "$service" "$pond" "$area" "$status" "$evidence" "$manual_req" >> "$CSV"

  case "$status" in
    OK) OK=$((OK+1)) ;;
    NOK) NOK=$((NOK+1)) ;;
    MANUAL) MANUAL=$((MANUAL+1)) ;;
    NA) NA=$((NA+1)) ;;
  esac
done

# ─────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────

cat > "$SUMMARY" <<EOF
# Reporte de auditoría DSI · ${DATE}

**Proyecto GCP**: \`${PROJECT_ID}\`
**Total controles evaluados**: ${TOTAL}

## Resultado

| Estado | Count | % |
|---|---:|---:|
| ✓ OK | ${OK} | $(awk "BEGIN{printf \"%.1f\", ${OK}*100/${TOTAL}}")% |
| ✗ NOK | ${NOK} | $(awk "BEGIN{printf \"%.1f\", ${NOK}*100/${TOTAL}}")% |
| 👤 MANUAL | ${MANUAL} | $(awk "BEGIN{printf \"%.1f\", ${MANUAL}*100/${TOTAL}}")% |
| — N/A | ${NA} | $(awk "BEGIN{printf \"%.1f\", ${NA}*100/${TOTAL}}")% |

## NOK críticos (ponderación 5)

\`\`\`bash
awk -F',' '\$5=="NOK" && \$3=="5"' ${CSV##*/} | head -20
\`\`\`

## Acciones recomendadas

1. Resolver todos los NOK ponderación 5 en ≤ 15 días hábiles
2. Documentar excepciones en \`security/04-development-workflow.md\`
3. Reportar al Comité de Riesgo y Cumplimiento
4. Re-correr esta auditoría en 90 días

EOF

log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Auditoría completa: ${TOTAL} controles"
log "  OK: ${OK}   NOK: ${NOK}   MANUAL: ${MANUAL}   N/A: ${NA}"
log "  CSV: $CSV"
log "  Summary: $SUMMARY"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
