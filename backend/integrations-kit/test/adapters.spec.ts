import {
  ExpoPushClient,
  MailgunEmailSender,
  SendGridEmailSender,
  TwilioSmsSender,
  VonageSmsSender,
  WhatsAppCloudClient,
  requestWithTimeout,
  type FetchLike,
} from '../src';
import { decodeBasic, fakeFetch, form } from './fake-fetch';

const SID = 'AC' + 'a'.repeat(32);
const TOKEN = 'twilio-auth-token-super-secreto';

describe('Twilio SMS', () => {
  test('POST a Messages.json con basic auth y From', async () => {
    const f = fakeFetch({ status: 201, body: { sid: 'SM123' } });
    const r = await new TwilioSmsSender(f, { accountSid: SID, authToken: TOKEN, from: '+15005550006' }).send('+5215512345678', 'Hola');
    expect(r).toEqual({ ok: true, providerMessageId: 'SM123' });
    expect(f.calls[0].url).toBe(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`);
    expect(f.calls[0].init.method).toBe('POST');
    expect(f.calls[0].init.headers['content-type']).toBe('application/x-www-form-urlencoded');
    expect(decodeBasic(f.calls[0].init.headers.authorization)).toBe(`${SID}:${TOKEN}`);
    expect(form(f.calls[0].init.body)).toEqual({ To: '+5215512345678', Body: 'Hola', From: '+15005550006' });
  });

  test('remitente MG… se manda como MessagingServiceSid', async () => {
    const f = fakeFetch({ status: 201, body: {} });
    await new TwilioSmsSender(f, { accountSid: SID, authToken: TOKEN, from: 'MG' + 'b'.repeat(32) }).send('+5215512345678', 'x');
    const body = form(f.calls[0].init.body);
    expect(body.MessagingServiceSid).toBe('MG' + 'b'.repeat(32));
    expect(body.From).toBeUndefined();
  });

  test('error HTTP: código y detalle sin el token aunque el proveedor lo repita', async () => {
    const f = fakeFetch({ status: 401, body: { code: 20003, message: `Authenticate: token ${TOKEN} inválido` } });
    const r = await new TwilioSmsSender(f, { accountSid: SID, authToken: TOKEN, from: '+15005550006' }).send('+5215512345678', 'x');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('HTTP 401');
    expect(JSON.stringify(r)).not.toContain(TOKEN);
    expect(r.detail).toContain('***');
  });

  test('error de red: no lanza y no filtra secretos', async () => {
    const f: FetchLike = async () => {
      throw new Error(`connect ECONNREFUSED con ${TOKEN}`);
    };
    const r = await new TwilioSmsSender(f, { accountSid: SID, authToken: TOKEN, from: '+15005550006' }).send('+52155', 'x');
    expect(r).toMatchObject({ ok: false, error: 'Error de red' });
    expect(JSON.stringify(r)).not.toContain(TOKEN);
  });
});

describe('Vonage SMS', () => {
  test('POST a rest.nexmo.com/sms/json; el estado viene por mensaje', async () => {
    const f = fakeFetch({ body: { messages: [{ status: '0', 'message-id': 'm1' }] } });
    const r = await new VonageSmsSender(f, { apiKey: 'k1', apiSecret: 'vonage-secret', from: 'G3' }).send('+5215512345678', 'Hola');
    expect(r).toEqual({ ok: true, providerMessageId: 'm1' });
    expect(f.calls[0].url).toBe('https://rest.nexmo.com/sms/json');
    expect(form(f.calls[0].init.body)).toMatchObject({ api_key: 'k1', api_secret: 'vonage-secret', from: 'G3', to: '5215512345678', text: 'Hola' });
  });

  test('status ≠ 0 es error aunque sea HTTP 200', async () => {
    const f = fakeFetch({ body: { messages: [{ status: '4', 'error-text': 'Bad Credentials vonage-secret' }] } });
    const r = await new VonageSmsSender(f, { apiKey: 'k1', apiSecret: 'vonage-secret', from: 'G3' }).send('+5215512345678', 'x');
    expect(r).toMatchObject({ ok: false, error: 'Vonage status 4' });
    expect(JSON.stringify(r)).not.toContain('vonage-secret');
  });
});

describe('SendGrid', () => {
  test('POST /v3/mail/send con Bearer y JSON v3', async () => {
    const f = fakeFetch({ status: 202 });
    const r = await new SendGridEmailSender(f, { apiKey: 'SG.secreto', fromEmail: 'no-reply@g3.mx', fromName: 'G3' }).send({
      to: 'ana@x.mx', subject: 'Asunto', text: 'Cuerpo',
    });
    expect(r.ok).toBe(true);
    expect(f.calls[0].url).toBe('https://api.sendgrid.com/v3/mail/send');
    expect(f.calls[0].init.headers.authorization).toBe('Bearer SG.secreto');
    expect(JSON.parse(f.calls[0].init.body!)).toEqual({
      personalizations: [{ to: [{ email: 'ana@x.mx' }] }],
      from: { email: 'no-reply@g3.mx', name: 'G3' },
      subject: 'Asunto',
      content: [{ type: 'text/plain', value: 'Cuerpo' }],
    });
  });

  test('error 403 con mensaje de errors[]', async () => {
    const f = fakeFetch({ status: 403, body: { errors: [{ message: 'The from address does not match a verified Sender Identity' }] } });
    const r = await new SendGridEmailSender(f, { apiKey: 'SG.secreto', fromEmail: 'a@b.mx' }).send({ to: 'x@y.mx', subject: 's', text: 't' });
    expect(r).toMatchObject({ ok: false, error: 'HTTP 403', detail: expect.stringContaining('Sender Identity') });
  });
});

describe('Mailgun', () => {
  test('US: api.mailgun.net/v3/<dominio>/messages con basic api:key', async () => {
    const f = fakeFetch({ body: { id: '<x@mg>' } });
    await new MailgunEmailSender(f, { apiKey: 'key-mg', domain: 'mg.g3.mx', fromEmail: 'no-reply@g3.mx', fromName: 'G3' }).send({
      to: 'ana@x.mx', subject: 'S', text: 'T',
    });
    expect(f.calls[0].url).toBe('https://api.mailgun.net/v3/mg.g3.mx/messages');
    expect(decodeBasic(f.calls[0].init.headers.authorization)).toBe('api:key-mg');
    expect(form(f.calls[0].init.body)).toEqual({ from: 'G3 <no-reply@g3.mx>', to: 'ana@x.mx', subject: 'S', text: 'T' });
  });

  test('EU: api.eu.mailgun.net', async () => {
    const f = fakeFetch({ status: 401, body: 'Forbidden' });
    const r = await new MailgunEmailSender(f, { apiKey: 'key-mg', domain: 'mg.g3.mx', region: 'eu', fromEmail: 'a@g3.mx' }).send({ to: 'x@y.mx', subject: 's', text: 't' });
    expect(f.calls[0].url).toBe('https://api.eu.mailgun.net/v3/mg.g3.mx/messages');
    expect(r).toMatchObject({ ok: false, error: 'HTTP 401' });
  });
});

describe('Expo push', () => {
  test('POST con Bearer opcional; ticket con error se reporta', async () => {
    const f = fakeFetch({ body: { data: { status: 'error', message: '"x" is not a registered push token', details: { error: 'DeviceNotRegistered' } } } });
    const r = await new ExpoPushClient(f, 'expo-token').send({ to: 'ExponentPushToken[x]', title: 'T', body: 'B', priority: 'high' });
    expect(f.calls[0].url).toBe('https://exp.host/--/api/v2/push/send');
    expect(f.calls[0].init.headers.authorization).toBe('Bearer expo-token');
    expect(JSON.parse(f.calls[0].init.body!)).toMatchObject({ to: 'ExponentPushToken[x]', priority: 'high', sound: 'default' });
    expect(r).toMatchObject({ ok: false, error: 'DeviceNotRegistered' });
  });

  test('sin token push no llama', async () => {
    const f = fakeFetch({});
    expect(await new ExpoPushClient(f).send({ to: '', title: 'T', body: 'B' })).toEqual({ ok: false, error: 'sin token push' });
    expect(f.calls).toHaveLength(0);
  });
});

describe('WhatsApp Cloud API', () => {
  test('plantilla con parámetros en orden', async () => {
    const f = fakeFetch({ body: { messages: [{ id: 'wamid.1' }] } });
    const r = await new WhatsAppCloudClient(f, { phoneNumberId: '123456', accessToken: 'meta-tok', template: 'g3_incidente', language: 'es_MX' })
      .sendTemplate({ to: '+52 1 55 0000 0001', parameters: ['A', 'B'] });
    expect(r).toEqual({ ok: true, providerMessageId: 'wamid.1' });
    expect(f.calls[0].url).toBe('https://graph.facebook.com/v20.0/123456/messages');
    const body = JSON.parse(f.calls[0].init.body!);
    expect(body).toMatchObject({ messaging_product: 'whatsapp', to: '5215500000001', type: 'template', template: { name: 'g3_incidente', language: { code: 'es_MX' } } });
    expect(body.template.components[0].parameters).toEqual([{ type: 'text', text: 'A' }, { type: 'text', text: 'B' }]);
  });
});

describe('timeout', () => {
  test('corta aunque el fetch ignore la señal', async () => {
    const never: FetchLike = () => new Promise(() => undefined);
    await expect(requestWithTimeout(never, 'https://x', { method: 'GET', headers: {} }, 20)).rejects.toThrow('Tiempo de espera agotado');
  });

  test('el adaptador lo reporta como entrega fallida', async () => {
    jest.useFakeTimers();
    try {
      const never: FetchLike = () => new Promise(() => undefined);
      const p = new SendGridEmailSender(never, { apiKey: 'SG.x', fromEmail: 'a@b.mx' }).send({ to: 'x@y.mx', subject: 's', text: 't' });
      jest.advanceTimersByTime(10_001);
      expect(await p).toEqual({ ok: false, error: 'Tiempo de espera agotado (10 s)' });
    } finally {
      jest.useRealTimers();
    }
  });
});
