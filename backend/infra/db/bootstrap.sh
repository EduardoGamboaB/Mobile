#!/bin/sh
# Cloud Run Job `g3-db-bootstrap`: aplica init-schemas.sql (schemas, roles
# g3_<svc>, permisos, auth.audit_log append-only) contra Cloud SQL por IP
# privada. Idempotente: se corre en el primer despliegue, después de migrar
# auth (para endurecer audit_log) y cada vez que se rotan contraseñas.
#
# Variables (las pone Terraform, módulo g3 › db-bootstrap):
#   PGHOST, PGPORT, PGDATABASE, PGUSER   conexión de administrador
#   PGPASSWORD                           Secret Manager: g3-db-admin-password
#   PGSSLMODE=require                    TLS obligatorio (Cloud SQL ENCRYPTED_ONLY)
#   G3_PW_<SVC>                          Secret Manager: g3-db-password-<svc>
set -eu

for v in PGHOST PGPASSWORD G3_PW_AUTH G3_PW_BILLING G3_PW_DRIVERS G3_PW_FLEET G3_PW_TRIPS \
         G3_PW_ALERTS G3_PW_INTEGRATIONS G3_PW_INVOICING; do
  eval "val=\${$v:-}"
  [ -n "$val" ] || { echo "{\"severity\":\"ERROR\",\"message\":\"db-bootstrap: falta $v\"}"; exit 2; }
done

echo '{"severity":"INFO","message":"db-bootstrap: aplicando init-schemas.sql"}'
psql -v ON_ERROR_STOP=1 -X -q \
  -v pw_auth="$G3_PW_AUTH" -v pw_billing="$G3_PW_BILLING" -v pw_drivers="$G3_PW_DRIVERS" \
  -v pw_fleet="$G3_PW_FLEET" -v pw_trips="$G3_PW_TRIPS" -v pw_alerts="$G3_PW_ALERTS" \
  -v pw_integrations="$G3_PW_INTEGRATIONS" -v pw_invoicing="$G3_PW_INVOICING" \
  -f /g3/init-schemas.sql
echo '{"severity":"INFO","message":"db-bootstrap: listo"}'
