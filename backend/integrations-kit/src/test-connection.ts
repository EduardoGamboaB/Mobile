import {
  validateIntegrationSettings,
  type IntegrationCategory,
  type IntegrationTestDto,
} from '@g3/contracts';
import {
  basicAuth,
  DEFAULT_TIMEOUT_MS,
  HttpTimeoutError,
  readJson,
  redact,
  requestWithTimeout,
  type FetchLike,
  type HttpResponseLike,
} from './http';
import { mailgunBase } from './email';
import { EXPO_TOKEN_RE } from './push';
import { META_GRAPH_BASE } from './whatsapp';

export interface TestConnectionOptions {
  timeoutMs?: number;
  now?: () => number;
}

type Settings = Record<string, string | boolean>;
type Secrets = Record<string, string>;

interface ProbeOutcome {
  ok: boolean;
  message: string;
  live: boolean;
}

const RFC_RE = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

/**
 * Prueba de conexión SIN enviar mensajes: llamadas de solo lectura a la
 * cuenta del proveedor cuando existen. Donde no hay forma de verificar sin
 * efectos (Expo, PAC, Vertex, GCS) solo valida formato y responde
 * `live: false`. Ningún mensaje incluye secretos.
 */
export async function testConnection(
  category: IntegrationCategory,
  providerId: string,
  settings: Settings,
  secrets: Secrets,
  fetchImpl: FetchLike,
  opts: TestConnectionOptions = {},
): Promise<IntegrationTestDto> {
  const now = opts.now ?? Date.now;
  const started = now();
  const secretValues = Object.values(secrets);
  let outcome: ProbeOutcome;
  const errors = validateIntegrationSettings(category, providerId, { ...settings, ...secrets });
  if (Object.keys(errors).length > 0) {
    const fields = Object.entries(errors).map(([k, v]) => `${k}: ${v}`).join('; ');
    outcome = { ok: false, live: false, message: `Configuración incompleta o inválida (${fields})` };
  } else {
    try {
      outcome = await probe(category, providerId, settings, secrets, fetchImpl, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    } catch (e) {
      outcome = {
        ok: false,
        live: true,
        message:
          e instanceof HttpTimeoutError
            ? `${providerLabel(providerId)}: ${e.message}`
            : `No se pudo conectar con ${providerLabel(providerId)}`,
      };
    }
  }
  return {
    ok: outcome.ok,
    live: outcome.live,
    message: redact(outcome.message, secretValues, 500),
    latencyMs: Math.max(0, now() - started),
    testedAt: new Date(now()).toISOString(),
  };
}

const LABELS: Record<string, string> = {
  twilio: 'Twilio',
  vonage: 'Vonage',
  sendgrid: 'SendGrid',
  mailgun: 'Mailgun',
  expo: 'Expo',
  meta_cloud: 'Meta (WhatsApp Cloud API)',
  stripe: 'Stripe',
  diverza: 'Diverza',
  facturama: 'Facturama',
  vertex: 'Vertex AI',
  gcs: 'Cloud Storage',
};
const providerLabel = (id: string) => LABELS[id] ?? id;

/** Mensaje por código HTTP; nunca incluye el cuerpo crudo del proveedor. */
export function httpFailureMessage(provider: string, status: number): string {
  const p = providerLabel(provider);
  if (status === 401 || status === 403) return `${p} rechazó las credenciales (HTTP ${status})`;
  if (status === 404) return `${p} no encontró el recurso (HTTP 404): revisa el identificador de cuenta, dominio o número`;
  if (status === 429) return `${p} limitó las peticiones (HTTP 429); intenta en unos minutos`;
  if (status >= 500) return `${p} no está disponible (HTTP ${status}); intenta más tarde`;
  return `${p} respondió HTTP ${status}`;
}

async function get(fetchImpl: FetchLike, url: string, headers: Record<string, string>, timeoutMs: number) {
  return requestWithTimeout(fetchImpl, url, { method: 'GET', headers: { accept: 'application/json', ...headers } }, timeoutMs);
}

const fail = (provider: string, res: HttpResponseLike): ProbeOutcome => ({
  ok: false,
  live: true,
  message: httpFailureMessage(provider, res.status),
});

const str = (v: unknown) => (typeof v === 'string' ? v : '');

async function probe(
  category: IntegrationCategory,
  provider: string,
  s: Settings,
  x: Secrets,
  f: FetchLike,
  t: number,
): Promise<ProbeOutcome> {
  switch (provider) {
    case 'twilio': {
      const sid = str(s.accountSid);
      if (!/^AC[0-9a-fA-F]{32}$/.test(sid)) return { ok: false, live: false, message: 'El Account SID debe empezar con AC y tener 34 caracteres' };
      const from = str(s.from);
      if (!/^MG[0-9a-fA-F]{32}$/.test(from) && !/^\+\d{10,15}$/.test(from)) {
        return { ok: false, live: false, message: 'El remitente debe ser un número E.164 (+52…) o un Messaging Service SID (MG…)' };
      }
      const res = await get(f, `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}.json`, { authorization: basicAuth(sid, x.authToken) }, t);
      if (!res.ok) return fail(provider, res);
      const json = await readJson(res);
      const status = str(json?.status);
      if (status && status !== 'active') return { ok: false, live: true, message: `La cuenta de Twilio está "${status}"` };
      return { ok: true, live: true, message: `Cuenta de Twilio activa${json?.friendly_name ? ` (${str(json.friendly_name)})` : ''}` };
    }
    case 'vonage': {
      const q = new URLSearchParams({ api_key: str(s.apiKey), api_secret: x.apiSecret }).toString();
      const res = await get(f, `https://rest.nexmo.com/account/get-balance?${q}`, {}, t);
      if (!res.ok) return fail(provider, res);
      const json = await readJson(res);
      const value = typeof json?.value === 'number' ? json.value : null;
      return { ok: true, live: true, message: `Cuenta de Vonage verificada${value !== null ? ` (saldo ${value.toFixed(2)} EUR)` : ''}` };
    }
    case 'sendgrid': {
      const res = await get(f, 'https://api.sendgrid.com/v3/scopes', { authorization: `Bearer ${x.apiKey}` }, t);
      if (!res.ok) return fail(provider, res);
      const scopes = ((await readJson(res))?.scopes as string[] | undefined) ?? [];
      if (!scopes.includes('mail.send')) return { ok: false, live: true, message: 'La API key de SendGrid no tiene el permiso mail.send' };
      return { ok: true, live: true, message: 'API key de SendGrid válida con permiso mail.send' };
    }
    case 'mailgun': {
      const domain = str(s.domain);
      const res = await get(f, `${mailgunBase(str(s.region))}/v3/domains/${encodeURIComponent(domain)}`, { authorization: basicAuth('api', x.apiKey) }, t);
      if (!res.ok) return fail(provider, res);
      const state = str((((await readJson(res))?.domain ?? {}) as Record<string, unknown>).state);
      if (state && state !== 'active') {
        return { ok: false, live: true, message: `El dominio ${domain} está "${state}" en Mailgun: completa la verificación DNS` };
      }
      return { ok: true, live: true, message: `Dominio ${domain} activo en Mailgun` };
    }
    case 'expo': {
      if (x.accessToken && !/^[A-Za-z0-9_\-]{20,}$/.test(x.accessToken)) {
        return { ok: false, live: false, message: 'El access token de Expo tiene un formato inválido' };
      }
      return {
        ok: true,
        live: false,
        message:
          'Expo no ofrece una verificación de credenciales sin enviar un push: se validó el formato. ' +
          'Confírmalo enviando un push de prueba a G3 Drive.',
      };
    }
    case 'meta_cloud': {
      const id = str(s.phoneNumberId);
      if (!/^\d{6,20}$/.test(id)) return { ok: false, live: false, message: 'El Phone number ID debe ser numérico' };
      const res = await get(f, `${META_GRAPH_BASE}/${id}?fields=display_phone_number,verified_name`, { authorization: `Bearer ${x.accessToken}` }, t);
      if (!res.ok) return fail(provider, res);
      const json = await readJson(res);
      return {
        ok: true,
        live: true,
        message: `Número de WhatsApp verificado: ${str(json?.display_phone_number) || id}${json?.verified_name ? ` (${str(json.verified_name)})` : ''}`,
      };
    }
    case 'stripe': {
      if (!/^sk_(test|live)_/.test(x.secretKey) && !/^rk_(test|live)_/.test(x.secretKey)) {
        return { ok: false, live: false, message: 'La secret key de Stripe debe empezar con sk_test_/sk_live_ (o rk_ restringida)' };
      }
      if (!/^pk_(test|live)_/.test(str(s.publishableKey))) return { ok: false, live: false, message: 'La publishable key debe empezar con pk_test_ o pk_live_' };
      if (!/^whsec_/.test(x.webhookSecret)) return { ok: false, live: false, message: 'El webhook secret debe empezar con whsec_' };
      const mode = (k: string) => (/_live_/.test(k) ? 'live' : 'test');
      if (mode(x.secretKey) !== mode(str(s.publishableKey))) {
        return { ok: false, live: false, message: 'La publishable key y la secret key son de modos distintos (test/live)' };
      }
      const res = await get(f, 'https://api.stripe.com/v1/balance', { authorization: `Bearer ${x.secretKey}` }, t);
      if (!res.ok) return fail(provider, res);
      const json = await readJson(res);
      return { ok: true, live: true, message: `Cuenta de Stripe verificada (modo ${json?.livemode === true ? 'live' : 'test'})` };
    }
    case 'diverza':
    case 'facturama': {
      if (!RFC_RE.test(str(s.rfc).toUpperCase())) return { ok: false, live: false, message: 'RFC emisor con formato inválido' };
      return { ok: true, live: false, message: `Formato válido. ${providerLabel(provider)} se verificará al primer timbrado.` };
    }
    case 'vertex': {
      if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(str(s.projectId))) return { ok: false, live: false, message: 'ID de proyecto GCP inválido' };
      return { ok: true, live: false, message: 'Formato válido. Vertex AI se verificará al primer uso.' };
    }
    case 'gcs': {
      if (!/^[a-z0-9][a-z0-9._-]{1,61}[a-z0-9]$/.test(str(s.bucket))) return { ok: false, live: false, message: 'Nombre de bucket inválido' };
      return { ok: true, live: false, message: 'Formato válido. El bucket se verificará al primer uso.' };
    }
    default:
      return { ok: false, live: false, message: `Proveedor no soportado para ${category}: ${provider}` };
  }
}
