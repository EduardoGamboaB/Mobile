-- DB-per-service lógico: cada microservicio dueño de su schema en Postgres
-- compartido. Reduce costos en V1 sin perder el aislamiento de código.
-- En V2 se pueden migrar a instancias separadas sin tocar la lógica.

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS billing;
CREATE SCHEMA IF NOT EXISTS drivers;
CREATE SCHEMA IF NOT EXISTS fleet;
CREATE SCHEMA IF NOT EXISTS trips;
CREATE SCHEMA IF NOT EXISTS alerts;

-- Roles dedicados por servicio para que ninguno pueda leer tablas ajenas
DO $$
BEGIN
  FOR svc IN SELECT unnest(ARRAY['auth', 'billing', 'drivers', 'fleet', 'trips', 'alerts']) LOOP
    EXECUTE format('CREATE ROLE g3_%s_svc LOGIN PASSWORD %L', svc, 'change-me-in-secret-manager');
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO g3_%s_svc', svc, svc);
    EXECUTE format('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA %I TO g3_%s_svc', svc, svc);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON TABLES TO g3_%s_svc', svc, svc);
  END LOOP;
END $$;

-- Cada servicio corre sus propias migraciones al boot contra su schema.
