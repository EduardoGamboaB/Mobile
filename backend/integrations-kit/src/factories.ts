import type { ResolvedIntegrationDto } from '@g3/contracts';
import { globalFetch, type FetchLike } from './http';
import { LoggingSmsSender, TwilioSmsSender, VonageSmsSender, type SmsSender } from './sms';
import { LoggingEmailSender, MailgunEmailSender, SendGridEmailSender, type EmailSender } from './email';
import { ExpoPushClient, LoggingPushNotifier, type PushNotifier } from './push';
import { LoggingWhatsAppNotifier, WhatsAppCloudClient, type WhatsAppNotifier } from './whatsapp';

export interface FactoryOptions {
  fetch?: FetchLike;
  log?: (msg: string) => void;
}

const s = (v: unknown) => (typeof v === 'string' ? v : '');
const usable = (r: ResolvedIntegrationDto | null | undefined): r is ResolvedIntegrationDto =>
  !!r && r.source !== 'none' && !!r.provider;

/**
 * Adaptador real para la configuración resuelta, o uno de REGISTRO (no
 * envía) si no hay proveedor (`source: 'none'`, deshabilitado) o le faltan
 * credenciales.
 */
export function buildSmsSender(r: ResolvedIntegrationDto | null | undefined, o: FactoryOptions = {}): SmsSender {
  const f = o.fetch ?? globalFetch;
  if (usable(r)) {
    if (r.provider === 'twilio' && s(r.settings.accountSid) && r.secrets.authToken && s(r.settings.from)) {
      return new TwilioSmsSender(f, { accountSid: s(r.settings.accountSid), authToken: r.secrets.authToken, from: s(r.settings.from) });
    }
    if (r.provider === 'vonage' && s(r.settings.apiKey) && r.secrets.apiSecret && s(r.settings.from)) {
      return new VonageSmsSender(f, { apiKey: s(r.settings.apiKey), apiSecret: r.secrets.apiSecret, from: s(r.settings.from) });
    }
  }
  return new LoggingSmsSender(o.log);
}

export function buildEmailSender(r: ResolvedIntegrationDto | null | undefined, o: FactoryOptions = {}): EmailSender {
  const f = o.fetch ?? globalFetch;
  if (usable(r)) {
    if (r.provider === 'sendgrid' && r.secrets.apiKey && s(r.settings.fromEmail)) {
      return new SendGridEmailSender(f, { apiKey: r.secrets.apiKey, fromEmail: s(r.settings.fromEmail), fromName: s(r.settings.fromName) || undefined });
    }
    if (r.provider === 'mailgun' && r.secrets.apiKey && s(r.settings.domain) && s(r.settings.fromEmail)) {
      return new MailgunEmailSender(f, {
        apiKey: r.secrets.apiKey,
        domain: s(r.settings.domain),
        region: s(r.settings.region) || 'us',
        fromEmail: s(r.settings.fromEmail),
        fromName: s(r.settings.fromName) || undefined,
      });
    }
  }
  return new LoggingEmailSender(o.log);
}

export function buildPushNotifier(r: ResolvedIntegrationDto | null | undefined, o: FactoryOptions = {}): PushNotifier {
  if (usable(r) && r.provider === 'expo') return new ExpoPushClient(o.fetch ?? globalFetch, r.secrets.accessToken || undefined);
  return new LoggingPushNotifier();
}

export function buildWhatsAppNotifier(r: ResolvedIntegrationDto | null | undefined, o: FactoryOptions = {}): WhatsAppNotifier {
  if (usable(r) && r.provider === 'meta_cloud' && s(r.settings.phoneNumberId) && r.secrets.accessToken) {
    return new WhatsAppCloudClient(o.fetch ?? globalFetch, {
      phoneNumberId: s(r.settings.phoneNumberId),
      accessToken: r.secrets.accessToken,
      template: s(r.settings.template) || undefined,
      language: s(r.settings.language) || undefined,
    });
  }
  return new LoggingWhatsAppNotifier();
}
