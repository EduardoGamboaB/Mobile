-- Servicio integrations: una configuración de proveedor por
-- (alcance, compañía|null, categoría, ranura). Enums alineados con
-- @g3/contracts (integrations-catalog.ts, dtos/integrations.ts).
--
-- Los secretos se guardan como los deja el servicio: literales cifrados con
-- AES-256-GCM (`v1.<iv>.<tag>.<ct>`, AAD ligado a la configuración) o
-- referencias `env:`/`gsm:`. La base nunca ve un secreto en claro ni la
-- llave (INTEGRATIONS_ENCRYPTION_KEY vive en Secret Manager).

CREATE TABLE integration_configs (
  id          text PRIMARY KEY,
  scope       text NOT NULL CHECK (scope IN ('company', 'platform')),
  -- NULL en alcance plataforma.
  company_id  text,
  category    text NOT NULL CHECK (category IN ('sms', 'email', 'push', 'whatsapp', 'pac', 'payments', 'ai', 'storage')),
  slot        text NOT NULL CHECK (slot ~ '^[a-z0-9_]{1,40}$'),
  provider    text NOT NULL CHECK (length(provider) BETWEEN 1 AND 60),
  enabled     boolean NOT NULL DEFAULT true,
  settings    jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(settings) = 'object'),
  -- { campo: { storage: 'encrypted', ciphertext, hint } | { storage: 'secret_manager'|'env', ref } }
  secrets     jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(secrets) = 'object'),
  status      text NOT NULL DEFAULT 'unverified' CHECK (status IN ('unverified', 'verified', 'failed')),
  last_test   jsonb CHECK (last_test IS NULL OR jsonb_typeof(last_test) = 'object'),
  created_at  timestamptz NOT NULL,
  updated_at  timestamptz NOT NULL,
  updated_by  text,
  CONSTRAINT integration_configs_scope_company_ck CHECK ((scope = 'platform') = (company_id IS NULL)),
  -- Defensa en profundidad: ningún secreto puede quedar en claro.
  CONSTRAINT integration_configs_secrets_ck CHECK (
    NOT jsonb_path_exists(secrets, '$.* ? (!(@.storage == "encrypted" || @.storage == "secret_manager" || @.storage == "env"))')
    AND NOT jsonb_path_exists(secrets, '$.* ? (@.storage == "encrypted" && !(@.ciphertext starts with "v1."))')
    AND NOT jsonb_path_exists(secrets, '$.* ? (@.storage == "secret_manager" && !(@.ref starts with "gsm:"))')
    AND NOT jsonb_path_exists(secrets, '$.* ? (@.storage == "env" && !(@.ref starts with "env:"))')
  )
);

-- Unicidad de la configuración; `coalesce` porque NULL ≠ NULL en un UNIQUE.
CREATE UNIQUE INDEX integration_configs_target_uq
  ON integration_configs (scope, coalesce(company_id, ''), category, slot);
CREATE INDEX integration_configs_company_idx ON integration_configs (company_id) WHERE company_id IS NOT NULL;
