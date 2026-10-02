/**
 * HTTP mínimo e inyectable: los adaptadores reciben un `fetch` (el global en
 * runtime, uno falso en tests) y nunca dependen de SDKs de los proveedores.
 */

export interface HttpResponseLike {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

export interface HttpRequestInit {
  method: string;
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

export type FetchLike = (url: string, init: HttpRequestInit) => Promise<HttpResponseLike>;

/** `fetch` global adaptado a `FetchLike`. */
export const globalFetch: FetchLike = (url, init) => fetch(url, init);

export const DEFAULT_TIMEOUT_MS = 10_000;

export class HttpTimeoutError extends Error {
  constructor(readonly timeoutMs: number) {
    super(`Tiempo de espera agotado (${Math.round(timeoutMs / 1000)} s)`);
    this.name = 'HttpTimeoutError';
  }
}

/**
 * Llama con timeout. Aborta la petición (AbortController) y, por si el
 * `fetch` inyectado ignora la señal, también corta con una carrera.
 */
export async function requestWithTimeout(
  fetchImpl: FetchLike,
  url: string,
  init: HttpRequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<HttpResponseLike> {
  const ac = new AbortController();
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      ac.abort();
      reject(new HttpTimeoutError(timeoutMs));
    }, timeoutMs);
    timer.unref?.();
  });
  try {
    return await Promise.race([fetchImpl(url, { ...init, signal: ac.signal }), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function basicAuth(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`, 'utf8').toString('base64')}`;
}

export function form(values: Record<string, string>): string {
  return new URLSearchParams(values).toString();
}

export async function readJson(res: HttpResponseLike): Promise<Record<string, unknown> | null> {
  try {
    const text = await res.text();
    if (!text) return null;
    const v = JSON.parse(text) as unknown;
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Quita de un texto cualquier aparición de los secretos dados (y su forma
 * base64 de basic auth) y lo acota. Úsalo en TODO mensaje que pueda salir
 * hacia logs, respuestas HTTP o la bitácora.
 */
export function redact(text: string, secrets: (string | undefined | null)[], max = 300): string {
  let out = String(text ?? '');
  for (const s of secrets) {
    if (!s || s.length < 4) continue;
    out = out.split(s).join('***');
    const b64 = Buffer.from(s, 'utf8').toString('base64');
    if (b64.length >= 6) out = out.split(b64).join('***');
  }
  return out.length > max ? `${out.slice(0, max)}…` : out;
}

/** Resultado de una entrega (SMS, correo, push, WhatsApp). Nunca lanza por HTTP. */
export interface DeliveryResult {
  ok: boolean;
  /** `HTTP 401`, `sin token push`, `Tiempo de espera agotado (10 s)`… */
  error?: string;
  /** Detalle del proveedor, ya sin secretos. */
  detail?: string;
  providerMessageId?: string;
}

/** Convierte una respuesta no-2xx en `DeliveryResult` sin filtrar secretos. */
export async function failedDelivery(
  res: HttpResponseLike,
  secrets: (string | undefined | null)[],
  pickMessage: (json: Record<string, unknown>) => unknown = defaultErrorMessage,
): Promise<DeliveryResult> {
  const json = await readJson(res);
  const msg = json ? pickMessage(json) : null;
  return {
    ok: false,
    error: `HTTP ${res.status}`,
    ...(typeof msg === 'string' && msg ? { detail: redact(msg, secrets) } : {}),
  };
}

export function deliveryException(e: unknown, secrets: (string | undefined | null)[]): DeliveryResult {
  if (e instanceof HttpTimeoutError) return { ok: false, error: e.message };
  return { ok: false, error: 'Error de red', detail: redact((e as Error)?.message ?? String(e), secrets) };
}

function defaultErrorMessage(json: Record<string, unknown>): unknown {
  const err = json.error as Record<string, unknown> | string | undefined;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && typeof err.message === 'string') return err.message;
  if (typeof json.message === 'string') return json.message;
  const errors = json.errors as { message?: string }[] | undefined;
  if (Array.isArray(errors) && typeof errors[0]?.message === 'string') return errors[0].message;
  return null;
}
