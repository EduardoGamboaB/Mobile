-- ─────────────────────────────────────────────────────────────────────────────
-- G3 · schemas, roles y permisos de la base `g3` (Postgres 16 / Cloud SQL).
--
-- Una base, un schema por servicio y un rol de login por servicio
-- (`g3_<svc>`) que solo puede usar SU schema. Ningún servicio lee tablas de
-- otro: los datos ajenos se piden por API (docs/PERSISTENCE-CONVENTIONS.md).
--
-- Es IDEMPOTENTE: se corre en cada bootstrap y cada vez que se rotan las
-- contraseñas (ALTER ROLE … PASSWORD sincroniza con Secret Manager).
--
-- Se ejecuta con psql como el usuario administrador (`postgres` en Cloud SQL,
-- miembro de cloudsqlsuperuser) y recibe una contraseña por servicio como
-- variable de psql:
--
--   psql -v ON_ERROR_STOP=1 -v pw_auth=… -v pw_billing=… … -f init-schemas.sql
--
--   · Producción/staging: lo corre el Cloud Run Job `g3-db-bootstrap`
--     (infra/db/bootstrap.sh) con las contraseñas montadas desde Secret
--     Manager. Terraform genera las contraseñas; nadie las teclea.
--   · docker compose: infra/db/dev-init.sh pasa la contraseña de desarrollo.
--
-- Las tablas las crea cada servicio con sus migraciones
-- (`services/<x>/migrations/NNNN_*.sql`, Cloud Run Job `migrate-<svc>`), que
-- corren con el propio rol `g3_<svc>`: el rol es dueño de sus tablas.
-- ─────────────────────────────────────────────────────────────────────────────

\set ON_ERROR_STOP on

-- Sin contraseña para un servicio = error explícito (no roles sin password).
\if :{?pw_auth}
\else
  DO $$ BEGIN RAISE EXCEPTION 'Falta la variable de psql -v pw_auth=...'; END $$;
\endif
\if :{?pw_billing}
\else
  DO $$ BEGIN RAISE EXCEPTION 'Falta la variable de psql -v pw_billing=...'; END $$;
\endif
\if :{?pw_drivers}
\else
  DO $$ BEGIN RAISE EXCEPTION 'Falta la variable de psql -v pw_drivers=...'; END $$;
\endif
\if :{?pw_fleet}
\else
  DO $$ BEGIN RAISE EXCEPTION 'Falta la variable de psql -v pw_fleet=...'; END $$;
\endif
\if :{?pw_trips}
\else
  DO $$ BEGIN RAISE EXCEPTION 'Falta la variable de psql -v pw_trips=...'; END $$;
\endif
\if :{?pw_alerts}
\else
  DO $$ BEGIN RAISE EXCEPTION 'Falta la variable de psql -v pw_alerts=...'; END $$;
\endif
\if :{?pw_integrations}
\else
  DO $$ BEGIN RAISE EXCEPTION 'Falta la variable de psql -v pw_integrations=...'; END $$;
\endif
\if :{?pw_invoicing}
\else
  DO $$ BEGIN RAISE EXCEPTION 'Falta la variable de psql -v pw_invoicing=...'; END $$;
\endif

-- Nadie crea objetos en `public` ni se conecta "por omisión".
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', current_database())
\gexec

CREATE TEMP TABLE _g3_svc (svc text PRIMARY KEY, pw text NOT NULL);
INSERT INTO _g3_svc VALUES
  ('auth',         :'pw_auth'),
  ('billing',      :'pw_billing'),
  ('drivers',      :'pw_drivers'),
  ('fleet',        :'pw_fleet'),
  ('trips',        :'pw_trips'),
  ('alerts',       :'pw_alerts'),
  ('integrations', :'pw_integrations'),
  ('invoicing',    :'pw_invoicing');

-- 1. Roles de login (crear si faltan; siempre sincronizar contraseña).
SELECT format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION CONNECTION LIMIT %s',
              'g3_' || svc, 100)
FROM _g3_svc
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'g3_' || svc)
\gexec

SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', 'g3_' || svc, pw) FROM _g3_svc
\gexec

-- search_path por rol (además del que fija el pool de @g3/platform).
SELECT format('ALTER ROLE %I SET search_path = %I, public', 'g3_' || svc, svc) FROM _g3_svc
\gexec
SELECT format('ALTER ROLE %I SET statement_timeout = %L', 'g3_' || svc, '15s') FROM _g3_svc
\gexec
SELECT format('ALTER ROLE %I SET idle_in_transaction_session_timeout = %L', 'g3_' || svc, '60s') FROM _g3_svc
\gexec

-- 2. Schemas (dueño: el administrador) y permisos SOLO sobre el propio.
SELECT format('CREATE SCHEMA IF NOT EXISTS %I', svc) FROM _g3_svc
\gexec
SELECT format('REVOKE ALL ON SCHEMA %I FROM PUBLIC', svc) FROM _g3_svc
\gexec
SELECT format('GRANT USAGE, CREATE ON SCHEMA %I TO %I', svc, 'g3_' || svc) FROM _g3_svc
\gexec
-- Tablas que ya existieran (p. ej. creadas por el admin en una restauración).
SELECT format('GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA %I TO %I',
              svc, 'g3_' || svc) FROM _g3_svc
\gexec
SELECT format('GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA %I TO %I', svc, 'g3_' || svc) FROM _g3_svc
\gexec

-- 3. CONNECT a la base y TEMP para cada rol. SIN CREATE ON DATABASE: el
--    schema lo crea este script y runMigrations (@g3/platform) solo intenta
--    `CREATE SCHEMA` si no existe en pg_namespace. Se revoca explícitamente
--    por si una versión anterior de este script lo otorgó.
SELECT format('GRANT CONNECT, TEMP ON DATABASE %I TO %I', current_database(), 'g3_' || svc) FROM _g3_svc
\gexec
SELECT format('REVOKE CREATE ON DATABASE %I FROM %I', current_database(), 'g3_' || svc) FROM _g3_svc
\gexec

-- 4. Los roles de servicio NO deben heredar cloudsqlsuperuser (Cloud SQL lo
--    da a los usuarios creados por la API; estos se crean por SQL, pero si
--    alguien los creó con `gcloud sql users create`, se les quita aquí).
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cloudsqlsuperuser') THEN
    FOR r IN
      SELECT m.rolname FROM pg_auth_members am
      JOIN pg_roles m ON m.oid = am.member
      JOIN pg_roles g ON g.oid = am.roleid
      WHERE g.rolname = 'cloudsqlsuperuser' AND m.rolname LIKE 'g3\_%'
    LOOP
      EXECUTE format('REVOKE cloudsqlsuperuser FROM %I', r.rolname);
    END LOOP;
  END IF;
END $$;

-- 4b. pgaudit (Cloud SQL con flag cloudsql.enable_pgaudit=on): registra DDL y
--     cambios de roles en Cloud Logging. En Postgres local no existe y se omite.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pgaudit')
     AND current_setting('cloudsql.enable_pgaudit', true) = 'on' THEN
    CREATE EXTENSION IF NOT EXISTS pgaudit;
  END IF;
END $$;

-- 5. Bitácora de auditoría append-only (auth.audit_log).
--    La tabla la crea la migración de auth, así que su dueño es g3_auth y un
--    REVOKE al dueño no es suficiente (el dueño puede volver a otorgarse
--    permisos). Por eso, cuando la tabla existe, se transfiere a un rol sin
--    login (`g3_audit_owner`) y g3_auth queda solo con SELECT + INSERT:
--    nadie desde la app puede hacer UPDATE/DELETE/TRUNCATE.
--    Consecuencia: una migración futura de auth que altere audit_log debe
--    correrse con el admin (ver docs/ops/RUNBOOK.md › Migraciones). Este
--    bloque se re-ejecuta tras cada migración de auth (bootstrap idempotente).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'g3_audit_owner') THEN
    CREATE ROLE g3_audit_owner NOLOGIN;
  END IF;
  IF to_regclass('auth.audit_log') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE auth.audit_log OWNER TO g3_audit_owner';
    EXECUTE 'REVOKE ALL ON auth.audit_log FROM g3_auth';
    EXECUTE 'GRANT SELECT, INSERT ON auth.audit_log TO g3_auth';
    RAISE NOTICE 'auth.audit_log: append-only para g3_auth (sin UPDATE/DELETE/TRUNCATE)';
  ELSE
    RAISE NOTICE 'auth.audit_log aún no existe: re-ejecutar tras migrar auth';
  END IF;
END $$;

DROP TABLE _g3_svc;
