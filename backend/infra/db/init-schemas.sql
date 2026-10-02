-- ─────────────────────────────────────────────────────────────────────────────
-- G3 · schemas, roles y permisos de la base `g3` (Postgres 16 / Cloud SQL).
--
-- Una base y un schema por servicio. Cada servicio tiene DOS roles de login:
--
--   g3_<svc>_migrator  DUEÑO del schema y de todas sus tablas. Solo lo usan los
--                      jobs `migrate-<svc>` (y g3-fleet-maintenance, que crea y
--                      borra particiones). Aplica DDL.
--   g3_<svc>           rol de RUNTIME (Cloud Run). Solo USAGE del schema y DML
--                      (SELECT/INSERT/UPDATE/DELETE) sobre sus tablas, vía
--                      default privileges del migrator. No puede crear, alterar
--                      ni borrar objetos, ni otorgarse permisos.
--
-- Ningún rol puede usar el schema de otro servicio: los datos ajenos se piden
-- por API (docs/PERSISTENCE-CONVENTIONS.md).
--
-- auth.audit_log es append-only para el runtime: la migración de auth hace
-- `REVOKE UPDATE, DELETE, TRUNCATE … FROM g3_auth` (corre como
-- g3_auth_migrator) y este script lo vuelve a aplicar después de otorgar DML
-- (sección 6), así una re-ejecución nunca devuelve esos permisos.
--
-- IDEMPOTENTE: se corre en cada bootstrap y cada vez que se rotan las
-- contraseñas (ALTER ROLE … PASSWORD sincroniza con Secret Manager).
--
-- Se ejecuta con psql como administrador (`postgres` en Cloud SQL) con dos
-- contraseñas por servicio como variables de psql:
--
--   psql -v ON_ERROR_STOP=1 -v pw_auth=… -v mpw_auth=… … -f init-schemas.sql
--
--   · GCP: Cloud Run Job `g3-db-bootstrap` (infra/db/bootstrap.sh) con las
--     contraseñas de Secret Manager (las genera Terraform).
--   · docker compose: infra/db/dev-init.sh con la contraseña de desarrollo.
-- ─────────────────────────────────────────────────────────────────────────────

\set ON_ERROR_STOP on

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
\if :{?mpw_auth}
\else
  DO $$ BEGIN RAISE EXCEPTION 'Falta la variable de psql -v mpw_auth=...'; END $$;
\endif
\if :{?mpw_billing}
\else
  DO $$ BEGIN RAISE EXCEPTION 'Falta la variable de psql -v mpw_billing=...'; END $$;
\endif
\if :{?mpw_drivers}
\else
  DO $$ BEGIN RAISE EXCEPTION 'Falta la variable de psql -v mpw_drivers=...'; END $$;
\endif
\if :{?mpw_fleet}
\else
  DO $$ BEGIN RAISE EXCEPTION 'Falta la variable de psql -v mpw_fleet=...'; END $$;
\endif
\if :{?mpw_trips}
\else
  DO $$ BEGIN RAISE EXCEPTION 'Falta la variable de psql -v mpw_trips=...'; END $$;
\endif
\if :{?mpw_alerts}
\else
  DO $$ BEGIN RAISE EXCEPTION 'Falta la variable de psql -v mpw_alerts=...'; END $$;
\endif
\if :{?mpw_integrations}
\else
  DO $$ BEGIN RAISE EXCEPTION 'Falta la variable de psql -v mpw_integrations=...'; END $$;
\endif
\if :{?mpw_invoicing}
\else
  DO $$ BEGIN RAISE EXCEPTION 'Falta la variable de psql -v mpw_invoicing=...'; END $$;
\endif

-- Nadie crea objetos en `public` ni se conecta "por omisión".
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', current_database())
\gexec

CREATE TEMP TABLE _g3_svc (svc text PRIMARY KEY, pw text NOT NULL, mpw text NOT NULL);
INSERT INTO _g3_svc VALUES
  ('auth',         :'pw_auth',         :'mpw_auth'),
  ('billing',      :'pw_billing',      :'mpw_billing'),
  ('drivers',      :'pw_drivers',      :'mpw_drivers'),
  ('fleet',        :'pw_fleet',        :'mpw_fleet'),
  ('trips',        :'pw_trips',        :'mpw_trips'),
  ('alerts',       :'pw_alerts',       :'mpw_alerts'),
  ('integrations', :'pw_integrations', :'mpw_integrations'),
  ('invoicing',    :'pw_invoicing',    :'mpw_invoicing');

CREATE TEMP VIEW _g3_roles AS
  SELECT svc, 'g3_' || svc AS runtime, 'g3_' || svc || '_migrator' AS migrator, pw, mpw FROM _g3_svc;

-- 1. Roles de login (crear si faltan; siempre sincronizar contraseña).
SELECT format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION CONNECTION LIMIT 200', r)
FROM (SELECT runtime AS r FROM _g3_roles UNION ALL SELECT migrator FROM _g3_roles) x
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = x.r)
\gexec

SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', runtime, pw) FROM _g3_roles
\gexec
SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L CONNECTION LIMIT 10', migrator, mpw) FROM _g3_roles
\gexec

SELECT format('ALTER ROLE %I SET search_path = %I, public', r, svc)
FROM (SELECT svc, runtime AS r FROM _g3_roles UNION ALL SELECT svc, migrator FROM _g3_roles) x
\gexec
SELECT format('ALTER ROLE %I SET statement_timeout = %L', runtime, '15s') FROM _g3_roles
\gexec
SELECT format('ALTER ROLE %I SET idle_in_transaction_session_timeout = %L', runtime, '60s') FROM _g3_roles
\gexec

-- El administrador necesita poder actuar como cada rol para transferir
-- dueños (en Cloud SQL `postgres` no es superusuario; en PG16 quien crea un
-- rol tiene ADMIN OPTION y puede otorgárselo).
SELECT format('GRANT %I TO %I', r, current_user)
FROM (SELECT runtime AS r FROM _g3_roles UNION ALL SELECT migrator FROM _g3_roles) x
WHERE NOT pg_has_role(current_user, x.r, 'MEMBER')
\gexec

-- 2. Schemas: dueño = migrator.
SELECT format('CREATE SCHEMA IF NOT EXISTS %I AUTHORIZATION %I', svc, migrator) FROM _g3_roles
\gexec
SELECT format('ALTER SCHEMA %I OWNER TO %I', svc, migrator) FROM _g3_roles
\gexec
SELECT format('REVOKE ALL ON SCHEMA %I FROM PUBLIC', svc) FROM _g3_roles
\gexec

-- Instalaciones previas donde el rol de runtime era dueño de las tablas:
-- todo lo suyo pasa al migrator (no-op si no tiene nada).
SELECT format('REASSIGN OWNED BY %I TO %I', runtime, migrator) FROM _g3_roles
\gexec

-- 3. CONNECT para ambos y SIN CREATE ON DATABASE para ninguno: los schemas
--    los crea este script y runMigrations (@g3/platform) solo intenta
--    `CREATE SCHEMA` si no existe en pg_namespace. El migrator crea tablas
--    por ser dueño de su schema. Se revoca por si una versión anterior lo
--    otorgó.
SELECT format('GRANT CONNECT, TEMP ON DATABASE %I TO %I', current_database(), r)
FROM (SELECT runtime AS r FROM _g3_roles UNION ALL SELECT migrator FROM _g3_roles) x
\gexec
SELECT format('REVOKE CREATE ON DATABASE %I FROM %I', current_database(), r)
FROM (SELECT runtime AS r FROM _g3_roles UNION ALL SELECT migrator FROM _g3_roles) x
\gexec

-- 4. Runtime: USAGE del schema (sin CREATE) y DML en tablas/secuencias,
--    actuales y futuras (default privileges de lo que cree el migrator).
SELECT format('REVOKE CREATE ON SCHEMA %I FROM %I', svc, runtime) FROM _g3_roles
\gexec
SELECT format('GRANT USAGE ON SCHEMA %I TO %I', svc, runtime) FROM _g3_roles
\gexec
SELECT format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA %I TO %I', svc, runtime) FROM _g3_roles
\gexec
SELECT format('GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA %I TO %I', svc, runtime) FROM _g3_roles
\gexec
SELECT format('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA %I TO %I', svc, runtime) FROM _g3_roles
\gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
              migrator, svc, runtime) FROM _g3_roles
\gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO %I',
              migrator, svc, runtime) FROM _g3_roles
\gexec

-- 5. Ningún rol g3_* hereda cloudsqlsuperuser (Cloud SQL lo da a los usuarios
--    creados por la API; estos se crean por SQL, pero por si acaso).
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

-- 6. Bitácora append-only: el runtime de auth solo SELECT + INSERT en
--    auth.audit_log (la tabla es del migrator; además hay trigger que rechaza
--    UPDATE/DELETE). Se re-aplica aquí porque el GRANT de la sección 4 da DML
--    en todas las tablas.
DO $$
BEGIN
  IF to_regclass('auth.audit_log') IS NOT NULL THEN
    EXECUTE 'REVOKE UPDATE, DELETE, TRUNCATE ON auth.audit_log FROM g3_auth';
    RAISE NOTICE 'auth.audit_log: append-only para g3_auth';
  ELSE
    RAISE NOTICE 'auth.audit_log aún no existe (se crea en migrate-auth, que ya revoca)';
  END IF;
END $$;

-- 7. pgaudit (Cloud SQL con flag cloudsql.enable_pgaudit=on): DDL y cambios
--    de roles en Cloud Logging. En Postgres local no existe y se omite.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pgaudit')
     AND current_setting('cloudsql.enable_pgaudit', true) = 'on' THEN
    CREATE EXTENSION IF NOT EXISTS pgaudit;
  END IF;
END $$;

DROP VIEW _g3_roles;
DROP TABLE _g3_svc;
