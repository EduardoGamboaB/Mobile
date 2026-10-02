import type { IncidentDto, NotificationChannel } from '@g3/contracts';

/** Persona a notificar, con los canales que tiene dados de alta. */
export interface Recipient {
  userId: string;
  role: string;
  /** Token de Expo Push de G3 Drive / app de supervisión. */
  pushToken?: string | null;
  /** Número E.164 con WhatsApp (p.ej. +5215512345678). */
  whatsapp?: string | null;
}

export interface OutboundNotification {
  channel: NotificationChannel;
  to: Recipient;
  incident: IncidentDto;
  /** Motivo: alta, SOS, vencimiento de SLA… */
  reason: string;
}

export interface NotificationResult {
  channel: NotificationChannel;
  userId: string;
  ok: boolean;
  error?: string;
}

export interface Notifier {
  readonly channel: NotificationChannel;
  send(n: OutboundNotification): Promise<NotificationResult>;
}

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
}>;

export function incidentHeadline(i: IncidentDto): string {
  return `${i.urgency === 'critical' ? '🚨 ' : ''}${i.folio} · ${i.title}`;
}

/** Push vía Expo Push API (G3 Drive es Expo). https://docs.expo.dev/push-notifications/sending-notifications/ */
export class ExpoPushNotifier implements Notifier {
  readonly channel = 'push' as const;
  constructor(
    private readonly fetchImpl: FetchLike,
    private readonly accessToken?: string,
    private readonly endpoint = 'https://exp.host/--/api/v2/push/send',
  ) {}

  buildRequest(n: OutboundNotification) {
    return {
      to: n.to.pushToken,
      title: incidentHeadline(n.incident),
      body: `${n.reason} · ${n.incident.description}`.slice(0, 240),
      priority: n.incident.urgency === 'critical' || n.incident.urgency === 'high' ? 'high' : 'default',
      sound: 'default',
      data: { incidentId: n.incident.id, folio: n.incident.folio, kind: 'incident' },
    };
  }

  async send(n: OutboundNotification): Promise<NotificationResult> {
    if (!n.to.pushToken) return { channel: 'push', userId: n.to.userId, ok: false, error: 'sin token push' };
    const headers: Record<string, string> = { 'content-type': 'application/json', accept: 'application/json' };
    if (this.accessToken) headers.authorization = `Bearer ${this.accessToken}`;
    const res = await this.fetchImpl(this.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(this.buildRequest(n)),
    });
    return res.ok
      ? { channel: 'push', userId: n.to.userId, ok: true }
      : { channel: 'push', userId: n.to.userId, ok: false, error: `HTTP ${res.status}` };
  }
}

/**
 * WhatsApp Cloud API (Meta). Fuera de la ventana de 24 h solo se permiten
 * plantillas aprobadas: se usa la plantilla `g3_incidente` con 4 parámetros
 * (folio, título, urgencia, motivo). https://developers.facebook.com/docs/whatsapp/cloud-api
 */
export class WhatsAppCloudNotifier implements Notifier {
  readonly channel = 'whatsapp' as const;
  constructor(
    private readonly fetchImpl: FetchLike,
    private readonly cfg: { phoneNumberId: string; accessToken: string; template?: string; lang?: string },
    private readonly apiBase = 'https://graph.facebook.com/v20.0',
  ) {}

  buildRequest(n: OutboundNotification) {
    const urgency = { low: 'Baja', medium: 'Media', high: 'Alta', critical: 'CRÍTICA' }[n.incident.urgency];
    return {
      messaging_product: 'whatsapp',
      to: (n.to.whatsapp ?? '').replace(/[^\d]/g, ''),
      type: 'template',
      template: {
        name: this.cfg.template ?? 'g3_incidente',
        language: { code: this.cfg.lang ?? 'es_MX' },
        components: [
          {
            type: 'body',
            parameters: [n.incident.folio, n.incident.title, urgency, n.reason].map((text) => ({
              type: 'text',
              text: text.slice(0, 120),
            })),
          },
        ],
      },
    };
  }

  async send(n: OutboundNotification): Promise<NotificationResult> {
    if (!n.to.whatsapp) return { channel: 'whatsapp', userId: n.to.userId, ok: false, error: 'sin WhatsApp' };
    const res = await this.fetchImpl(`${this.apiBase}/${this.cfg.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.cfg.accessToken}` },
      body: JSON.stringify(this.buildRequest(n)),
    });
    return res.ok
      ? { channel: 'whatsapp', userId: n.to.userId, ok: true }
      : { channel: 'whatsapp', userId: n.to.userId, ok: false, error: `HTTP ${res.status}` };
  }
}

/** Notificador de desarrollo/tests: guarda lo que se habría enviado. */
export class RecordingNotifier implements Notifier {
  readonly sent: OutboundNotification[] = [];
  constructor(readonly channel: NotificationChannel) {}
  async send(n: OutboundNotification): Promise<NotificationResult> {
    this.sent.push(n);
    return { channel: this.channel, userId: n.to.userId, ok: true };
  }
}

/** Contactos de notificación por compañía. En producción: tabla en Postgres. */
export class InMemoryContactDirectory {
  private readonly byCompany = new Map<string, Map<string, Recipient>>();

  async upsert(companyId: string, r: Recipient) {
    const m = this.byCompany.get(companyId) ?? new Map<string, Recipient>();
    m.set(r.userId, { ...(m.get(r.userId) ?? {}), ...r });
    this.byCompany.set(companyId, m);
    return { ...m.get(r.userId)! };
  }

  async findByRoles(companyId: string, roles: string[]): Promise<Recipient[]> {
    return [...(this.byCompany.get(companyId)?.values() ?? [])].filter((r) => roles.includes(r.role));
  }

  async findByUser(companyId: string, userId: string): Promise<Recipient | null> {
    return this.byCompany.get(companyId)?.get(userId) ?? null;
  }
}
