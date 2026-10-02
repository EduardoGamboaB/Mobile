#!/bin/sh
# docker compose: corre init-schemas.sql al crear el volumen de Postgres
# (docker-entrypoint-initdb.d). Contraseña de DESARROLLO para todos los roles
# (g3_<svc> runtime y g3_<svc>_migrator). En GCP las genera Terraform y las
# aplica el job g3-db-bootstrap.
set -eu
PW="${G3_DEV_DB_PASSWORD:-g3dev}"
args=""
for s in auth billing drivers fleet trips alerts integrations invoicing; do
  args="$args -v pw_$s=$PW -v mpw_$s=$PW"
done
# shellcheck disable=SC2086
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" $args -f /g3/init-schemas.sql
