import type { AuditAction, AuditActorDto } from '@g3/contracts';
import { serviceFetchFromEnv } from '@g3/platform';

/** Lo que el sink necesita de `fetch` (lo cumplen `fetch` y `serviceFetch` de @g3/platform). */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Evento para la bitácora de auditoría encadenada del servicio auth
 * (`POST /api/audit/events`, acciones en `INGESTABLE`).
 */
export interface AuditEventInput {
  companyId: string;
  actor: AuditActorDto;
  action: AuditAction;
  resource: { type: string; id: string | null };
  ip: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
}

export interface AuditSink {
  record(event: AuditEventInput): Promise<void>;
}

/** Para tests: guarda los eventos; `failWith` simula que auth no responde. */
export class RecordingAuditSink implements AuditSink {
  events: AuditEventInput[] = [];
  failWith: Error | null = null;
  async record(event: AuditEventInput): Promise<void> {
    if (this.failWith) throw this.failWith;
    this.events.push(event);
  }
}

/** Sin auth configurado (desarrollo local): no registra nada. */
export class NoopAuditSink implements AuditSink {
  async record(): Promise<void> {
    /* auditoría deshabilitada */
  }
}

/**
 * Ingesta HTTP servicio→servicio hacia auth con `x-internal-token`. Lanza si
 * la respuesta no es 2xx o se excede `timeoutMs`; quien llama decide. En
 * `auditSinkFromEnv` el fetch es `serviceFetch` de @g3/platform, que con
 * `SERVICE_AUTH=gcp` agrega además el ID token de Cloud Run.
 */
export class HttpAuditSink implements AuditSink {
  private readonly url: string;
  private readonly token: string;
  private readonly fetchFn: FetchLike;
  private readonly timeoutMs: number;

  constructor(opts: { authUrl: string; internalToken: string; fetch?: FetchLike; timeoutMs?: number }) {
    this.url = `${opts.authUrl.replace(/\/+$/, '')}/api/audit/events`;
    this.token = opts.internalToken;
    this.fetchFn = opts.fetch ?? fetch.bind(globalThis);
    this.timeoutMs = opts.timeoutMs ?? 3000;
  }

  async record(event: AuditEventInput): Promise<void> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const r = await this.fetchFn(this.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-internal-token': this.token },
        body: JSON.stringify(event),
        signal: ctrl.signal,
      });
      if (!r.ok) throw new Error(`auditoría respondió ${r.status}`);
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * `AUTH_URL` + token (`AUDIT_INGEST_TOKEN`, o `INTERNAL_TOKEN` si es el mismo
 * secreto compartido). En auth el token debe coincidir con su AUDIT_INGEST_TOKEN.
 */
export function auditSinkFromEnv(env: Record<string, string | undefined> = process.env): AuditSink {
  const token = env.AUDIT_INGEST_TOKEN || env.INTERNAL_TOKEN || '';
  const authUrl = env.AUTH_URL || '';
  if (!token || !authUrl) return new NoopAuditSink();
  // serviceFetch manda como x-internal-token el secreto que auth espera en su ingesta.
  const serviceFetch = serviceFetchFromEnv({ ...env, INTERNAL_TOKEN: token });
  return new HttpAuditSink({ authUrl, internalToken: token, fetch: serviceFetch });
}
