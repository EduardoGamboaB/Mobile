import {
  deliveryException,
  failedDelivery,
  readJson,
  redact,
  requestWithTimeout,
  type DeliveryResult,
  type FetchLike,
} from './http';

export interface PushMessage {
  /** Token de Expo Push (`ExponentPushToken[…]`). */
  to: string;
  title: string;
  body: string;
  priority?: 'default' | 'normal' | 'high';
  sound?: 'default' | null;
  data?: Record<string, unknown>;
}

export interface PushNotifier {
  readonly live: boolean;
  readonly provider: string;
  send(m: PushMessage): Promise<DeliveryResult>;
}

export const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
export const EXPO_TOKEN_RE = /^(Exponent|Expo)PushToken\[[^\]]+\]$/;

/** Expo Push API. https://docs.expo.dev/push-notifications/sending-notifications/ */
export class ExpoPushClient implements PushNotifier {
  readonly live = true;
  readonly provider = 'expo';
  constructor(
    private readonly fetchImpl: FetchLike,
    private readonly accessToken?: string,
    private readonly endpoint = EXPO_PUSH_ENDPOINT,
  ) {}

  buildRequest(m: PushMessage) {
    const headers: Record<string, string> = { 'content-type': 'application/json', accept: 'application/json' };
    if (this.accessToken) headers.authorization = `Bearer ${this.accessToken}`;
    return {
      url: this.endpoint,
      init: {
        method: 'POST',
        headers,
        body: JSON.stringify({
          to: m.to,
          title: m.title,
          body: m.body,
          priority: m.priority ?? 'default',
          sound: m.sound === undefined ? 'default' : m.sound,
          ...(m.data ? { data: m.data } : {}),
        }),
      },
    };
  }

  async send(m: PushMessage): Promise<DeliveryResult> {
    if (!m.to) return { ok: false, error: 'sin token push' };
    const { url, init } = this.buildRequest(m);
    const secrets = [this.accessToken];
    try {
      const res = await requestWithTimeout(this.fetchImpl, url, init);
      if (!res.ok) return failedDelivery(res, secrets);
      // Expo responde 200 con un "ticket" por mensaje; el error puede venir ahí.
      const json = await readJson(res);
      const ticket = json?.data as { status?: string; id?: string; message?: string; details?: { error?: string } } | undefined;
      if (ticket?.status === 'error') {
        return {
          ok: false,
          error: ticket.details?.error ?? 'error de Expo',
          ...(ticket.message ? { detail: redact(ticket.message, secrets) } : {}),
        };
      }
      return { ok: true, ...(ticket?.id ? { providerMessageId: ticket.id } : {}) };
    } catch (e) {
      return deliveryException(e, secrets);
    }
  }
}

export class LoggingPushNotifier implements PushNotifier {
  readonly live = false;
  readonly provider = 'log';
  readonly sent: PushMessage[] = [];
  async send(m: PushMessage): Promise<DeliveryResult> {
    this.sent.push(m);
    return { ok: true };
  }
}
