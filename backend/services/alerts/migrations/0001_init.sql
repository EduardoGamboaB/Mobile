-- Servicio alerts: alertas simples, centro de incidentes, reglas de alerta,
-- contactos de notificación y estado de la regla device_offline.
-- Enums alineados con @g3/contracts (dtos/index.ts AlertDto, dtos/incidents.ts).

CREATE TABLE alerts (
  id          text PRIMARY KEY,
  company_id  text NOT NULL,
  level       text NOT NULL CHECK (level IN ('info', 'warning', 'critical')),
  type        text NOT NULL CHECK (type IN ('license_expiring', 'maintenance_due', 'sos', 'route_deviation', 'late_arrival', 'other')),
  message     text NOT NULL,
  resolved    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL,
  resolved_at timestamptz
);
CREATE INDEX alerts_company_idx ON alerts (company_id, resolved, created_at DESC);

-- Folio INC-{año}-{seq}: contador por compañía y año. Se incrementa con
-- INSERT … ON CONFLICT DO UPDATE … RETURNING (bloqueo de fila), así dos altas
-- simultáneas nunca obtienen el mismo número.
CREATE TABLE incident_folio_counters (
  company_id text NOT NULL,
  year       integer NOT NULL CHECK (year BETWEEN 2000 AND 9999),
  last_seq   integer NOT NULL CHECK (last_seq > 0),
  PRIMARY KEY (company_id, year)
);

CREATE TABLE incidents (
  id                 text PRIMARY KEY,
  company_id         text NOT NULL,
  folio              text NOT NULL,
  client_uuid        text,
  source             text NOT NULL CHECK (source IN ('driver_report', 'sos', 'rule', 'manual')),
  type               text NOT NULL CHECK (type IN ('mechanical', 'checkpoint', 'accident', 'delay_loading', 'delay_unloading',
                                                   'client_issue', 'theft_attempt', 'sos', 'speeding', 'device_offline', 'other')),
  urgency            text NOT NULL CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  status             text NOT NULL CHECK (status IN ('open', 'acknowledged', 'in_progress', 'resolved', 'closed')),
  title              text NOT NULL,
  description        text NOT NULL,
  trip_id            text,
  driver_id          text,
  vehicle_id         text,
  assignee_id        text,
  occurred_at        timestamptz NOT NULL,
  location_text      text,
  lat                double precision,
  lng                double precision,
  evidence_ids       text[] NOT NULL DEFAULT '{}',
  sla_ack_due_at     timestamptz NOT NULL,
  sla_resolve_due_at timestamptz NOT NULL,
  acknowledged_at    timestamptz,
  resolved_at        timestamptz,
  closed_at          timestamptz,
  -- 0 = sin escalar, 1 = acuse vencido, 2 = resolución vencida.
  escalation_level   smallint NOT NULL DEFAULT 0 CHECK (escalation_level BETWEEN 0 AND 2),
  created_at         timestamptz NOT NULL,
  updated_at         timestamptz NOT NULL,
  CONSTRAINT incidents_folio_uq UNIQUE (company_id, folio),
  -- Idempotencia de la cola offline de G3 Drive (NULL en reglas/manual no choca).
  CONSTRAINT incidents_client_uuid_uq UNIQUE (company_id, client_uuid)
);
CREATE INDEX incidents_company_created_idx ON incidents (company_id, created_at DESC);
CREATE INDEX incidents_company_status_idx ON incidents (company_id, status);
CREATE INDEX incidents_company_driver_idx ON incidents (company_id, driver_id);
CREATE INDEX incidents_company_vehicle_idx ON incidents (company_id, vehicle_id, type);
-- Barrido de SLA (todas las compañías): solo incidentes abiertos que aún pueden escalar.
CREATE INDEX incidents_escalation_idx ON incidents (sla_ack_due_at, sla_resolve_due_at)
  WHERE status NOT IN ('resolved', 'closed') AND escalation_level < 2;

CREATE TABLE incident_comments (
  seq         bigint GENERATED ALWAYS AS IDENTITY,
  id          text PRIMARY KEY,
  company_id  text NOT NULL,
  incident_id text NOT NULL REFERENCES incidents (id) ON DELETE CASCADE,
  -- NULL en entradas del sistema.
  author_id   text,
  kind        text NOT NULL CHECK (kind IN ('comment', 'system')),
  body        text NOT NULL,
  created_at  timestamptz NOT NULL
);
CREATE INDEX incident_comments_incident_idx ON incident_comments (company_id, incident_id, seq);

CREATE TABLE alert_rules (
  id           text PRIMARY KEY,
  company_id   text NOT NULL,
  name         text NOT NULL CHECK (length(btrim(name)) > 0),
  enabled      boolean NOT NULL DEFAULT true,
  -- AlertRuleTrigger de @g3/contracts; se valida la forma de cada variante.
  trigger      jsonb NOT NULL,
  channels     text[] NOT NULL CHECK (cardinality(channels) > 0 AND channels <@ ARRAY['push', 'whatsapp']::text[]),
  notify_roles text[] NOT NULL CHECK (cardinality(notify_roles) > 0),
  created_at   timestamptz NOT NULL,
  updated_at   timestamptz NOT NULL,
  CONSTRAINT alert_rules_trigger_ck CHECK (
    jsonb_typeof(trigger) = 'object' AND
    CASE trigger->>'kind'
      WHEN 'incident_created' THEN
        trigger->>'minUrgency' IN ('low', 'medium', 'high', 'critical')
        AND (NOT trigger ? 'types' OR jsonb_typeof(trigger->'types') = 'array')
      WHEN 'sla_breach' THEN
        trigger->>'stage' IN ('ack', 'resolve')
      WHEN 'speeding' THEN
        CASE WHEN jsonb_typeof(trigger->'thresholdKph') = 'number'
          THEN (trigger->>'thresholdKph')::numeric > 0 AND (trigger->>'thresholdKph')::numeric < 200
          ELSE false END
      WHEN 'device_offline' THEN
        CASE WHEN jsonb_typeof(trigger->'minutes') = 'number'
          THEN (trigger->>'minutes')::numeric BETWEEN 5 AND 1440
          ELSE false END
      ELSE false
    END
  )
);
CREATE INDEX alert_rules_company_idx ON alert_rules (company_id, (trigger->>'kind')) WHERE enabled;

-- Cada usuario registra su token push y su WhatsApp por compañía.
CREATE TABLE notification_contacts (
  company_id text NOT NULL,
  user_id    text NOT NULL,
  role       text NOT NULL,
  push_token text,
  whatsapp   text CHECK (whatsapp ~ '^\+[0-9]{10,15}$'),
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (company_id, user_id)
);
CREATE INDEX notification_contacts_role_idx ON notification_contacts (company_id, role);

-- Regla device_offline: última posición de cada unidad con viaje activo.
-- Compartida entre réplicas; el barrido "reclama" la fila con
-- DELETE … RETURNING para que solo una instancia abra el incidente.
CREATE TABLE vehicle_last_signals (
  company_id  text NOT NULL,
  vehicle_id  text NOT NULL,
  trip_id     text NOT NULL,
  driver_id   text,
  speed_kph   double precision,
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  recorded_at timestamptz NOT NULL,
  PRIMARY KEY (company_id, vehicle_id)
);
CREATE INDEX vehicle_last_signals_recorded_idx ON vehicle_last_signals (recorded_at);
