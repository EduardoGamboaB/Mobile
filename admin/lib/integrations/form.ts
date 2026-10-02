/**
 * Lógica pura del formulario de Integraciones (sin React): estado inicial
 * desde el catálogo, validación en cliente con `validateIntegrationSettings`
 * y armado del `UpsertIntegrationDto` (secreto vacío = conservar, null = borrar).
 */
import { G3ApiError } from '../api/types';
import {
  validateIntegrationSettings,
  type IntegrationCategoryDef,
  type IntegrationProviderDef,
} from '../contracts/integrationsCatalog';
import type {
  IntegrationConfigDto,
  IntegrationSource,
  IntegrationStatus,
  SecretDescriptorDto,
  UpsertIntegrationDto,
} from './types';

export interface IntegrationFormState {
  provider: string;
  enabled: boolean;
  /** Campos no secretos y secretos recién tecleados ('' = conservar el guardado). */
  values: Record<string, string | boolean>;
  /** Secretos marcados para borrar (se mandan como `null`). */
  clearSecrets: string[];
}

function providerOf(def: IntegrationCategoryDef, id: string): IntegrationProviderDef | undefined {
  return def.providers.find((p) => p.id === id);
}

function defaultsFor(provider: IntegrationProviderDef | undefined): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {};
  for (const f of provider?.fields ?? []) {
    if (f.type === 'secret') values[f.key] = '';
    else if (f.type === 'boolean') values[f.key] = typeof f.defaultValue === 'boolean' ? f.defaultValue : false;
    else values[f.key] = typeof f.defaultValue === 'string' ? f.defaultValue : '';
  }
  return values;
}

/** Estado inicial: la config guardada (si es del mismo proveedor) o los defaults del catálogo. */
export function initialFormState(
  def: IntegrationCategoryDef,
  config: IntegrationConfigDto | null,
  providerId?: string,
): IntegrationFormState {
  const provider = providerId ?? config?.provider ?? def.providers[0]?.id ?? '';
  const p = providerOf(def, provider);
  const values = defaultsFor(p);
  if (config && config.provider === provider) {
    for (const f of p?.fields ?? []) {
      if (f.type === 'secret') continue;
      const v = config.settings[f.key];
      values[f.key] = v === undefined ? (f.type === 'boolean' ? false : '') : v;
    }
  }
  return { provider, enabled: config && config.provider === provider ? config.enabled : true, values, clearSecrets: [] };
}

/** Secretos guardados que siguen vigentes para el proveedor elegido. */
export function storedSecrets(config: IntegrationConfigDto | null, providerId: string): string[] {
  if (!config || config.provider !== providerId) return [];
  return Object.entries(config.secrets)
    .filter(([, d]) => d.set)
    .map(([k]) => k);
}

/** Validación en cliente con la misma función del contrato. */
export function validateForm(
  def: IntegrationCategoryDef,
  state: IntegrationFormState,
  config: IntegrationConfigDto | null,
): Record<string, string> {
  const p = providerOf(def, state.provider);
  if (!p) return { provider: 'Elige un proveedor' };
  const values: Record<string, unknown> = {};
  for (const f of p.fields) {
    const v = state.values[f.key];
    if (f.type === 'secret') {
      if (typeof v === 'string' && v.trim() !== '') values[f.key] = v.trim();
      continue;
    }
    if (typeof v === 'string') {
      if (v.trim() !== '') values[f.key] = v.trim();
    } else if (v !== undefined) values[f.key] = v;
  }
  const keep = storedSecrets(config, state.provider).filter((k) => !state.clearSecrets.includes(k));
  return validateIntegrationSettings(def.category, state.provider, values, { keepSecrets: keep });
}

/**
 * Cuerpo del PUT. Secretos: tecleado → valor; vacío → se omite (conservar);
 * marcado para borrar → `null`. No secretos vacíos: se omiten, o `null` si
 * había valor guardado (para limpiarlo).
 */
export function buildUpsertPayload(
  def: IntegrationCategoryDef,
  state: IntegrationFormState,
  config: IntegrationConfigDto | null,
): UpsertIntegrationDto {
  const p = providerOf(def, state.provider);
  const values: UpsertIntegrationDto['values'] = {};
  const sameProvider = config?.provider === state.provider;
  for (const f of p?.fields ?? []) {
    const v = state.values[f.key];
    if (f.type === 'secret') {
      if (typeof v === 'string' && v.trim() !== '') values[f.key] = v.trim();
      else if (state.clearSecrets.includes(f.key)) values[f.key] = null;
      continue;
    }
    if (f.type === 'boolean') {
      values[f.key] = v === true;
      continue;
    }
    const s = typeof v === 'string' ? v.trim() : '';
    if (s !== '') values[f.key] = s;
    else if (sameProvider && config?.settings[f.key] !== undefined) values[f.key] = null;
  }
  return { provider: state.provider, enabled: state.enabled, values };
}

/** Errores por campo que devuelve el servidor (400). `_form` = error general. */
export function fieldErrorsFromError(e: unknown): Record<string, string> {
  if (e instanceof G3ApiError) {
    const body = e.body as unknown as Record<string, unknown>;
    for (const k of ['errors', 'fieldErrors']) {
      const v = body?.[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const out: Record<string, string> = {};
        for (const [field, msg] of Object.entries(v as Record<string, unknown>)) out[field] = String(msg);
        if (Object.keys(out).length) return out;
      }
    }
    const msg = body?.message;
    return { _form: Array.isArray(msg) ? msg.join(' · ') : e.message };
  }
  return { _form: e instanceof Error ? e.message : String(e) };
}

export function isSecretReference(v: string): boolean {
  return /^(gsm:projects\/\S+|env:[A-Z_][A-Z0-9_]*)$/.test(v.trim());
}

export function secretHint(d: SecretDescriptorDto | undefined): string | null {
  if (!d?.set) return null;
  if (d.storage === 'secret_manager') return `En Secret Manager (${d.hint}) · deja vacío para conservar`;
  if (d.storage === 'env') return `Variable de entorno ${String(d.hint ?? '').replace(/^env:/, '')} · deja vacío para conservar`;
  return `••••${d.hint ?? ''} guardado · deja vacío para conservar`;
}

export const SOURCE_LABEL: Record<IntegrationSource, string> = {
  company: 'Configuración propia',
  platform: 'Plataforma G3',
  env: 'Variables de entorno',
  none: 'Sin configurar',
};
export const SOURCE_TONE: Record<IntegrationSource, string> = {
  company: 'blue',
  platform: 'navy',
  env: 'amber',
  none: 'gray',
};
export const STATUS_LABEL: Record<IntegrationStatus, string> = {
  unverified: 'Sin verificar',
  verified: 'Verificado',
  failed: 'Falló',
};
export const STATUS_TONE: Record<IntegrationStatus, string> = {
  unverified: 'gray',
  verified: 'green',
  failed: 'red',
};
