import { testConnection, type FetchLike } from '../src';
import { decodeBasic, fakeFetch } from './fake-fetch';

const SID = 'AC' + '1'.repeat(32);
const clock = () => {
  let t = Date.parse('2026-10-02T12:00:00.000Z');
  return () => (t += 5);
};

describe('testConnection — prueba en vivo sin enviar mensajes', () => {
  test('Twilio: GET Accounts/{sid}.json (no crea mensajes)', async () => {
    const f = fakeFetch({ body: { status: 'active', friendly_name: 'G3 Prod' } });
    const r = await testConnection('sms', 'twilio', { accountSid: SID, from: '+15005550006' }, { authToken: 'tw-secret-token' }, f, { now: clock() });
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0].init.method).toBe('GET');
    expect(f.calls[0].url).toBe(`https://api.twilio.com/2010-04-01/Accounts/${SID}.json`);
    expect(decodeBasic(f.calls[0].init.headers.authorization)).toBe(`${SID}:tw-secret-token`);
    expect(r).toMatchObject({ ok: true, live: true, message: expect.stringContaining('G3 Prod') });
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
    expect(r.testedAt).toMatch(/^2026-10-02T12:00/);
  });

  test('Twilio: 401 → credenciales rechazadas, sin eco del token', async () => {
    const f = fakeFetch({ status: 401, body: { message: 'bad tw-secret-token' } });
    const r = await testConnection('sms', 'twilio', { accountSid: SID, from: '+15005550006' }, { authToken: 'tw-secret-token' }, f);
    expect(r).toMatchObject({ ok: false, live: true, message: 'Twilio rechazó las credenciales (HTTP 401)' });
    expect(JSON.stringify(r)).not.toContain('tw-secret-token');
  });

  test('Twilio: SID con formato inválido no llama a la red', async () => {
    const f = fakeFetch({});
    const r = await testConnection('sms', 'twilio', { accountSid: 'XX1', from: '+15005550006' }, { authToken: 't' }, f);
    expect(r).toMatchObject({ ok: false, live: false });
    expect(f.calls).toHaveLength(0);
  });

  test('Vonage: GET account/get-balance', async () => {
    const f = fakeFetch({ body: { value: 12.5 } });
    const r = await testConnection('sms', 'vonage', { apiKey: 'k1', from: 'G3' }, { apiSecret: 'vs-secret' }, f);
    expect(f.calls[0].init.method).toBe('GET');
    expect(f.calls[0].url).toMatch(/^https:\/\/rest\.nexmo\.com\/account\/get-balance\?api_key=k1&api_secret=vs-secret$/);
    expect(r).toMatchObject({ ok: true, live: true, message: expect.stringContaining('12.50') });
    expect(r.message).not.toContain('vs-secret');
  });

  test('SendGrid: GET /v3/scopes y exige mail.send', async () => {
    const ok = fakeFetch({ body: { scopes: ['mail.send', 'user.profile.read'] } });
    expect(await testConnection('email', 'sendgrid', { fromEmail: 'a@g3.mx' }, { apiKey: 'SG.k' }, ok)).toMatchObject({ ok: true, live: true });
    expect(ok.calls[0].url).toBe('https://api.sendgrid.com/v3/scopes');
    expect(ok.calls[0].init.headers.authorization).toBe('Bearer SG.k');
    const noSend = fakeFetch({ body: { scopes: ['user.profile.read'] } });
    expect(await testConnection('email', 'sendgrid', { fromEmail: 'a@g3.mx' }, { apiKey: 'SG.k' }, noSend)).toMatchObject({
      ok: false, message: expect.stringContaining('mail.send'),
    });
  });

  test('Mailgun: GET /v3/domains/{dominio} (región EU) y estado del dominio', async () => {
    const f = fakeFetch({ body: { domain: { state: 'unverified' } } });
    const r = await testConnection('email', 'mailgun', { domain: 'mg.g3.mx', region: 'eu', fromEmail: 'a@g3.mx' }, { apiKey: 'key-1' }, f);
    expect(f.calls[0].url).toBe('https://api.eu.mailgun.net/v3/domains/mg.g3.mx');
    expect(decodeBasic(f.calls[0].init.headers.authorization)).toBe('api:key-1');
    expect(r).toMatchObject({ ok: false, live: true, message: expect.stringContaining('unverified') });
  });

  test('Expo: sin verificación en vivo → live=false con mensaje claro', async () => {
    const f = fakeFetch({});
    const r = await testConnection('push', 'expo', {}, {}, f);
    expect(r).toMatchObject({ ok: true, live: false, message: expect.stringContaining('se validó el formato') });
    expect(f.calls).toHaveLength(0);
  });

  test('Meta: GET del phone number con campos de verificación', async () => {
    const f = fakeFetch({ body: { display_phone_number: '+52 55 1234 5678', verified_name: 'G3 Logistics' } });
    const r = await testConnection('whatsapp', 'meta_cloud', { phoneNumberId: '1234567', template: 'g3_incidente', language: 'es_MX' }, { accessToken: 'EAAG-secret' }, f);
    expect(f.calls[0].url).toBe('https://graph.facebook.com/v20.0/1234567?fields=display_phone_number,verified_name');
    expect(f.calls[0].init.headers.authorization).toBe('Bearer EAAG-secret');
    expect(r).toMatchObject({ ok: true, live: true, message: expect.stringContaining('G3 Logistics') });
  });

  test('Stripe: GET /v1/balance con la secret key; valida prefijos y modo', async () => {
    const f = fakeFetch({ body: { livemode: false } });
    const r = await testConnection('payments', 'stripe', { publishableKey: 'pk_test_1' }, { secretKey: 'sk_test_abc', webhookSecret: 'whsec_1' }, f);
    expect(f.calls[0].url).toBe('https://api.stripe.com/v1/balance');
    expect(f.calls[0].init.headers.authorization).toBe('Bearer sk_test_abc');
    expect(r).toMatchObject({ ok: true, live: true, message: expect.stringContaining('test') });

    const mixed = fakeFetch({});
    expect(await testConnection('payments', 'stripe', { publishableKey: 'pk_live_1' }, { secretKey: 'sk_test_abc', webhookSecret: 'whsec_1' }, mixed))
      .toMatchObject({ ok: false, live: false });
    expect(mixed.calls).toHaveLength(0);
  });

  test.each([
    ['pac', 'diverza', { environment: 'sandbox', rfc: 'EKU9003173C9', user: 'u' }, { password: 'p' }, 'timbrado'],
    ['pac', 'facturama', { environment: 'sandbox', rfc: 'EKU9003173C9', user: 'u' }, { password: 'p' }, 'timbrado'],
    ['ai', 'vertex', { projectId: 'g3-prod', location: 'us-central1', model: 'gemini-x' }, {}, 'uso'],
    ['storage', 'gcs', { bucket: 'g3-evidences', signerServiceAccount: 'sa@g3-prod.iam.gserviceaccount.com' }, {}, 'uso'],
  ] as const)('%s/%s: solo formato, live=false', async (cat, prov, settings, secrets, word) => {
    const f = fakeFetch({});
    const r = await testConnection(cat, prov, { ...settings }, { ...secrets }, f);
    expect(r).toMatchObject({ ok: true, live: false, message: expect.stringContaining(`se verificará al primer ${word}`) });
    expect(f.calls).toHaveLength(0);
  });

  test('PAC con RFC inválido', async () => {
    const r = await testConnection('pac', 'diverza', { environment: 'sandbox', rfc: 'NO-RFC', user: 'u' }, { password: 'p' }, fakeFetch({}));
    expect(r).toMatchObject({ ok: false, live: false, message: 'RFC emisor con formato inválido' });
  });

  test('configuración incompleta según el catálogo', async () => {
    const r = await testConnection('email', 'sendgrid', {}, {}, fakeFetch({}));
    expect(r).toMatchObject({ ok: false, live: false, message: expect.stringContaining('apiKey: Obligatorio') });
  });

  test('error de red y timeout: mensajes sin secretos', async () => {
    const boom: FetchLike = async () => {
      throw new Error('getaddrinfo ENOTFOUND sk_test_abc');
    };
    const r = await testConnection('payments', 'stripe', { publishableKey: 'pk_test_1' }, { secretKey: 'sk_test_abc', webhookSecret: 'whsec_1' }, boom);
    expect(r).toMatchObject({ ok: false, live: true, message: 'No se pudo conectar con Stripe' });

    const never: FetchLike = () => new Promise(() => undefined);
    const t = await testConnection('email', 'sendgrid', { fromEmail: 'a@g3.mx' }, { apiKey: 'SG.k' }, never, { timeoutMs: 10 });
    expect(t).toMatchObject({ ok: false, message: expect.stringContaining('Tiempo de espera agotado') });
  });

  test.each([
    [404, 'no encontró'],
    [429, 'limitó'],
    [503, 'no está disponible'],
    [418, 'HTTP 418'],
  ])('mapeo HTTP %i', async (status, text) => {
    const r = await testConnection('email', 'sendgrid', { fromEmail: 'a@g3.mx' }, { apiKey: 'SG.k' }, fakeFetch({ status }));
    expect(r.ok).toBe(false);
    expect(r.message).toContain(text);
  });
});
