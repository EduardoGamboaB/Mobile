#!/bin/sh
# docker compose: corre init-schemas.sql al crear el volumen de Postgres
# (docker-entrypoint-initdb.d). Contraseña de DESARROLLO para todos los
# roles g3_<svc>; en GCP las genera Terraform y las aplica g3-db-bootstrap.
set -eu
PW="${G3_DEV_DB_PASSWORD:-g3dev}"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v pw_auth="$PW" -v pw_billing="$PW" -v pw_drivers="$PW" -v pw_fleet="$PW" \
  -v pw_trips="$PW" -v pw_alerts="$PW" -v pw_integrations="$PW" -v pw_invoicing="$PW" \
  -f /g3/init-schemas.sql
