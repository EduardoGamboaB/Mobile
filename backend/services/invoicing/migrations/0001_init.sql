-- Servicio invoicing: estado del timbrado de cada CFDI para que sea
-- idempotente (un reintento nunca timbra dos veces) y auditable.

CREATE TABLE invoices (
  id                     text PRIMARY KEY,
  company_id             text NOT NULL,
  -- Llave de idempotencia del llamador (default: invoiceId).
  idempotency_key        text NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 200),
  -- sha256 de la entrada: la misma llave con otro contenido es un error.
  request_hash           text NOT NULL,
  -- pending → stamping → stamped | rejected | failed (reintentable) ; stamped → cancelled
  status                 text NOT NULL CHECK (status IN ('pending', 'stamping', 'stamped', 'rejected', 'failed', 'cancelled')),
  -- XML generado UNA vez y reenviado idéntico en cada reintento (regenerarlo
  -- cambiaría Fecha/sello y el PAC lo trataría como otro comprobante).
  xml                    text NOT NULL,
  uuid_sat               text,
  sat_seal               text,
  sat_certificate_number text,
  -- V1: texto en la fila (≈ 10–40 KB). Si crece, migrar a Cloud Storage con una
  -- columna stamped_xml_uri en una migración nueva.
  stamped_xml            text,
  stamped_at             timestamptz,
  rejection_code         text,
  rejection_message      text,
  guarantee_applicable   boolean,
  pac_provider           text,
  pac_response_ms        integer,
  stamp_attempts         integer NOT NULL DEFAULT 0 CHECK (stamp_attempts >= 0),
  -- Lease del timbrado en curso: otra instancia puede retomarlo al vencer.
  locked_until           timestamptz,
  cancellation_reason    text CHECK (cancellation_reason IN ('01', '02', '03', '04')),
  substitute_uuid        text,
  cancelled_at           timestamptz,
  created_at             timestamptz NOT NULL,
  updated_at             timestamptz NOT NULL,
  CONSTRAINT invoices_idempotency_uq UNIQUE (company_id, idempotency_key),
  CONSTRAINT invoices_stamped_ck CHECK (status NOT IN ('stamped', 'cancelled') OR uuid_sat IS NOT NULL)
);
-- El UUID del SAT (folio fiscal) es único en todo el país.
CREATE UNIQUE INDEX invoices_uuid_sat_uq ON invoices (uuid_sat) WHERE uuid_sat IS NOT NULL;
CREATE INDEX invoices_company_created_idx ON invoices (company_id, created_at DESC);
CREATE INDEX invoices_company_status_idx ON invoices (company_id, status);

-- Bitácora de intentos: qué PAC respondió qué y cuánto tardó.
CREATE TABLE invoice_stamp_attempts (
  invoice_id   text NOT NULL REFERENCES invoices (id) ON DELETE CASCADE,
  attempt      integer NOT NULL CHECK (attempt > 0),
  company_id   text NOT NULL,
  pac_provider text,
  outcome      text NOT NULL CHECK (outcome IN ('stamped', 'rejected', 'failed', 'error')),
  error_code   text,
  error_message text,
  response_ms  integer,
  created_at   timestamptz NOT NULL,
  PRIMARY KEY (invoice_id, attempt)
);
CREATE INDEX invoice_stamp_attempts_company_idx ON invoice_stamp_attempts (company_id, created_at DESC);
