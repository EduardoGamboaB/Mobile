-- auth · modelo inicial (schema `auth`; el runner fija search_path).
-- Convenciones: backend/docs/PERSISTENCE-CONVENTIONS.md · Modelo: backend/docs/data-model/auth.md

-- ───────────────────────────── compañías y usuarios ─────────────────────────────

CREATE TABLE companies (
  id            text        PRIMARY KEY,
  name          text        NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
  rfc           text        CHECK (rfc IS NULL OR length(rfc) <= 32),
  contact_email text        NOT NULL,
  contact_phone text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id            text        PRIMARY KEY,
  company_id    text        NOT NULL REFERENCES companies (id),
  -- Único global (sin distinguir mayúsculas): el login es por correo.
  email         text        NOT NULL CHECK (email ~ '^[^@\s]+@[^@\s]+$'),
  password_hash text        NOT NULL,
  full_name     text        NOT NULL,
  -- Idéntico a UserRole de @g3/contracts.
  role          text        NOT NULL CHECK (role IN ('owner', 'admin', 'dispatcher', 'driver', 'viewer')),
  -- Copia del plan de la compañía para el JWT (la verdad está en billing).
  tier          text        NOT NULL CHECK (tier IN ('free', 'starter', 'pro', 'business', 'enterprise')),
  -- E.164; único global (login de choferes por OTP SMS).
  phone         text        CHECK (phone IS NULL OR phone ~ '^\+\d{10,15}$'),
  -- Registro de chofer en el servicio drivers (claim `driverId`). Sin FK: otro schema.
  driver_id     text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  -- Destino de FKs compuestas: las tablas hijas no pueden mezclar compañía y usuario.
  CONSTRAINT users_company_id_uq UNIQUE (company_id, id)
);

CREATE UNIQUE INDEX users_email_uq ON users (lower(email));
CREATE UNIQUE INDEX users_phone_uq ON users (phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX users_company_driver_uq ON users (company_id, driver_id) WHERE driver_id IS NOT NULL;
CREATE INDEX users_company_created_idx ON users (company_id, created_at, id);

-- ───────────────────────────────────── MFA ─────────────────────────────────────

-- Un factor TOTP por usuario. El secreto va cifrado (AES-256-GCM, MFA_ENCRYPTION_KEY).
CREATE TABLE mfa_factors (
  user_id        text        PRIMARY KEY,
  company_id     text        NOT NULL,
  secret_enc     text        NOT NULL,
  -- pending = enrolamiento iniciado sin confirmar; enabled = activo.
  status         text        NOT NULL CHECK (status IN ('pending', 'enabled')),
  -- Último paso TOTP aceptado (anti-replay); se avanza con UPDATE condicional.
  last_used_step bigint      CHECK (last_used_step IS NULL OR last_used_step >= 0),
  created_at     timestamptz NOT NULL,
  enabled_at     timestamptz,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mfa_factors_user_fk FOREIGN KEY (company_id, user_id) REFERENCES users (company_id, id) ON DELETE CASCADE,
  CONSTRAINT mfa_factors_enabled_chk CHECK ((status = 'enabled') = (enabled_at IS NOT NULL))
);

CREATE INDEX mfa_factors_company_idx ON mfa_factors (company_id, status);

-- Códigos de recuperación: solo HMAC-SHA256(pepper, código). Uso único (used_at).
CREATE TABLE mfa_recovery_codes (
  user_id    text        NOT NULL REFERENCES mfa_factors (user_id) ON DELETE CASCADE,
  company_id text        NOT NULL,
  code_hash  text        NOT NULL CHECK (code_hash ~ '^[0-9a-f]{64}$'),
  position   smallint    NOT NULL CHECK (position >= 0),
  used_at    timestamptz,
  PRIMARY KEY (user_id, code_hash)
);

CREATE INDEX mfa_recovery_codes_company_idx ON mfa_recovery_codes (company_id, user_id);

-- ───────────────────────────── política de seguridad ─────────────────────────────

CREATE TABLE security_policies (
  company_id            text        PRIMARY KEY REFERENCES companies (id) ON DELETE CASCADE,
  require_mfa_for_roles text[]      NOT NULL
    CHECK (require_mfa_for_roles <@ ARRAY['owner', 'admin', 'dispatcher', 'driver', 'viewer']::text[]),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL
);

-- ─────────────────────────────────── SSO (OIDC) ───────────────────────────────────

CREATE TABLE sso_configs (
  company_id        text        PRIMARY KEY REFERENCES companies (id) ON DELETE CASCADE,
  provider          text        NOT NULL CHECK (provider IN ('google', 'microsoft', 'oidc')),
  enabled           boolean     NOT NULL DEFAULT false,
  issuer            text        NOT NULL CHECK (issuer ~ '^https://'),
  client_id         text        NOT NULL,
  -- Referencia a Secret Manager (`projects/…/secrets/…`) o `env:VAR`; nunca el secreto.
  client_secret_ref text        NOT NULL
    CHECK (client_secret_ref ~ '^(projects/[a-z0-9-]+/secrets/[A-Za-z0-9_-]+(/versions/(latest|[0-9]+))?|env:[A-Z][A-Z0-9_]*)$'),
  jit_provisioning  boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL
);

-- Un dominio de correo pertenece a UNA compañía (único global a propósito).
CREATE TABLE sso_config_domains (
  domain     text     PRIMARY KEY CHECK (domain = lower(domain)),
  company_id text     NOT NULL REFERENCES sso_configs (company_id) ON DELETE CASCADE,
  position   smallint NOT NULL CHECK (position >= 0)
);

CREATE INDEX sso_config_domains_company_idx ON sso_config_domains (company_id, position);

-- ───────────────────────────── bitácora de auditoría ─────────────────────────────

-- Cabeza de cada cadena (compañía o '__global__'). Se bloquea con SELECT … FOR UPDATE
-- al anexar: serializa los anexos de la misma cadena entre réplicas.
CREATE TABLE audit_chain_heads (
  chain_key  text        PRIMARY KEY,
  company_id text,
  seq        bigint      NOT NULL CHECK (seq >= 0),
  hash       text        NOT NULL CHECK (hash ~ '^[0-9a-f]{64}$'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_chain_heads_key_chk CHECK (
    (chain_key = '__global__' AND company_id IS NULL) OR (chain_key <> '__global__' AND chain_key = company_id)
  )
);

-- Append-only: hash_n = sha256(prev_hash_n + JSON canónico de la entrada).
CREATE TABLE audit_log (
  id            text        PRIMARY KEY,
  chain_key     text        NOT NULL REFERENCES audit_chain_heads (chain_key),
  seq           bigint      NOT NULL CHECK (seq >= 1),
  -- null = evento sin compañía resoluble (cadena '__global__').
  company_id    text,
  actor_type    text        NOT NULL CHECK (actor_type IN ('user', 'system', 'anonymous')),
  actor_user_id text,
  actor_role    text        CHECK (actor_role IS NULL OR actor_role IN ('owner', 'admin', 'dispatcher', 'driver', 'viewer')),
  -- Idéntico a AUDIT_ACTIONS de @g3/contracts (agregar una acción = migración nueva).
  action        text        NOT NULL CHECK (action IN (
    'auth.login.succeeded', 'auth.login.failed', 'auth.mfa.verify_failed', 'auth.mfa.locked',
    'auth.mfa.enrolled', 'auth.mfa.disabled', 'auth.mfa.recovery_code_used',
    'auth.mfa.recovery_codes_regenerated', 'user.role_changed', 'user.provisioned_jit',
    'security_policy.updated', 'sso_config.updated', 'expense_policy.updated', 'auth.otp.requested',
    'auth.otp.failed', 'auth.password_reset.requested', 'auth.password_reset.completed',
    'user.driver_access_granted', 'integration.updated', 'integration.deleted', 'integration.tested'
  )),
  resource_type text        NOT NULL,
  resource_id   text,
  ip            text        CHECK (ip IS NULL OR length(ip) <= 64),
  user_agent    text        CHECK (user_agent IS NULL OR length(user_agent) <= 512),
  -- `timestamp` del DTO (entra al hash con precisión de milisegundos).
  occurred_at   timestamptz NOT NULL,
  metadata      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  prev_hash     text        NOT NULL CHECK (prev_hash ~ '^[0-9a-f]{64}$'),
  hash          text        NOT NULL CHECK (hash ~ '^[0-9a-f]{64}$'),
  recorded_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_log_chain_seq_uq UNIQUE (chain_key, seq),
  CONSTRAINT audit_log_chain_company_chk CHECK (
    (chain_key = '__global__' AND company_id IS NULL) OR (chain_key <> '__global__' AND chain_key = company_id)
  )
);

-- La bitácora de Admin filtra por acción, actor y fecha, siempre dentro de la cadena de la compañía.
CREATE INDEX audit_log_company_time_idx ON audit_log (company_id, occurred_at DESC) WHERE company_id IS NOT NULL;
CREATE INDEX audit_log_chain_action_idx ON audit_log (chain_key, action, seq DESC);
CREATE INDEX audit_log_chain_actor_idx ON audit_log (chain_key, actor_user_id, seq DESC) WHERE actor_user_id IS NOT NULL;

-- Nadie (ni el rol dueño de la tabla) puede editar ni borrar entradas.
CREATE FUNCTION audit_log_reject_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log es append-only: % no permitido', TG_OP USING ERRCODE = '42501';
END
$$;

CREATE TRIGGER audit_log_no_update_delete
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_reject_mutation();

CREATE TRIGGER audit_log_no_truncate
  BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_reject_mutation();

-- La cabeza solo avanza de uno en uno y no se borra (borrarla permitiría reiniciar la cadena).
CREATE FUNCTION audit_chain_heads_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'audit_chain_heads: DELETE no permitido' USING ERRCODE = '42501';
  END IF;
  IF NEW.chain_key <> OLD.chain_key OR NEW.seq <> OLD.seq + 1 THEN
    RAISE EXCEPTION 'audit_chain_heads: la cabeza solo avanza de uno en uno (% → %)', OLD.seq, NEW.seq
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER audit_chain_heads_guard
  BEFORE UPDATE OR DELETE ON audit_chain_heads
  FOR EACH ROW EXECUTE FUNCTION audit_chain_heads_guard();

-- Defensa en profundidad: en producción el rol de la app (g3_auth) no debe tener
-- UPDATE/DELETE/TRUNCATE sobre la bitácora. Si las migraciones corren con otro rol
-- (recomendado: g3_auth_migrator dueño de las tablas), esto lo deja explícito:
--   REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM g3_auth;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'g3_auth') AND current_user <> 'g3_auth' THEN
    EXECUTE 'REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM g3_auth';
  END IF;
END
$$;
