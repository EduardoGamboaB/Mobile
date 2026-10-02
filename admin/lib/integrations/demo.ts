/**
 * Integraciones en modo demo: misma lógica que el servicio integrations
 * (secretos enmascarados, conservar/borrar, fuente efectiva, prueba), en
 * memoria, para revisar la UI sin API.
 *
 * La prueba simulada falla si algún secreto guardado termina en "bad".
 */
import { G3ApiError } from '../api/types';
import {
  INTEGRATIONS_CATALOG,
  getCategoryDef,
  getProviderDef,
  validateIntegrationSettings,
} from '../contracts/integrationsCatalog';
import type { IntegrationsBackend } from './api';
import type {
  IntegrationCategory,
  IntegrationConfigDto,
  IntegrationOverviewItemDto,
  IntegrationScope,
  IntegrationTestDto,
  SecretDescriptorDto,
  UpsertIntegrationDto,
} from './types';

export const DEMO_COMPANY_ID = 'demo';

export interface DemoIntegrationsOptions {
  /** ¿El usuario demo es owner/admin de la compañía plataforma (G3 Tech)? */
  canEditPlatform?: boolean;
  /** Categorías con variables de entorno de respaldo presentes. */
  envPresent?: Partial<Record<IntegrationCategory, boolean>>;
  /** Sin datos de ejemplo. */
  empty?: boolean;
  now?: () => Date;
}

interface Stored {
  config: IntegrationConfigDto;
  /** Valores en claro (solo en memoria demo; el backend real los cifra). */
  raw: Record<string, string>;
}

/** Error con la misma forma que el backend (400 con errores por campo). */
export function demoError(status: number, message: string, errors?: Record<string, string>): G3ApiError {
  return new G3ApiError(status, {
    statusCode: status,
    error: status === 400 ? 'Bad Request' : status === 403 ? 'Forbidden' : status === 404 ? 'Not Found' : 'Error',
    message,
    ...(errors ? { errors } : {}),
  } as G3ApiError['body']);
}

/** Descripción de un secreto según cómo se capturó (literal, gsm:, env:). */
export function describeSecret(value: string): SecretDescriptorDto {
  if (value.startsWith('gsm:')) return { set: true, storage: 'secret_manager', hint: value };
  if (value.startsWith('env:')) return { set: true, storage: 'env', hint: value };
  return { set: true, storage: 'encrypted', hint: value.slice(-4) };
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function createDemoIntegrations(opts: DemoIntegrationsOptions = {}): IntegrationsBackend & {
  reset(): void;
  /** Valor en claro guardado (solo para tests). */
  rawSecret(category: IntegrationCategory, slot: string, scope: IntegrationScope, key: string): string | undefined;
} {
  const now = opts.now ?? (() => new Date());
  const canEditPlatform = opts.canEditPlatform ?? true;
  const envPresent: Partial<Record<IntegrationCategory, boolean>> = opts.envPresent ?? {
    push: true,
    storage: true,
  };
  const store = new Map<string, Stored>();
  let seq = 0;

  const key = (scope: IntegrationScope, category: IntegrationCategory, slot: string) =>
    `${scope}|${scope === 'company' ? DEMO_COMPANY_ID : '-'}|${category}|${slot}`;

  function assertSlot(category: IntegrationCategory, slot: string, scope: IntegrationScope) {
    let def;
    try {
      def = getCategoryDef(category);
    } catch {
      throw demoError(404, `Categoría desconocida: ${category}`);
    }
    if (!def.slots.some((s) => s.id === slot)) throw demoError(404, `Ranura desconocida: ${slot}`);
    if (!def.scopes.includes(scope)) {
      throw demoError(400, `${def.label} solo se configura a nivel ${def.scopes.join(', ')}`);
    }
    if (scope === 'platform' && !canEditPlatform) {
      throw demoError(403, 'Solo un owner/admin de la plataforma G3 edita este alcance');
    }
    return def;
  }

  function put(
    category: IntegrationCategory,
    slot: string,
    scope: IntegrationScope,
    body: UpsertIntegrationDto,
    raw = false,
  ): IntegrationConfigDto {
    assertSlot(category, slot, scope);
    const provider = getProviderDef(category, body.provider);
    if (!provider) throw demoError(400, 'Proveedor no soportado', { provider: `Proveedor no soportado: ${body.provider}` });

    const prev = store.get(key(scope, category, slot));
    const sameProvider = prev?.config.provider === body.provider;
    const keptRaw: Record<string, string> = sameProvider ? { ...prev!.raw } : {};
    const values = body.values ?? {};

    const toValidate: Record<string, unknown> = {};
    const settings: Record<string, string | boolean> = {};
    for (const [k, v] of Object.entries(values)) {
      const f = provider.fields.find((x) => x.key === k);
      if (!f) {
        toValidate[k] = v;
        continue;
      }
      if (f.type === 'secret') {
        if (v === null) delete keptRaw[k];
        else if (typeof v === 'string' && v.trim() !== '') {
          keptRaw[k] = v.trim();
          toValidate[k] = v.trim();
        } else if (typeof v !== 'string') toValidate[k] = v;
        continue;
      }
      toValidate[k] = v;
      if (v !== null && v !== '') settings[k] = typeof v === 'string' ? v.trim() : v;
    }
    // Solo cuentan los secretos que existen para este proveedor.
    for (const k of Object.keys(keptRaw)) {
      if (!provider.fields.some((f) => f.key === k && f.type === 'secret')) delete keptRaw[k];
    }
    const errors = validateIntegrationSettings(category, body.provider, toValidate, {
      keepSecrets: Object.keys(keptRaw),
    });
    if (Object.keys(errors).length) throw demoError(400, 'Configuración inválida', errors);

    const secrets: Record<string, SecretDescriptorDto> = {};
    for (const f of provider.fields) {
      if (f.type !== 'secret') continue;
      secrets[f.key] = keptRaw[f.key] ? describeSecret(keptRaw[f.key]) : { set: false, storage: null, hint: null };
    }
    const config: IntegrationConfigDto = {
      id: prev?.config.id ?? `int_${(seq++).toString(36)}`,
      scope,
      companyId: scope === 'company' ? DEMO_COMPANY_ID : null,
      category,
      slot,
      provider: body.provider,
      enabled: !!body.enabled,
      settings,
      secrets,
      // Cualquier cambio invalida la verificación anterior.
      status: 'unverified',
      lastTest: null,
      updatedAt: now().toISOString(),
      updatedBy: raw ? 'seed' : 'usr_admin',
    };
    store.set(key(scope, category, slot), { config, raw: keptRaw });
    return clone(config);
  }

  function runTest(category: IntegrationCategory, slot: string, scope: IntegrationScope): IntegrationTestDto {
    assertSlot(category, slot, scope);
    const s = store.get(key(scope, category, slot));
    if (!s) throw demoError(404, 'No hay configuración que probar en este alcance');
    const provider = getProviderDef(category, s.config.provider)!;
    const started = now().getTime();
    const missing = provider.fields.filter(
      (f) => f.required && (f.type === 'secret' ? !s.raw[f.key] : s.config.settings[f.key] === undefined),
    );
    const bad = Object.values(s.raw).some((v) => v.endsWith('bad'));
    const ok = missing.length === 0 && !bad;
    const result: IntegrationTestDto = {
      ok,
      live: provider.liveTest,
      latencyMs: provider.liveTest ? 180 + (s.config.provider.length * 37) % 220 : 2,
      testedAt: new Date(started).toISOString(),
      message: !ok
        ? missing.length
          ? `Faltan campos: ${missing.map((f) => f.label).join(', ')}`
          : `${provider.name} rechazó las credenciales (401 Unauthorized)`
        : provider.liveTest
          ? `Conexión correcta con ${provider.name}`
          : 'Formato válido.',
    };
    s.config.status = ok ? 'verified' : 'failed';
    s.config.lastTest = result;
    return clone(result);
  }

  function seed() {
    store.clear();
    if (opts.empty) return;
    const minutesAgo = (m: number) => new Date(now().getTime() - m * 60_000).toISOString();
    const seedPut = (
      scope: IntegrationScope,
      category: IntegrationCategory,
      slot: string,
      body: UpsertIntegrationDto,
      test = true,
    ) => {
      const k = key(scope, category, slot);
      // El seed escribe plataforma aunque el usuario demo no pueda editarla.
      const def = getCategoryDef(category);
      if (!def.scopes.includes(scope)) return;
      const provider = getProviderDef(category, body.provider)!;
      const raw: Record<string, string> = {};
      const settings: Record<string, string | boolean> = {};
      const secrets: Record<string, SecretDescriptorDto> = {};
      for (const f of provider.fields) {
        const v = body.values[f.key];
        if (f.type === 'secret') {
          if (typeof v === 'string' && v) raw[f.key] = v;
          secrets[f.key] = raw[f.key] ? describeSecret(raw[f.key]) : { set: false, storage: null, hint: null };
        } else if (v !== undefined && v !== null && v !== '') settings[f.key] = v;
      }
      store.set(k, {
        raw,
        config: {
          id: `int_${(seq++).toString(36)}`,
          scope,
          companyId: scope === 'company' ? DEMO_COMPANY_ID : null,
          category,
          slot,
          provider: body.provider,
          enabled: body.enabled,
          settings,
          secrets,
          status: 'unverified',
          lastTest: null,
          updatedAt: minutesAgo(60 * 24 * 3),
          updatedBy: 'seed',
        },
      });
      if (test) {
        const s = store.get(k)!;
        const t = getProviderDef(category, s.config.provider);
        s.config.status = 'verified';
        s.config.lastTest = {
          ok: true,
          live: !!t?.liveTest,
          latencyMs: 214,
          testedAt: minutesAgo(60 * 26),
          message: t?.liveTest ? `Conexión correcta con ${t.name}` : 'Formato válido (sin prueba en vivo)',
        };
      }
    };

    seedPut('platform', 'sms', 'default', {
      provider: 'twilio',
      enabled: true,
      values: { accountSid: 'AC5f1e0c2d9b8a7f6e5d4c3b2a1f0e9d8c', authToken: 'tw_live_token_7c1a', from: 'MG2a7d00b1c9e84f23a1' },
    });
    seedPut('platform', 'email', 'default', {
      provider: 'sendgrid',
      enabled: true,
      values: {
        apiKey: 'gsm:projects/g3-prod/secrets/sendgrid-api-key/versions/latest',
        fromEmail: 'no-reply@g3logistics.mx',
        fromName: 'G3',
      },
    });
    seedPut('platform', 'payments', 'default', {
      provider: 'stripe',
      enabled: true,
      values: { publishableKey: 'pk_live_51G3demo', secretKey: 'env:STRIPE_SECRET_KEY', webhookSecret: 'whsec_demo_9f2b' },
    });
    seedPut('platform', 'pac', 'primary', {
      provider: 'diverza',
      enabled: true,
      values: { environment: 'production', rfc: 'GTE210101AB1', user: 'g3tech', password: 'pac_pw_0420' },
    });
    seedPut('company', 'whatsapp', 'default', {
      provider: 'meta_cloud',
      enabled: true,
      values: {
        phoneNumberId: '109876543210987',
        businessAccountId: '',
        accessToken: 'EAAG_demo_token_x9Q2',
        template: 'g3_incidente',
        language: 'es_MX',
      },
    });
    seedPut(
      'company',
      'pac',
      'primary',
      {
        provider: 'facturama',
        enabled: true,
        values: { environment: 'sandbox', rfc: 'TGL120101AAA', user: 'g3logistics', password: 'facturama_sandbox_pw' },
      },
      false,
    );
  }

  seed();

  function platformView(category: IntegrationCategory, slot: string): IntegrationOverviewItemDto['platform'] {
    const s = store.get(key('platform', category, slot));
    if (!s) return null;
    if (canEditPlatform) return clone(s.config);
    return { provider: s.config.provider, status: s.config.status, enabled: s.config.enabled };
  }

  return {
    reset: seed,
    rawSecret: (category, slot, scope, k) => store.get(key(scope, category, slot))?.raw[k],

    async catalog() {
      return INTEGRATIONS_CATALOG;
    },

    async overview() {
      const items: IntegrationOverviewItemDto[] = [];
      for (const def of INTEGRATIONS_CATALOG) {
        for (const slot of def.slots) {
          const company = def.scopes.includes('company')
            ? store.get(key('company', def.category, slot.id))?.config ?? null
            : null;
          const platformStored = store.get(key('platform', def.category, slot.id))?.config ?? null;
          const env = !!envPresent[def.category] && def.envFallback.length > 0;
          let effective: IntegrationOverviewItemDto['effective'];
          if (company?.enabled) {
            effective = { source: 'company', provider: company.provider, status: company.status, enabled: true };
          } else if (platformStored?.enabled) {
            effective = {
              source: 'platform',
              provider: platformStored.provider,
              status: platformStored.status,
              enabled: true,
            };
          } else if (env) {
            effective = { source: 'env', provider: def.providers[0]?.id ?? null, status: null, enabled: true };
          } else {
            effective = { source: 'none', provider: null, status: null, enabled: false };
          }
          items.push({
            category: def.category,
            slot: slot.id,
            effective,
            company: company ? clone(company) : null,
            platform: platformView(def.category, slot.id),
            envFallbackPresent: env,
            canEditPlatform,
          });
        }
      }
      return items;
    },

    async get(category, slot, scope) {
      assertSlot(category, slot, scope);
      const s = store.get(key(scope, category, slot));
      return s ? clone(s.config) : null;
    },

    async upsert(category, slot, scope, body) {
      return put(category, slot, scope, body);
    },

    async remove(category, slot, scope) {
      assertSlot(category, slot, scope);
      store.delete(key(scope, category, slot));
    },

    async test(category, slot, scope) {
      return runTest(category, slot, scope);
    },
  };
}
