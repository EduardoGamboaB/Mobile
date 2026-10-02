# Imagen del Cloud Run Job `g3-db-bootstrap` (psql + init-schemas.sql).
#   docker build -f infra/db/Dockerfile -t <registry>/db-bootstrap:<tag> infra/db
FROM postgres:16-alpine
COPY init-schemas.sql /g3/init-schemas.sql
COPY --chmod=755 bootstrap.sh /g3/bootstrap.sh
USER postgres
ENTRYPOINT ["/g3/bootstrap.sh"]
