-- trips · modelo inicial (ver docs/data-model/trips.md).
-- Se aplica con runMigrations en el schema del servicio (search_path = trips).

-- ── Viajes ─────────────────────────────────────────────────────────────────
CREATE TABLE trips (
  id                  text PRIMARY KEY,
  company_id          text NOT NULL,
  folio               text NOT NULL,
  -- Vocabulario ÚNICO: idéntico a TRIP_STATUSES de contracts/src/trip-status.ts.
  status              text NOT NULL CHECK (status IN (
                        'draft', 'scheduled', 'loading', 'in_transit',
                        'unloading', 'pre_closed', 'closed', 'cancelled')),
  driver_id           text,
  tractor_id          text,
  trailer_id          text,
  client_name         text,
  cargo               text,
  origin              text NOT NULL,
  destination         text NOT NULL,
  scheduled_at        timestamptz,
  estimated_unload_at timestamptz,
  tons                numeric(12,3),
  price_per_ton       numeric(14,2),
  freight_amount      numeric(14,2),
  driver_commission   numeric(14,2),
  estimated_tolls     numeric(14,2),
  estimated_diesel    numeric(14,2),
  notes               text,
  started_at          timestamptz,
  pre_closed_at       timestamptz,
  closed_at           timestamptz,
  cancelled_at        timestamptz,
  -- TripPaymentStatus: el pago NO es un estado del viaje.
  payment_status      text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'released')),
  payment_released_at timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trips_company_id_uq UNIQUE (company_id, id),
  CONSTRAINT trips_folio_uq UNIQUE (company_id, folio)
);

-- Listados por estado (torre de control) y por chofer (G3 Drive).
CREATE INDEX trips_company_status_idx ON trips (company_id, status, updated_at DESC);
CREATE INDEX trips_company_driver_idx ON trips (company_id, driver_id, status) WHERE driver_id IS NOT NULL;
-- Reporte de rentabilidad / periodos: fecha de referencia = scheduled ?? started ?? created.
CREATE INDEX trips_company_refdate_idx ON trips (company_id, (COALESCE(scheduled_at, started_at, created_at)) DESC);
CREATE INDEX trips_company_tractor_refdate_idx
  ON trips (company_id, tractor_id, (COALESCE(scheduled_at, started_at, created_at)) DESC)
  WHERE tractor_id IS NOT NULL;
-- Viaje activo por vehículo (fleet → alerts).
CREATE INDEX trips_active_tractor_idx ON trips (company_id, tractor_id)
  WHERE status IN ('scheduled', 'loading', 'in_transit', 'unloading', 'pre_closed') AND tractor_id IS NOT NULL;
CREATE INDEX trips_active_trailer_idx ON trips (company_id, trailer_id)
  WHERE status IN ('scheduled', 'loading', 'in_transit', 'unloading', 'pre_closed') AND trailer_id IS NOT NULL;

-- Consecutivo de folio por compañía y año: INSERT … ON CONFLICT DO UPDATE …
-- RETURNING bloquea la fila del contador, así dos altas simultáneas nunca
-- reciben el mismo número (nada de count(*) + 1).
CREATE TABLE trip_folio_counters (
  company_id text NOT NULL,
  year       integer NOT NULL CHECK (year BETWEEN 2000 AND 9999),
  last_value integer NOT NULL CHECK (last_value > 0),
  PRIMARY KEY (company_id, year)
);

-- ── Bitácora (G3 Drive, cola offline) ──────────────────────────────────────
CREATE TABLE logbook_entries (
  id                  text PRIMARY KEY,
  company_id          text NOT NULL,
  client_uuid         text NOT NULL,
  trip_id             text NOT NULL,
  driver_id           text NOT NULL,
  -- LOGBOOK_EVENTS de contracts/src/dtos/operations.ts.
  event_type          text NOT NULL CHECK (event_type IN (
                        'departure', 'loading', 'stop', 'toll', 'diesel',
                        'incident', 'arrival', 'unloading', 'closing')),
  occurred_at         timestamptz NOT NULL,
  location_text       text,
  lat                 double precision,
  lng                 double precision,
  odometer_km         numeric(12,3),
  fuel                text CHECK (fuel IN ('full', 'three_quarters', 'half', 'quarter', 'empty')),
  expense_amount      numeric(14,2) CHECK (expense_amount >= 0),
  expense_concept     text,
  expense_has_receipt boolean NOT NULL DEFAULT false,
  comments            text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT logbook_client_uuid_uq UNIQUE (company_id, client_uuid),
  CONSTRAINT logbook_trip_fk FOREIGN KEY (company_id, trip_id) REFERENCES trips (company_id, id)
);
-- Bitácora de un viaje y de varios viajes (reporte de rentabilidad: trip_id = ANY($2)).
CREATE INDEX logbook_company_trip_idx ON logbook_entries (company_id, trip_id, occurred_at);

-- ── Evidencias (archivos en Cloud Storage) ─────────────────────────────────
CREATE TABLE evidences (
  id           text PRIMARY KEY,
  company_id   text NOT NULL,
  client_uuid  text NOT NULL,
  trip_id      text,
  -- Sin FK: la cola offline puede subir la evidencia antes que su asiento/incidente.
  logbook_id   text,
  incident_id  text,
  driver_id    text NOT NULL,
  type         text NOT NULL CHECK (type IN (
                 'bill_of_lading', 'scale_ticket', 'loading_photo', 'unloading_photo',
                 'diesel_ticket', 'toll_ticket', 'delivery_proof', 'incident_photo', 'other')),
  storage_path text NOT NULL,
  mime_type    text,
  size_bytes   bigint CHECK (size_bytes >= 0),
  lat          double precision,
  lng          double precision,
  taken_at     timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidences_client_uuid_uq UNIQUE (company_id, client_uuid),
  CONSTRAINT evidences_trip_fk FOREIGN KEY (company_id, trip_id) REFERENCES trips (company_id, id)
);
CREATE INDEX evidences_company_trip_idx ON evidences (company_id, trip_id, created_at DESC);

-- ── Política de gastos (una por compañía) ──────────────────────────────────
CREATE TABLE expense_policies (
  company_id           text PRIMARY KEY,
  allow_manual_expense boolean NOT NULL,
  manual_max_amount    numeric(14,2) CHECK (manual_max_amount >= 0),
  require_receipt      boolean NOT NULL,
  updated_at           timestamptz NOT NULL DEFAULT now()
);
