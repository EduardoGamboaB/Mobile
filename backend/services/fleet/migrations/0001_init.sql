-- fleet · modelo inicial (ver docs/data-model/fleet.md).
-- Se aplica con runMigrations en el schema del servicio (search_path = fleet).

-- ── Unidades ───────────────────────────────────────────────────────────────
CREATE TABLE tractors (
  id           text PRIMARY KEY,
  company_id   text NOT NULL,
  unit_number  text NOT NULL,
  plates       text NOT NULL,
  brand        text,
  model        text,
  year         integer,
  status       text NOT NULL DEFAULT 'available'
               CHECK (status IN ('available', 'in_trip', 'maintenance', 'inactive')),
  -- Respaldo de la última posición (compatibilidad con TractorDto); la fuente
  -- de verdad del mapa es vehicle_last_position.
  last_lat     double precision,
  last_lng     double precision,
  last_seen_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX tractors_company_idx ON tractors (company_id, created_at);

CREATE TABLE trailers (
  id            text PRIMARY KEY,
  company_id    text NOT NULL,
  unit_number   text NOT NULL,
  plates        text NOT NULL,
  type          text NOT NULL CHECK (type IN (
                  'jaula_42', 'caja_53', 'caja_48', 'refrigerado',
                  'tolva', 'tanque', 'plataforma', 'lowboy')),
  capacity_tons numeric(12,3),
  status        text NOT NULL DEFAULT 'available'
                CHECK (status IN ('available', 'in_trip', 'maintenance', 'inactive')),
  created_at    timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX trailers_company_idx ON trailers (company_id, created_at);

-- ── Dispositivos GPS ───────────────────────────────────────────────────────
CREATE TABLE devices (
  id           text PRIMARY KEY,
  company_id   text NOT NULL,
  provider     text NOT NULL CHECK (provider IN ('suntech', 'teltonika', 'queclink', 'generic')),
  -- IMEI / ID de equipo: ÚNICO GLOBAL a propósito (enruta la telemetría a una sola compañía).
  external_id  text NOT NULL CHECK (length(external_id) BETWEEN 1 AND 64),
  label        text,
  vehicle_id   text,
  vehicle_kind text CHECK (vehicle_kind IN ('tractor', 'trailer')),
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  last_seen_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT devices_external_id_uq UNIQUE (external_id),
  CONSTRAINT devices_vehicle_ck CHECK ((vehicle_id IS NULL) = (vehicle_kind IS NULL))
);
CREATE INDEX devices_company_idx ON devices (company_id, created_at);
CREATE INDEX devices_company_vehicle_idx ON devices (company_id, vehicle_id) WHERE vehicle_id IS NOT NULL;

-- ── Tokens de ingesta (webhook de proveedores) ─────────────────────────────
CREATE TABLE ingest_tokens (
  id         text PRIMARY KEY,
  company_id text NOT NULL,
  prefix     text NOT NULL,
  -- sha256(token) en hex: el secreto nunca se guarda.
  hash       text NOT NULL CHECK (hash ~ '^[0-9a-f]{64}$'),
  label      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT ingest_tokens_hash_uq UNIQUE (hash)
);
CREATE INDEX ingest_tokens_company_idx ON ingest_tokens (company_id, created_at);
-- La ingesta compara contra todos los vigentes.
CREATE INDEX ingest_tokens_active_idx ON ingest_tokens (created_at) WHERE revoked_at IS NULL;

-- IMEIs que reportaron sin estar registrados (onboarding).
CREATE TABLE unknown_devices (
  company_id    text NOT NULL,
  provider      text NOT NULL CHECK (provider IN ('suntech', 'teltonika', 'queclink', 'generic')),
  external_id   text NOT NULL,
  hits          integer NOT NULL DEFAULT 1 CHECK (hits > 0),
  first_seen_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_seen_at  timestamptz NOT NULL,
  PRIMARY KEY (company_id, provider, external_id)
);

-- ── Telemetría (alto volumen) ──────────────────────────────────────────────
-- Particionada por mes de recorded_at (hora GPS, límites en UTC). La PK
-- (device_id, recorded_at) es la llave de idempotencia de la ingesta
-- (INSERT … ON CONFLICT DO NOTHING) e incluye la llave de partición, como
-- exige Postgres. Sin FK a devices: borrar un equipo no toca su historial y
-- la ingesta no paga la verificación por fila.
CREATE TABLE telemetry_points (
  device_id      text NOT NULL,
  recorded_at    timestamptz NOT NULL,
  id             text NOT NULL,
  company_id     text NOT NULL,
  vehicle_id     text,
  vehicle_kind   text CHECK (vehicle_kind IN ('tractor', 'trailer')),
  provider       text NOT NULL,
  received_at    timestamptz NOT NULL,
  lat            double precision NOT NULL,
  lng            double precision NOT NULL,
  -- Lecturas de sensor: double precision (no se redondean como cantidades).
  speed_kph      double precision,
  heading_deg    double precision,
  ignition       boolean,
  odometer_km    double precision,
  fuel_level_pct double precision,
  event_code     text,
  raw            jsonb,
  PRIMARY KEY (device_id, recorded_at)
) PARTITION BY RANGE (recorded_at);

-- Recorrido de un vehículo y conteos (se crea en cada partición).
CREATE INDEX telemetry_points_vehicle_idx ON telemetry_points (company_id, vehicle_id, recorded_at DESC);

-- Última posición por vehículo: upsert solo si el punto es más nuevo.
CREATE TABLE vehicle_last_position (
  company_id     text NOT NULL,
  vehicle_id     text NOT NULL,
  vehicle_kind   text CHECK (vehicle_kind IN ('tractor', 'trailer')),
  device_id      text NOT NULL,
  point_id       text NOT NULL,
  provider       text NOT NULL,
  recorded_at    timestamptz NOT NULL,
  received_at    timestamptz NOT NULL,
  lat            double precision NOT NULL,
  lng            double precision NOT NULL,
  speed_kph      double precision,
  heading_deg    double precision,
  ignition       boolean,
  odometer_km    double precision,
  fuel_level_pct double precision,
  event_code     text,
  raw            jsonb,
  PRIMARY KEY (company_id, vehicle_id)
);

-- ── Particiones ────────────────────────────────────────────────────────────
-- `SET search_path FROM CURRENT` fija el schema del servicio (el de la
-- migración), así las funciones crean/borran particiones en su schema aunque
-- las llame otra sesión.

-- Crea (si no existe) la partición mensual que contiene `p_at` (mes UTC).
-- Advisory lock por schema: dos instancias que la piden a la vez no chocan.
CREATE FUNCTION telemetry_ensure_partition(p_at timestamptz) RETURNS text
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  v_schema text := current_schema();
  v_start  timestamp := date_trunc('month', p_at AT TIME ZONE 'UTC');
  v_end    timestamp := v_start + interval '1 month';
  v_name   text := 'telemetry_points_p' || to_char(v_start, 'YYYYMM');
BEGIN
  IF to_regclass(format('%I.%I', v_schema, v_name)) IS NOT NULL THEN
    RETURN v_name;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(v_schema || '.telemetry_points.partitions'));
  -- Otra sesión pudo crearla mientras esperábamos el lock (y la caché de
  -- catálogo de esta sentencia no siempre lo ve): "ya existe" no es error.
  BEGIN
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I.%I PARTITION OF %I.telemetry_points FOR VALUES FROM (%L) TO (%L)',
      v_schema, v_name, v_schema,
      to_char(v_start, 'YYYY-MM-DD') || ' 00:00:00+00',
      to_char(v_end, 'YYYY-MM-DD') || ' 00:00:00+00');
  EXCEPTION WHEN duplicate_table OR unique_violation THEN
    NULL;
  END;
  RETURN v_name;
END;
$$;

-- Crea las particiones de todos los meses entre p_from y p_to (inclusive).
CREATE FUNCTION telemetry_ensure_partitions(p_from timestamptz, p_to timestamptz) RETURNS integer
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  v_month timestamptz := date_trunc('month', p_from AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  v_n     integer := 0;
BEGIN
  WHILE v_month <= p_to LOOP
    PERFORM telemetry_ensure_partition(v_month);
    v_n := v_n + 1;
    v_month := ((v_month AT TIME ZONE 'UTC') + interval '1 month') AT TIME ZONE 'UTC';
  END LOOP;
  RETURN v_n;
END;
$$;

-- Retención: borra (DROP, sin VACUUM) las particiones cuyo mes terminó antes
-- del inicio del mes de `p_before` (UTC). Devuelve los nombres borrados.
CREATE FUNCTION telemetry_drop_partitions_before(p_before timestamptz) RETURNS SETOF text
LANGUAGE plpgsql
SET search_path FROM CURRENT
AS $$
DECLARE
  v_schema text := current_schema();
  v_cutoff text := to_char(date_trunc('month', p_before AT TIME ZONE 'UTC'), 'YYYYMM');
  r        record;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(v_schema || '.telemetry_points.partitions'));
  FOR r IN
    SELECT c.relname
      FROM pg_inherits i
      JOIN pg_class c ON c.oid = i.inhrelid
      JOIN pg_class p ON p.oid = i.inhparent
      JOIN pg_namespace n ON n.oid = p.relnamespace
     WHERE p.relname = 'telemetry_points' AND n.nspname = v_schema
       AND c.relname ~ '^telemetry_points_p[0-9]{6}$'
       AND substring(c.relname from '[0-9]{6}$') < v_cutoff
     ORDER BY c.relname
  LOOP
    EXECUTE format('DROP TABLE %I.%I', v_schema, r.relname);
    RETURN NEXT r.relname;
  END LOOP;
END;
$$;

-- Mes anterior, actual y 3 siguientes desde el primer despliegue; el
-- arranque del servicio y el job de mantenimiento mantienen la ventana.
SELECT telemetry_ensure_partitions(now() - interval '1 month', now() + interval '3 months');
