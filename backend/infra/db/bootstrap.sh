#!/bin/sh
# Cloud Run Job `g3-db-bootstrap`: aplica init-schemas.sql (schemas, roles
# g3_<svc> y g3_<svc>_migrator, permisos, auth.audit_log append-only) contra
# Cloud SQL por IP privada. Idempotente: primer despliegue, cada pipeline y
# cada rotación de contraseñas.
#
# Variables (las pone Terraform, módulo g3 › db_bootstrap_job):
#   PGHOST, PGPORT, PGDATABASE, PGUSER   conexión de administrador
#   PGPASSWORD                           Secret Manager: g3-db-admin-password
#   PGSSLMODE=require                    TLS obligatorio (Cloud SQL ENCRYPTED_ONLY)
#   G3_PW_<SVC>                          Secret Manager: g3-db-password-<svc>
#   G3_MPW_<SVC>                         Secret Manager: g3-db-migrator-password-<svc>
set -eu

SERVICES="auth billing drivers fleet trips alerts integrations invoicing"
[ -n "${PGHOST:-}" ] && [ -n "${PGPASSWORD:-}" ] || {
  echo '{"severity":"ERROR","message":"db-bootstrap: faltan PGHOST/PGPASSWORD"}'; exit 2; }

set --
for s in $SERVICES; do
  up=$(echo "$s" | tr '[:lower:]' '[:upper:]')
  eval "pw=\${G3_PW_$up:-}; mpw=\${G3_MPW_$up:-}"
  if [ -z "$pw" ] || [ -z "$mpw" ]; then
    echo "{\"severity\":\"ERROR\",\"message\":\"db-bootstrap: falta G3_PW_$up o G3_MPW_$up\"}"; exit 2
  fi
  set -- "$@" -v "pw_$s=$pw" -v "mpw_$s=$mpw"
done

echo '{"severity":"INFO","message":"db-bootstrap: aplicando init-schemas.sql"}'
psql -v ON_ERROR_STOP=1 -X -q "$@" -f /g3/init-schemas.sql
echo '{"severity":"INFO","message":"db-bootstrap: listo"}'
