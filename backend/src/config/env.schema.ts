import { z } from 'zod';

/**
 * Validación estricta del entorno. Falla rápido en boot si falta una
 * variable crítica — preferible a errores oscuros en runtime.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(8080),
  API_BASE_URL: z.string().url().optional(),

  DATABASE_URL: z.string(),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  GCP_PROJECT_ID: z.string().optional(),
  GCP_REGION: z.string().default('us-central1'),
  PUBSUB_TOPIC_EVENTS: z.string().default('g3-domain-events'),
  PUBSUB_TOPIC_ALERTS: z.string().default('g3-alerts'),
  BIGQUERY_DATASET: z.string().default('g3_warehouse'),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_BUSINESS: z.string().optional(),

  AI_PROVIDER: z.enum(['stub', 'openai', 'anthropic', 'vertex']).default('stub'),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  VERTEX_LOCATION: z.string().default('us-central1'),
  VERTEX_MODEL: z.string().default('gemini-1.5-pro'),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  CORS_ORIGINS: z.string().default('*'),
});

export type Env = z.infer<typeof envSchema>;
