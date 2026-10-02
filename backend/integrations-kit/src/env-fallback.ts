import { getCategoryDef, type IntegrationCategory } from '@g3/contracts';

export type EnvLike = Record<string, string | undefined>;

export interface EnvFallbackConfig {
  provider: string;
  settings: Record<string, string | boolean>;
  secrets: Record<string, string>;
}

/**
 * Configuración armada con las variables de entorno de respaldo
 * (`envFallback` del catálogo). `null` si no están las mínimas.
 *
 * | categoría | mínimas                                          | opcionales |
 * |-----------|--------------------------------------------------|------------|
 * | push      | EXPO_PUSH_ENABLED=1                              | EXPO_ACCESS_TOKEN |
 * | whatsapp  | WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN  | WHATSAPP_TEMPLATE, WHATSAPP_LANGUAGE |
 * | payments  | STRIPE_SECRET_KEY                                | STRIPE_WEBHOOK_SECRET, STRIPE_PUBLISHABLE_KEY |
 * | ai        | GCP_PROJECT_ID                                   | VERTEX_LOCATION, VERTEX_MODEL |
 * | storage   | EVIDENCE_BUCKET                                  | EVIDENCE_SIGNER_SA |
 *
 * SMS, correo y PAC no tienen respaldo por entorno: se configuran en G3 Admin.
 */
export function envFallbackFor(category: IntegrationCategory, env: EnvLike): EnvFallbackConfig | null {
  if (getCategoryDef(category).envFallback.length === 0) return null;
  const v = (k: string) => (env[k] ?? '').trim();
  switch (category) {
    case 'push':
      if (v('EXPO_PUSH_ENABLED') !== '1') return null;
      return { provider: 'expo', settings: {}, secrets: v('EXPO_ACCESS_TOKEN') ? { accessToken: v('EXPO_ACCESS_TOKEN') } : {} };
    case 'whatsapp':
      if (!v('WHATSAPP_PHONE_NUMBER_ID') || !v('WHATSAPP_ACCESS_TOKEN')) return null;
      return {
        provider: 'meta_cloud',
        settings: {
          phoneNumberId: v('WHATSAPP_PHONE_NUMBER_ID'),
          template: v('WHATSAPP_TEMPLATE') || 'g3_incidente',
          language: v('WHATSAPP_LANGUAGE') || 'es_MX',
        },
        secrets: { accessToken: v('WHATSAPP_ACCESS_TOKEN') },
      };
    case 'payments':
      if (!v('STRIPE_SECRET_KEY')) return null;
      return {
        provider: 'stripe',
        settings: v('STRIPE_PUBLISHABLE_KEY') ? { publishableKey: v('STRIPE_PUBLISHABLE_KEY') } : {},
        secrets: {
          secretKey: v('STRIPE_SECRET_KEY'),
          ...(v('STRIPE_WEBHOOK_SECRET') ? { webhookSecret: v('STRIPE_WEBHOOK_SECRET') } : {}),
        },
      };
    case 'ai':
      if (!v('GCP_PROJECT_ID')) return null;
      return {
        provider: 'vertex',
        settings: {
          projectId: v('GCP_PROJECT_ID'),
          location: v('VERTEX_LOCATION') || 'us-central1',
          ...(v('VERTEX_MODEL') ? { model: v('VERTEX_MODEL') } : {}),
        },
        secrets: {},
      };
    case 'storage':
      if (!v('EVIDENCE_BUCKET')) return null;
      return {
        provider: 'gcs',
        settings: {
          bucket: v('EVIDENCE_BUCKET'),
          ...(v('EVIDENCE_SIGNER_SA') ? { signerServiceAccount: v('EVIDENCE_SIGNER_SA') } : {}),
        },
        secrets: {},
      };
    default:
      return null;
  }
}
