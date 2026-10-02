import {
  basicAuth,
  deliveryException,
  failedDelivery,
  form,
  requestWithTimeout,
  type DeliveryResult,
  type FetchLike,
} from './http';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailSender {
  readonly live: boolean;
  readonly provider: string;
  send(msg: EmailMessage): Promise<DeliveryResult>;
}

export interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
}

/** https://www.twilio.com/docs/sendgrid/api-reference/mail-send/mail-send (202 = aceptado). */
export class SendGridEmailSender implements EmailSender {
  readonly live = true;
  readonly provider = 'sendgrid';
  constructor(
    private readonly fetchImpl: FetchLike,
    private readonly cfg: SendGridConfig,
    private readonly apiBase = 'https://api.sendgrid.com',
  ) {}

  buildRequest(m: EmailMessage) {
    return {
      url: `${this.apiBase}/v3/mail/send`,
      init: {
        method: 'POST',
        headers: { authorization: `Bearer ${this.cfg.apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: m.to }] }],
          from: { email: this.cfg.fromEmail, ...(this.cfg.fromName ? { name: this.cfg.fromName } : {}) },
          subject: m.subject,
          content: [{ type: 'text/plain', value: m.text }],
        }),
      },
    };
  }

  async send(m: EmailMessage): Promise<DeliveryResult> {
    const { url, init } = this.buildRequest(m);
    try {
      const res = await requestWithTimeout(this.fetchImpl, url, init);
      return res.ok ? { ok: true } : failedDelivery(res, [this.cfg.apiKey]);
    } catch (e) {
      return deliveryException(e, [this.cfg.apiKey]);
    }
  }
}

export interface MailgunConfig {
  apiKey: string;
  domain: string;
  region?: 'us' | 'eu' | string;
  fromEmail: string;
  fromName?: string;
}

export function mailgunBase(region?: string): string {
  return region === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net';
}

/** https://documentation.mailgun.com/docs/mailgun/api-reference/openapi-final/tag/Messages/ */
export class MailgunEmailSender implements EmailSender {
  readonly live = true;
  readonly provider = 'mailgun';
  constructor(private readonly fetchImpl: FetchLike, private readonly cfg: MailgunConfig) {}

  buildRequest(m: EmailMessage) {
    const from = this.cfg.fromName ? `${this.cfg.fromName} <${this.cfg.fromEmail}>` : this.cfg.fromEmail;
    return {
      url: `${mailgunBase(this.cfg.region)}/v3/${encodeURIComponent(this.cfg.domain)}/messages`,
      init: {
        method: 'POST',
        headers: {
          authorization: basicAuth('api', this.cfg.apiKey),
          'content-type': 'application/x-www-form-urlencoded',
          accept: 'application/json',
        },
        body: form({ from, to: m.to, subject: m.subject, text: m.text }),
      },
    };
  }

  async send(m: EmailMessage): Promise<DeliveryResult> {
    const { url, init } = this.buildRequest(m);
    try {
      const res = await requestWithTimeout(this.fetchImpl, url, init);
      return res.ok ? { ok: true } : failedDelivery(res, [this.cfg.apiKey]);
    } catch (e) {
      return deliveryException(e, [this.cfg.apiKey]);
    }
  }
}

/** Modo registro: no envía (sin proveedor configurado). */
export class LoggingEmailSender implements EmailSender {
  readonly live = false;
  readonly provider = 'log';
  readonly sent: EmailMessage[] = [];
  constructor(private readonly log: (msg: string) => void = () => undefined) {}
  async send(m: EmailMessage): Promise<DeliveryResult> {
    this.sent.push(m);
    this.log(`[email:registro] "${m.subject}" (sin proveedor configurado; no se envió)`);
    return { ok: true };
  }
}
