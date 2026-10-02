import type { IncidentDto, NotificationChannel } from '@g3/contracts';
import {
  buildPushNotifier,
  buildWhatsAppNotifier,
  ExpoPushClient,
  WhatsAppCloudClient,
  type DeliveryResult,
  type FetchLike as KitFetch,
  type IntegrationResolver,
  type PushMessage,
  type WhatsAppTemplateMessage,
} from '@g3/integrations';
import type { ContactDirectory } from './incidents.repo';

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

/** Adapta el `fetch` de alerts (body obligatorio) al del kit de integraciones. */
const toKitFetch = (f: FetchLike): KitFetch => (url, init) =>
  f(url, { method: init.method, headers: init.headers, body: init.body ?? '' });

export function incidentHeadline(i: IncidentDto): string {
  return `${i.urgency === 'critical' ? '🚨 ' : ''}${i.folio} · ${i.title}`;
}

const URGENCY_ES: Record<IncidentDto['urgency'], string> = { low: 'Baja', medium: 'Media', high: 'Alta', critical: 'CRÍTICA' };

/** Mensaje push de un incidente (independiente del proveedor). */
export function incidentPush(n: OutboundNotification): PushMessage {
  return {
    to: n.to.pushToken ?? '',
    title: incidentHeadline(n.incident),
    body: `${n.reason} · ${n.incident.description}`.slice(0, 240),
    priority: n.incident.urgency === 'critical' || n.incident.urgency === 'high' ? 'high' : 'default',
    sound: 'default',
    data: { incidentId: n.incident.id, folio: n.incident.folio, kind: 'incident' },
  };
}

/** Plantilla `g3_incidente`: folio, título, urgencia, motivo. */
export function incidentTemplate(n: OutboundNotification): WhatsAppTemplateMessage {
  return {
    to: n.to.whatsapp ?? '',
    parameters: [n.incident.folio, n.incident.title, URGENCY_ES[n.incident.urgency], n.reason],
  };
}

const toResult = (channel: NotificationChannel, userId: string, r: DeliveryResult): NotificationResult =>
  r.ok ? { channel, userId, ok: true } : { channel, userId, ok: false, error: r.error ?? 'error' };

/** Push vía Expo Push API (adaptador de @g3/integrations). https://docs.expo.dev/push-notifications/sending-notifications/ */
export class ExpoPushNotifier implements Notifier {
  readonly channel = 'push' as const;
  private readonly client: ExpoPushClient;
  constructor(fetchImpl: FetchLike, accessToken?: string, endpoint?: string) {
    this.client = new ExpoPushClient(toKitFetch(fetchImpl), accessToken, endpoint);
  }

  buildRequest(n: OutboundNotification) {
    return JSON.parse(this.client.buildRequest(incidentPush(n)).init.body) as Record<string, unknown>;
  }

  async send(n: OutboundNotification): Promise<NotificationResult> {
    if (!n.to.pushToken) return { channel: 'push', userId: n.to.userId, ok: false, error: 'sin token push' };
    return toResult('push', n.to.userId, await this.client.send(incidentPush(n)));
  }
}

/**
 * WhatsApp Cloud API (Meta). Fuera de la ventana de 24 h solo se permiten
 * plantillas aprobadas: se usa la plantilla `g3_incidente` con 4 parámetros
 * (folio, título, urgencia, motivo). https://developers.facebook.com/docs/whatsapp/cloud-api
 */
export class WhatsAppCloudNotifier implements Notifier {
  readonly channel = 'whatsapp' as const;
  private readonly client: WhatsAppCloudClient;
  constructor(
    fetchImpl: FetchLike,
    cfg: { phoneNumberId: string; accessToken: string; template?: string; lang?: string },
    apiBase?: string,
  ) {
    this.client = new WhatsAppCloudClient(
      toKitFetch(fetchImpl),
      { phoneNumberId: cfg.phoneNumberId, accessToken: cfg.accessToken, template: cfg.template, language: cfg.lang },
      apiBase,
    );
  }

  buildRequest(n: OutboundNotification) {
    return JSON.parse(this.client.buildRequest(incidentTemplate(n)).init.body) as Record<string, unknown>;
  }

  async send(n: OutboundNotification): Promise<NotificationResult> {
    if (!n.to.whatsapp) return { channel: 'whatsapp', userId: n.to.userId, ok: false, error: 'sin WhatsApp' };
    return toResult('whatsapp', n.to.userId, await this.client.sendTemplate(incidentTemplate(n)));
  }
}

/**
 * Push con el proveedor que resuelva integrations para la compañía del
 * incidente (push es de plataforma: plataforma → entorno). Sin proveedor,
 * modo registro (no envía).
 */
export class ResolvedPushNotifier implements Notifier {
  readonly channel = 'push' as const;
  constructor(private readonly resolver: IntegrationResolver, private readonly fetchImpl?: KitFetch) {}

  async send(n: OutboundNotification): Promise<NotificationResult> {
    if (!n.to.pushToken) return { channel: 'push', userId: n.to.userId, ok: false, error: 'sin token push' };
    try {
      const notifier = buildPushNotifier(await this.resolver.resolve(n.incident.companyId, 'push'), { fetch: this.fetchImpl });
      return toResult('push', n.to.userId, await notifier.send(incidentPush(n)));
    } catch (e) {
      return { channel: 'push', userId: n.to.userId, ok: false, error: (e as Error).message };
    }
  }
}

/** WhatsApp con el número de la compañía → el de la plataforma → el de entorno. */
export class ResolvedWhatsAppNotifier implements Notifier {
  readonly channel = 'whatsapp' as const;
  constructor(private readonly resolver: IntegrationResolver, private readonly fetchImpl?: KitFetch) {}

  async send(n: OutboundNotification): Promise<NotificationResult> {
    if (!n.to.whatsapp) return { channel: 'whatsapp', userId: n.to.userId, ok: false, error: 'sin WhatsApp' };
    try {
      const notifier = buildWhatsAppNotifier(await this.resolver.resolve(n.incident.companyId, 'whatsapp'), { fetch: this.fetchImpl });
      return toResult('whatsapp', n.to.userId, await notifier.sendTemplate(incidentTemplate(n)));
    } catch (e) {
      return { channel: 'whatsapp', userId: n.to.userId, ok: false, error: (e as Error).message };
    }
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

/** Contactos de notificación por compañía (dev/tests). En producción: `PgContactDirectory`. */
export class InMemoryContactDirectory implements ContactDirectory {
  private readonly byCompany = new Map<string, Map<string, Recipient>>();

  async upsert(companyId: string, r: Recipient) {
    const m = this.byCompany.get(companyId) ?? new Map<string, Recipient>();
    const defined = Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined)) as Recipient;
    m.set(r.userId, { pushToken: null, whatsapp: null, ...(m.get(r.userId) ?? {}), ...defined });
    this.byCompany.set(companyId, m);
    return { ...m.get(r.userId)! };
  }

  async findByRoles(companyId: string, roles: string[]): Promise<Recipient[]> {
    return [...(this.byCompany.get(companyId)?.values() ?? [])].filter((r) => roles.includes(r.role)).map((r) => ({ ...r }));
  }

  async findByUser(companyId: string, userId: string): Promise<Recipient | null> {
    const r = this.byCompany.get(companyId)?.get(userId);
    return r ? { ...r } : null;
  }
}
