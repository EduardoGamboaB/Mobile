import {
  buildEmailSender,
  buildPushNotifier,
  buildSmsSender,
  buildWhatsAppNotifier,
  envFallbackFor,
  IntegrationsClient,
  LoggingSmsSender,
  MailgunEmailSender,
  SendGridEmailSender,
  TwilioSmsSender,
  VonageSmsSender,
} from '../src';
import type { ResolvedIntegrationDto } from '@g3/contracts';
import { fakeFetch } from './fake-fetch';

const TOKEN = 'internal-token-de-prueba-32-chars!!';
const remote = (over: Partial<ResolvedIntegrationDto> = {}): ResolvedIntegrationDto => ({
  category: 'whatsapp', slot: 'default', source: 'company', provider: 'meta_cloud',
  settings: { phoneNumberId: '111' }, secrets: { accessToken: 'tok' }, ...over,
});

describe('IntegrationsClient', () => {
  test('llama al endpoint interno con x-internal-token y cachea 60 s', async () => {
    let t = 0;
    const f = fakeFetch({ body: remote() });
    const c = new IntegrationsClient({ baseUrl: 'http://integrations:8088/', internalToken: TOKEN, fetch: f, env: {}, now: () => t });
    expect(await c.resolve('cmp_1', 'whatsapp')).toMatchObject({ source: 'company', provider: 'meta_cloud' });
    expect(f.calls[0].url).toBe('http://integrations:8088/api/integrations/internal/resolve?category=whatsapp&slot=default&companyId=cmp_1');
    expect(f.calls[0].init.headers['x-internal-token']).toBe(TOKEN);
    await c.resolve('cmp_1', 'whatsapp');
    expect(f.calls).toHaveLength(1);
    await c.resolve('cmp_2', 'whatsapp');
    expect(f.calls).toHaveLength(2);
    t = 60_001;
    await c.resolve('cmp_1', 'whatsapp');
    expect(f.calls).toHaveLength(3);
  });

  test('invalidate limpia por compañía/categoría o todo', async () => {
    const f = fakeFetch({ body: remote() });
    const c = new IntegrationsClient({ baseUrl: 'http://i', internalToken: TOKEN, fetch: f, env: {} });
    await c.resolve('cmp_1', 'whatsapp');
    await c.resolve('cmp_2', 'whatsapp');
    c.invalidate('cmp_1');
    await c.resolve('cmp_1', 'whatsapp');
    await c.resolve('cmp_2', 'whatsapp');
    expect(f.calls).toHaveLength(3);
    c.invalidate();
    await c.resolve('cmp_2', 'whatsapp');
    expect(f.calls).toHaveLength(4);
  });

  test('servicio dice none → variables de entorno de este proceso', async () => {
    const f = fakeFetch({ body: remote({ source: 'none', provider: null, settings: {}, secrets: {} }) });
    const c = new IntegrationsClient({
      baseUrl: 'http://i', internalToken: TOKEN, fetch: f,
      env: { WHATSAPP_PHONE_NUMBER_ID: '999', WHATSAPP_ACCESS_TOKEN: 'env-tok' },
    });
    expect(await c.resolve('cmp_1', 'whatsapp')).toEqual({
      category: 'whatsapp', slot: 'default', source: 'env', provider: 'meta_cloud',
      settings: { phoneNumberId: '999', template: 'g3_incidente', language: 'es_MX' }, secrets: { accessToken: 'env-tok' },
    });
  });

  test('servicio caído → entorno, sin cachear (reintenta) y avisa sin secretos', async () => {
    const msgs: string[] = [];
    const f = fakeFetch({ status: 503 });
    const c = new IntegrationsClient({ baseUrl: 'http://i', internalToken: TOKEN, fetch: f, env: {}, onError: (m) => msgs.push(m) });
    expect(await c.resolve('cmp_1', 'sms')).toMatchObject({ source: 'none', provider: null });
    await c.resolve('cmp_1', 'sms');
    expect(f.calls).toHaveLength(2);
    expect(msgs[0]).toContain('HTTP 503');
    expect(msgs.join()).not.toContain(TOKEN);
  });

  test('sin INTEGRATIONS_URL/INTERNAL_TOKEN solo usa el entorno', async () => {
    const f = fakeFetch({});
    const c = new IntegrationsClient({ fetch: f, env: { EXPO_PUSH_ENABLED: '1' } });
    expect(await c.resolve(null, 'push')).toMatchObject({ source: 'env', provider: 'expo' });
    expect(f.calls).toHaveLength(0);
  });
});

describe('envFallbackFor', () => {
  test('categorías sin respaldo y mínimas', () => {
    expect(envFallbackFor('sms', { TWILIO: 'x' })).toBeNull();
    expect(envFallbackFor('whatsapp', { WHATSAPP_PHONE_NUMBER_ID: '1' })).toBeNull();
    expect(envFallbackFor('payments', { STRIPE_SECRET_KEY: 'sk_test_1', STRIPE_WEBHOOK_SECRET: 'whsec' })).toMatchObject({
      provider: 'stripe', secrets: { secretKey: 'sk_test_1', webhookSecret: 'whsec' },
    });
    expect(envFallbackFor('push', { EXPO_PUSH_ENABLED: '0' })).toBeNull();
    expect(envFallbackFor('storage', { EVIDENCE_BUCKET: 'b' })).toMatchObject({ provider: 'gcs', settings: { bucket: 'b' } });
  });
});

describe('factories', () => {
  const r = (category: ResolvedIntegrationDto['category'], provider: string | null, settings = {}, secrets = {}, source: ResolvedIntegrationDto['source'] = 'company'): ResolvedIntegrationDto =>
    ({ category, slot: 'default', source, provider, settings, secrets });

  test('SMS', () => {
    expect(buildSmsSender(r('sms', 'twilio', { accountSid: 'AC1', from: '+1' }, { authToken: 't' }))).toBeInstanceOf(TwilioSmsSender);
    expect(buildSmsSender(r('sms', 'vonage', { apiKey: 'k', from: 'G3' }, { apiSecret: 's' }))).toBeInstanceOf(VonageSmsSender);
    expect(buildSmsSender(r('sms', null, {}, {}, 'none'))).toBeInstanceOf(LoggingSmsSender);
    // credenciales incompletas → registro, nunca un adaptador roto
    expect(buildSmsSender(r('sms', 'twilio', { accountSid: 'AC1' }, {})).live).toBe(false);
    expect(buildSmsSender(null).live).toBe(false);
  });

  test('correo', () => {
    expect(buildEmailSender(r('email', 'sendgrid', { fromEmail: 'a@b.mx' }, { apiKey: 'k' }))).toBeInstanceOf(SendGridEmailSender);
    expect(buildEmailSender(r('email', 'mailgun', { fromEmail: 'a@b.mx', domain: 'mg.b.mx' }, { apiKey: 'k' }))).toBeInstanceOf(MailgunEmailSender);
    expect(buildEmailSender(r('email', null, {}, {}, 'none')).live).toBe(false);
  });

  test('push y WhatsApp', () => {
    expect(buildPushNotifier(r('push', 'expo', {}, {}, 'env')).live).toBe(true);
    expect(buildPushNotifier(r('push', null, {}, {}, 'none')).live).toBe(false);
    expect(buildWhatsAppNotifier(r('whatsapp', 'meta_cloud', { phoneNumberId: '1' }, { accessToken: 't' })).live).toBe(true);
    expect(buildWhatsAppNotifier(r('whatsapp', 'meta_cloud', { phoneNumberId: '1' }, {})).live).toBe(false);
  });
});
