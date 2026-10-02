-- billing · modelo inicial (schema `billing`; el runner fija search_path).
-- Convenciones: backend/docs/PERSISTENCE-CONVENTIONS.md · Modelo: backend/docs/data-model/billing.md

-- Suscripción vigente de cada compañía (una por compañía).
CREATE TABLE subscriptions (
  id                     text        PRIMARY KEY,
  company_id             text        NOT NULL,
  -- Idéntico a TierValue de @g3/contracts.
  tier                   text        NOT NULL CHECK (tier IN ('free', 'starter', 'pro', 'business', 'enterprise')),
  -- Idéntico a SubscriptionDto['status'].
  status                 text        NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete')),
  -- Unidades (tractocamiones) contratadas.
  units                  integer     NOT NULL DEFAULT 1 CHECK (units >= 1),
  -- null = cotización (enterprise).
  price_mxn              numeric(14,2) CHECK (price_mxn IS NULL OR price_mxn >= 0),
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean     NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_company_uq UNIQUE (company_id),
  CONSTRAINT subscriptions_period_chk CHECK (
    current_period_start IS NULL OR current_period_end IS NULL OR current_period_end >= current_period_start
  )
);

-- El webhook de Stripe llega con el id de Stripe: búsqueda directa y sin duplicados.
CREATE UNIQUE INDEX subscriptions_stripe_sub_uq ON subscriptions (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX subscriptions_stripe_customer_idx ON subscriptions (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
-- Renovaciones / vencimientos próximos.
CREATE INDEX subscriptions_period_end_idx ON subscriptions (current_period_end)
  WHERE current_period_end IS NOT NULL;

-- Eventos de webhook de Stripe ya vistos: idempotencia por event.id.
-- `processing` = reclamado por una réplica; `processed` = efectos aplicados.
CREATE TABLE stripe_webhook_events (
  event_id     text        PRIMARY KEY,
  type         text        NOT NULL,
  -- null si el evento no se pudo asociar a una compañía.
  company_id   text,
  status       text        NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'processed')),
  attempts     integer     NOT NULL DEFAULT 1 CHECK (attempts >= 1),
  received_at  timestamptz NOT NULL DEFAULT now(),
  claimed_at   timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT stripe_webhook_events_processed_chk CHECK ((status = 'processed') = (processed_at IS NOT NULL))
);

CREATE INDEX stripe_webhook_events_company_idx ON stripe_webhook_events (company_id, received_at DESC)
  WHERE company_id IS NOT NULL;
