-- drivers · modelo inicial (schema `drivers`; el runner fija search_path).
-- Convenciones: backend/docs/PERSISTENCE-CONVENTIONS.md · Modelo: backend/docs/data-model/drivers.md

CREATE TABLE drivers (
  id                 text        PRIMARY KEY,
  company_id         text        NOT NULL,
  full_name          text        NOT NULL CHECK (length(btrim(full_name)) BETWEEN 1 AND 200),
  -- E.164 o captura libre (Admin); se normaliza en el cliente.
  phone              text        NOT NULL CHECK (length(btrim(phone)) BETWEEN 1 AND 32),
  email              text        CHECK (email IS NULL OR email ~ '^[^@\s]+@[^@\s]+$'),
  federal_license    text        CHECK (federal_license IS NULL OR length(btrim(federal_license)) BETWEEN 1 AND 64),
  -- Fecha (sin hora): la licencia vence un día calendario.
  license_expires_at date,
  -- Idéntico a DriverDto['status'] de @g3/contracts.
  status             text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  -- Usuario de auth (G3 Drive) vinculado. Sin FK: vive en otro schema/servicio.
  user_id            text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Listado por compañía (orden de alta).
CREATE INDEX drivers_company_created_idx ON drivers (company_id, created_at, id);

-- Un teléfono no se repite dentro de la compañía (el OTP de G3 Drive es por teléfono).
CREATE UNIQUE INDEX drivers_company_phone_uq ON drivers (company_id, phone);
-- La licencia federal identifica al chofer ante la SICT.
CREATE UNIQUE INDEX drivers_company_license_uq ON drivers (company_id, federal_license) WHERE federal_license IS NOT NULL;
-- Un usuario de G3 Drive corresponde a un solo chofer.
CREATE UNIQUE INDEX drivers_company_user_uq ON drivers (company_id, user_id) WHERE user_id IS NOT NULL;

-- Alertas de vencimiento (license_expiring): choferes activos por fecha.
CREATE INDEX drivers_company_license_exp_idx ON drivers (company_id, license_expires_at)
  WHERE license_expires_at IS NOT NULL AND status <> 'inactive';
