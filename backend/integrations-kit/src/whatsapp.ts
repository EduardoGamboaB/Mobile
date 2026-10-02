import {
  deliveryException,
  failedDelivery,
  readJson,
  requestWithTimeout,
  type DeliveryResult,
  type FetchLike,
} from './http';

export const META_GRAPH_BASE = 'https://graph.facebook.com/v20.0';

export interface WhatsAppTemplateMessage {
  /** E.164 (se le quitan los no dígitos). */
  to: string;
  /** Parámetros de texto del cuerpo de la plantilla, en orden. */
  parameters: string[];
}

export interface WhatsAppNotifier {
  readonly live: boolean;
  readonly provider: string;
  sendTemplate(m: WhatsAppTemplateMessage): Promise<DeliveryResult>;
}

export interface WhatsAppCloudConfig {
  phoneNumberId: string;
  accessToken: string;
  template?: string;
  language?: string;
}

/**
 * WhatsApp Cloud API (Meta). Fuera de la ventana de 24 h solo se permiten
 * plantillas aprobadas. https://developers.facebook.com/docs/whatsapp/cloud-api
 */
export class WhatsAppCloudClient implements WhatsAppNotifier {
  readonly live = true;
  readonly provider = 'meta_cloud';
  constructor(
    private readonly fetchImpl: FetchLike,
    private readonly cfg: WhatsAppCloudConfig,
    private readonly apiBase = META_GRAPH_BASE,
  ) {}

  buildRequest(m: WhatsAppTemplateMessage) {
    return {
      url: `${this.apiBase}/${encodeURIComponent(this.cfg.phoneNumberId)}/messages`,
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.cfg.accessToken}` },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: m.to.replace(/[^\d]/g, ''),
          type: 'template',
          template: {
            name: this.cfg.template || 'g3_incidente',
            language: { code: this.cfg.language || 'es_MX' },
            components: [
              { type: 'body', parameters: m.parameters.map((text) => ({ type: 'text', text: text.slice(0, 120) })) },
            ],
          },
        }),
      },
    };
  }

  async sendTemplate(m: WhatsAppTemplateMessage): Promise<DeliveryResult> {
    if (!m.to) return { ok: false, error: 'sin WhatsApp' };
    const { url, init } = this.buildRequest(m);
    const secrets = [this.cfg.accessToken];
    try {
      const res = await requestWithTimeout(this.fetchImpl, url, init);
      if (!res.ok) return failedDelivery(res, secrets);
      const json = await readJson(res);
      const id = (json?.messages as { id?: string }[] | undefined)?.[0]?.id;
      return { ok: true, ...(id ? { providerMessageId: id } : {}) };
    } catch (e) {
      return deliveryException(e, secrets);
    }
  }
}

export class LoggingWhatsAppNotifier implements WhatsAppNotifier {
  readonly live = false;
  readonly provider = 'log';
  readonly sent: WhatsAppTemplateMessage[] = [];
  async sendTemplate(m: WhatsAppTemplateMessage): Promise<DeliveryResult> {
    this.sent.push(m);
    return { ok: true };
  }
}
