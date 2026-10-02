import type { AuditAction, AuditActorDto } from '@g3/contracts';
import { globalFetch, requestWithTimeout, type FetchLike } from '@g3/integrations';

export type IntegrationAuditAction = Extract<AuditAction, 'integration.updated' | 'integration.deleted' | 'integration.tested'>;

/** Evento para la bitácora encadenada de auth. `metadata` NUNCA lleva secretos. */
export interface IntegrationAuditEvent {
  companyId: string;
  actor: AuditActorDto;
  action: IntegrationAuditAction;
  resource: { type: 'integration'; id: string | null };
  ip: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
}

export interface AuditSink {
  record(e: IntegrationAuditEvent): Promise<void>;
}

/**
 * Ingesta interna de auth: `POST {AUTH_URL}/api/audit/events` con
 * `x-internal-token`. Si auth no responde se avisa por log y la operación
 * sigue (la configuración ya quedó guardada).
 */
export class HttpAuditSink implements AuditSink {
  constructor(
    private readonly authUrl: string,
    private readonly internalToken: string,
    private readonly fetchImpl: FetchLike = globalFetch,
    private readonly log: (msg: string) => void = (m) => console.warn(m),
  ) {}

  async record(e: IntegrationAuditEvent): Promise<void> {
    try {
      const res = await requestWithTimeout(
        this.fetchImpl,
        `${this.authUrl.replace(/\/$/, '')}/api/audit/events`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-internal-token': this.internalToken, 'user-agent': 'integrations-service' },
          body: JSON.stringify(e),
        },
        5_000,
      );
      if (!res.ok) this.log(`[integrations-service] auditoría rechazada por auth (HTTP ${res.status}): ${e.action}`);
    } catch {
      this.log(`[integrations-service] auth no disponible para auditar ${e.action}`);
    }
  }
}

export class RecordingAuditSink implements AuditSink {
  readonly events: IntegrationAuditEvent[] = [];
  async record(e: IntegrationAuditEvent): Promise<void> {
    this.events.push(JSON.parse(JSON.stringify(e)) as IntegrationAuditEvent);
  }
}

/** Sin AUTH_URL (desarrollo): solo deja rastro en el log, sin metadata. */
export class LogAuditSink implements AuditSink {
  async record(e: IntegrationAuditEvent): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[integrations-service] auditoría ${e.action} compañía=${e.companyId} recurso=${e.resource.id ?? '-'}`);
  }
}
