import { createDemoIntegrations, describeSecret } from '../../lib/integrations/demo';
import { G3ApiError } from '../../lib/api/types';

const now = () => new Date('2026-10-02T12:00:00Z');

describe('integraciones demo — misma lógica que el servicio', () => {
  test('describeSecret: literal enmascarado, gsm: y env: como referencia', () => {
    expect(describeSecret('sk_live_abcd1234')).toEqual({ set: true, storage: 'encrypted', hint: '1234' });
    expect(describeSecret('gsm:projects/p/secrets/s/versions/1')).toEqual({
      set: true,
      storage: 'secret_manager',
      hint: 'gsm:projects/p/secrets/s/versions/1',
    });
    expect(describeSecret('env:TWILIO_TOKEN').storage).toBe('env');
  });

  test('guardar nunca devuelve el secreto: solo set/storage/hint', async () => {
    const b = createDemoIntegrations({ empty: true, now });
    const c = await b.upsert('sms', 'default', 'company', {
      provider: 'twilio',
      enabled: true,
      values: { accountSid: 'AC1', authToken: 'supersecreto9876', from: '+525511112222' },
    });
    expect(JSON.stringify(c)).not.toContain('supersecreto9876');
    expect(c.secrets.authToken).toEqual({ set: true, storage: 'encrypted', hint: '9876' });
    expect(c.settings).toEqual({ accountSid: 'AC1', from: '+525511112222' });
    expect(c.status).toBe('unverified');
  });

  test('secreto omitido o vacío conserva; null borra (y entonces falla lo obligatorio)', async () => {
    const b = createDemoIntegrations({ empty: true, now });
    await b.upsert('sms', 'default', 'company', {
      provider: 'twilio', enabled: true, values: { accountSid: 'AC1', authToken: 'tok_1111', from: 'MG1' },
    });
    // omitido
    let c = await b.upsert('sms', 'default', 'company', {
      provider: 'twilio', enabled: true, values: { accountSid: 'AC2', from: 'MG1' },
    });
    expect(c.secrets.authToken.hint).toBe('1111');
    expect(b.rawSecret('sms', 'default', 'company', 'authToken')).toBe('tok_1111');
    // vacío
    c = await b.upsert('sms', 'default', 'company', {
      provider: 'twilio', enabled: true, values: { accountSid: 'AC2', authToken: '', from: 'MG1' },
    });
    expect(c.secrets.authToken.set).toBe(true);
    // null en un secreto obligatorio → 400 por campo
    const err = await b
      .upsert('sms', 'default', 'company', { provider: 'twilio', enabled: true, values: { accountSid: 'AC2', authToken: null, from: 'MG1' } })
      .catch((e) => e);
    expect(err).toBeInstanceOf(G3ApiError);
    expect((err as G3ApiError).status).toBe(400);
    expect((err.body as unknown as { errors: Record<string, string> }).errors).toEqual({ authToken: 'Obligatorio' });
    // null en un secreto opcional → se borra
    await b.upsert('push', 'default', 'platform', { provider: 'expo', enabled: true, values: { accessToken: 'exp_abcd' } });
    const p = await b.upsert('push', 'default', 'platform', { provider: 'expo', enabled: true, values: { accessToken: null } });
    expect(p.secrets.accessToken).toEqual({ set: false, storage: null, hint: null });
  });

  test('cambiar de proveedor no arrastra secretos del anterior', async () => {
    const b = createDemoIntegrations({ empty: true, now });
    await b.upsert('email', 'default', 'company', {
      provider: 'sendgrid', enabled: true, values: { apiKey: 'SG.x', fromEmail: 'a@b.mx' },
    });
    const err = await b
      .upsert('email', 'default', 'company', {
        provider: 'mailgun', enabled: true, values: { domain: 'mg.b.mx', region: 'us', fromEmail: 'a@b.mx' },
      })
      .catch((e) => e);
    expect((err as G3ApiError).status).toBe(400);
    expect((err.body as unknown as { errors: Record<string, string> }).errors.apiKey).toBe('Obligatorio');
  });

  test('fuente efectiva: propia → plataforma → env → none (modo registro)', async () => {
    const b = createDemoIntegrations({ empty: true, now, envPresent: { push: true } });
    const find = async (cat: string, slot = 'default') =>
      (await b.overview()).find((i) => i.category === cat && i.slot === slot)!;

    expect((await find('sms')).effective).toEqual({ source: 'none', provider: null, status: null, enabled: false });
    expect((await find('push')).effective.source).toBe('env');

    await b.upsert('sms', 'default', 'platform', {
      provider: 'twilio', enabled: true, values: { accountSid: 'AC1', authToken: 't', from: 'MG1' },
    });
    expect((await find('sms')).effective).toMatchObject({ source: 'platform', provider: 'twilio' });

    await b.upsert('sms', 'default', 'company', {
      provider: 'vonage', enabled: true, values: { apiKey: 'k', apiSecret: 's', from: 'ACME' },
    });
    expect((await find('sms')).effective).toMatchObject({ source: 'company', provider: 'vonage' });

    // Deshabilitada → vuelve a heredar.
    await b.upsert('sms', 'default', 'company', { provider: 'vonage', enabled: false, values: { apiKey: 'k', from: 'ACME' } });
    expect((await find('sms')).effective.source).toBe('platform');

    // Eliminar la propia → hereda.
    await b.remove('sms', 'default', 'company');
    const item = await find('sms');
    expect(item.company).toBeNull();
    expect(item.effective.source).toBe('platform');

    // PAC: dos ranuras independientes.
    const pac = (await b.overview()).filter((i) => i.category === 'pac').map((i) => i.slot);
    expect(pac).toEqual(['primary', 'backup']);
  });

  test('sin permiso de plataforma: resumen sin secretos y 403 al editar', async () => {
    const b = createDemoIntegrations({ canEditPlatform: false, now });
    const sms = (await b.overview()).find((i) => i.category === 'sms')!;
    expect(sms.canEditPlatform).toBe(false);
    expect(sms.platform).toEqual({ provider: 'twilio', status: 'verified', enabled: true });
    const err = await b
      .upsert('sms', 'default', 'platform', { provider: 'twilio', enabled: true, values: {} })
      .catch((e) => e);
    expect((err as G3ApiError).status).toBe(403);
  });

  test('categoría solo-plataforma no acepta configuración de compañía', async () => {
    const b = createDemoIntegrations({ now });
    const err = await b
      .upsert('payments', 'default', 'company', { provider: 'stripe', enabled: true, values: {} })
      .catch((e) => e);
    expect((err as G3ApiError).status).toBe(400);
  });

  test('prueba simulada: ok, falla si el secreto termina en "bad", y live=false sin prueba real', async () => {
    const b = createDemoIntegrations({ empty: true, now });
    await b.upsert('whatsapp', 'default', 'company', {
      provider: 'meta_cloud',
      enabled: true,
      values: { phoneNumberId: '1', accessToken: 'EAAG_ok', template: 'g3_incidente', language: 'es_MX' },
    });
    const ok = await b.test('whatsapp', 'default', 'company');
    expect(ok).toMatchObject({ ok: true, live: true });
    expect((await b.get('whatsapp', 'default', 'company'))!.status).toBe('verified');

    await b.upsert('whatsapp', 'default', 'company', {
      provider: 'meta_cloud',
      enabled: true,
      values: { phoneNumberId: '1', accessToken: 'token-bad', template: 'g3_incidente', language: 'es_MX' },
    });
    const bad = await b.test('whatsapp', 'default', 'company');
    expect(bad.ok).toBe(false);
    const after = await b.get('whatsapp', 'default', 'company');
    expect(after!.status).toBe('failed');
    expect(after!.lastTest).toEqual(bad);

    await b.upsert('pac', 'backup', 'company', {
      provider: 'facturama',
      enabled: true,
      values: { environment: 'sandbox', rfc: 'AAA010101AAA', user: 'u', password: 'p' },
    });
    const pac = await b.test('pac', 'backup', 'company');
    expect(pac).toMatchObject({ ok: true, live: false });
  });

  test('probar sin configuración → 404', async () => {
    const b = createDemoIntegrations({ empty: true, now });
    const err = await b.test('sms', 'default', 'company').catch((e) => e);
    expect((err as G3ApiError).status).toBe(404);
  });
});
