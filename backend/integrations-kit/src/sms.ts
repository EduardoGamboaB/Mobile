import {
  basicAuth,
  deliveryException,
  failedDelivery,
  form,
  readJson,
  redact,
  requestWithTimeout,
  type DeliveryResult,
  type FetchLike,
} from './http';

/** Envío de un SMS ya resuelto el proveedor (Twilio, Vonage o registro). */
export interface SmsSender {
  /** `true` si envía de verdad; `false` en modo registro. */
  readonly live: boolean;
  readonly provider: string;
  send(toE164: string, body: string): Promise<DeliveryResult>;
}

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  /** Número E.164 o Messaging Service SID (`MG…`). */
  from: string;
}

/** https://www.twilio.com/docs/messaging/api/message-resource#create-a-message-resource */
export class TwilioSmsSender implements SmsSender {
  readonly live = true;
  readonly provider = 'twilio';
  constructor(
    private readonly fetchImpl: FetchLike,
    private readonly cfg: TwilioConfig,
    private readonly apiBase = 'https://api.twilio.com/2010-04-01',
  ) {}

  buildRequest(to: string, body: string) {
    const params: Record<string, string> = { To: to, Body: body };
    if (/^MG/.test(this.cfg.from)) params.MessagingServiceSid = this.cfg.from;
    else params.From = this.cfg.from;
    return {
      url: `${this.apiBase}/Accounts/${encodeURIComponent(this.cfg.accountSid)}/Messages.json`,
      init: {
        method: 'POST',
        headers: {
          authorization: basicAuth(this.cfg.accountSid, this.cfg.authToken),
          'content-type': 'application/x-www-form-urlencoded',
          accept: 'application/json',
        },
        body: form(params),
      },
    };
  }

  async send(to: string, body: string): Promise<DeliveryResult> {
    const { url, init } = this.buildRequest(to, body);
    try {
      const res = await requestWithTimeout(this.fetchImpl, url, init);
      if (!res.ok) return failedDelivery(res, [this.cfg.authToken]);
      const json = await readJson(res);
      return { ok: true, ...(typeof json?.sid === 'string' ? { providerMessageId: json.sid } : {}) };
    } catch (e) {
      return deliveryException(e, [this.cfg.authToken]);
    }
  }
}

export interface VonageConfig {
  apiKey: string;
  apiSecret: string;
  from: string;
}

/** https://developer.vonage.com/en/api/sms — responde 200 aunque falle; el estado va por mensaje. */
export class VonageSmsSender implements SmsSender {
  readonly live = true;
  readonly provider = 'vonage';
  constructor(
    private readonly fetchImpl: FetchLike,
    private readonly cfg: VonageConfig,
    private readonly endpoint = 'https://rest.nexmo.com/sms/json',
  ) {}

  buildRequest(to: string, body: string) {
    return {
      url: this.endpoint,
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
        body: form({
          api_key: this.cfg.apiKey,
          api_secret: this.cfg.apiSecret,
          from: this.cfg.from,
          to: to.replace(/[^\d]/g, ''),
          text: body,
          type: 'unicode',
        }),
      },
    };
  }

  async send(to: string, body: string): Promise<DeliveryResult> {
    const { url, init } = this.buildRequest(to, body);
    const secrets = [this.cfg.apiSecret];
    try {
      const res = await requestWithTimeout(this.fetchImpl, url, init);
      if (!res.ok) return failedDelivery(res, secrets);
      const json = await readJson(res);
      const msg = (json?.messages as { status?: string; 'error-text'?: string; 'message-id'?: string }[] | undefined)?.[0];
      if (!msg || msg.status !== '0') {
        return {
          ok: false,
          error: `Vonage status ${msg?.status ?? 'desconocido'}`,
          ...(msg?.['error-text'] ? { detail: redact(msg['error-text'], secrets) } : {}),
        };
      }
      return { ok: true, ...(msg['message-id'] ? { providerMessageId: msg['message-id'] } : {}) };
    } catch (e) {
      return deliveryException(e, secrets);
    }
  }
}

/** Modo registro: no envía nada (sin proveedor configurado). Útil en dev y tests. */
export class LoggingSmsSender implements SmsSender {
  readonly live = false;
  readonly provider = 'log';
  readonly sent: { to: string; body: string }[] = [];
  constructor(private readonly log: (msg: string) => void = () => undefined) {}
  async send(to: string, body: string): Promise<DeliveryResult> {
    this.sent.push({ to, body });
    this.log(`[sms:registro] a ${to.slice(0, -4).replace(/\d/g, '•')}${to.slice(-4)} (sin proveedor configurado; no se envió)`);
    return { ok: true };
  }
}
