import { randomBytes } from 'crypto';
import { AesGcmSecretCipher, loadEncryptionKey } from '../src/secret-cipher';
import {
  build,
  ctxOf,
  dispatcher,
  driver,
  otherOwner,
  OMIT,
  owner,
  PLATFORM,
  platformAdmin,
  status,
  twilio,
  TWILIO_SID,
  TWILIO_TOKEN,
} from './helpers';

describe('cifrado de secretos (AES-256-GCM)', () => {
  const c = new AesGcmSecretCipher(randomBytes(32));

  test('ida y vuelta; el ciphertext no contiene el valor', () => {
    const blob = c.encrypt('s3cr3t-valor', 'company|cmp_a|sms|default|twilio|authToken');
    expect(blob.startsWith('v1.')).toBe(true);
    expect(blob).not.toContain('s3cr3t');
    expect(c.decrypt(blob, 'company|cmp_a|sms|default|twilio|authToken')).toBe('s3cr3t-valor');
  });

  test('el AAD liga el secreto a su configuración: copiarlo a otra compañía no descifra', () => {
    const blob = c.encrypt('x', 'company|cmp_a|sms|default|twilio|authToken');
    expect(() => c.decrypt(blob, 'company|cmp_b|sms|default|twilio|authToken')).toThrow();
  });

  test('llave: 32 bytes base64; obligatoria en producción; derivada en dev', () => {
    expect(loadEncryptionKey({ INTEGRATIONS_ENCRYPTION_KEY: randomBytes(32).toString('base64') })).toHaveLength(32);
    expect(() => loadEncryptionKey({ INTEGRATIONS_ENCRYPTION_KEY: 'corta' })).toThrow('32 bytes');
    expect(() => loadEncryptionKey({ NODE_ENV: 'production' })).toThrow('falta INTEGRATIONS_ENCRYPTION_KEY');
    expect(loadEncryptionKey({})).toEqual(loadEncryptionKey({ NODE_ENV: 'development' }));
  });
});

describe('alta y actualización', () => {
  test('secreto literal: se cifra, se describe con hint y nunca se devuelve', async () => {
    const { svc, repo } = build();
    const dto = await svc.upsert(owner, 'sms', 'default', 'company', twilio());
    expect(dto).toMatchObject({
      scope: 'company', companyId: 'cmp_a', category: 'sms', slot: 'default', provider: 'twilio', enabled: true,
      settings: { accountSid: TWILIO_SID, from: '+15005550006' },
      secrets: { authToken: { set: true, storage: 'encrypted', hint: TWILIO_TOKEN.slice(-4) } },
      status: 'unverified', lastTest: null, updatedBy: 'usr_owner',
    });
    expect(JSON.stringify(dto)).not.toContain(TWILIO_TOKEN);
    expect(JSON.stringify(await repo.find('company', 'cmp_a', 'sms', 'default'))).not.toContain(TWILIO_TOKEN);
    expect(JSON.stringify(await svc.get(owner, 'sms', 'default', 'company'))).not.toContain(TWILIO_TOKEN);
  });

  test('secretos cortos no muestran hint', async () => {
    const { svc } = build();
    const dto = await svc.upsert(owner, 'sms', 'default', 'company', twilio('abc123'));
    expect(dto.secrets.authToken).toEqual({ set: true, storage: 'encrypted', hint: null });
  });

  test('referencias gsm:/env: se guardan como referencia (hint = referencia)', async () => {
    const { svc } = build();
    const gsm = await svc.upsert(owner, 'sms', 'default', 'company', twilio('gsm:projects/g3-prod/secrets/twilio/versions/1'));
    expect(gsm.secrets.authToken).toEqual({ set: true, storage: 'secret_manager', hint: 'gsm:projects/g3-prod/secrets/twilio/versions/1' });
    const env = await svc.upsert(owner, 'sms', 'default', 'company', twilio('env:TW_TOKEN'));
    expect(env.secrets.authToken).toEqual({ set: true, storage: 'env', hint: 'env:TW_TOKEN' });
  });

  test('referencia mal formada → 400 por campo', async () => {
    const { svc } = build();
    const err = await svc.upsert(owner, 'sms', 'default', 'company', twilio('gsm:no/vale')).catch((e) => e);
    expect(err.status).toBe(400);
    expect(err.toJSON().errors.authToken).toContain('Referencia inválida');
  });

  test('secreto omitido o vacío conserva el guardado; null lo borra', async () => {
    const { svc } = build();
    await svc.upsert(owner, 'sms', 'default', 'company', twilio());
    const kept = await svc.upsert(owner, 'sms', 'default', 'company', twilio(OMIT, { from: '+15005550007' }));
    expect(kept.secrets.authToken.set).toBe(true);
    expect(kept.settings.from).toBe('+15005550007');
    const keptEmpty = await svc.upsert(owner, 'sms', 'default', 'company', twilio(''));
    expect(keptEmpty.secrets.authToken.hint).toBe(TWILIO_TOKEN.slice(-4));
    // authToken es obligatorio: borrarlo deja la configuración inválida.
    const err = await svc.upsert(owner, 'sms', 'default', 'company', twilio(null)).catch((e) => e);
    expect(err.status).toBe(400);
    expect(err.toJSON().errors).toEqual({ authToken: 'Obligatorio' });
  });

  test('null borra un secreto opcional (Expo, plataforma)', async () => {
    const { svc } = build();
    await svc.upsert(platformAdmin, 'push', 'default', 'platform', { provider: 'expo', enabled: true, values: { accessToken: 'expo-access-token-123456' } });
    const dto = await svc.upsert(platformAdmin, 'push', 'default', 'platform', { provider: 'expo', enabled: true, values: { accessToken: null } });
    expect(dto.secrets.accessToken).toEqual({ set: false, storage: null, hint: null });
  });

  test('cambiar de proveedor descarta los secretos del anterior', async () => {
    const { svc, audit } = build();
    await svc.upsert(owner, 'sms', 'default', 'company', twilio());
    const v = await svc.upsert(owner, 'sms', 'default', 'company', { provider: 'vonage', enabled: true, values: { apiKey: 'k1', apiSecret: 'vonage-secret-1', from: 'G3' } });
    expect(Object.keys(v.secrets)).toEqual(['apiSecret']);
    expect(audit.events.at(-1)!.metadata).toMatchObject({ previousProvider: 'twilio', secretsRemoved: ['twilio.authToken'] });
    // Al volver a Twilio sin token, ya no hay token que conservar.
    expect(await status(svc.upsert(owner, 'sms', 'default', 'company', twilio(OMIT)))).toBe(400);
  });

  test('validación con el catálogo: campos desconocidos, formato y proveedor', async () => {
    const { svc } = build();
    const err = await svc.upsert(owner, 'email', 'default', 'company', { provider: 'sendgrid', enabled: true, values: { apiKey: 'SG.x', fromEmail: 'no-es-correo', hack: 'x' } }).catch((e) => e);
    expect(err.toJSON().errors).toEqual({ fromEmail: 'Correo inválido', hack: 'Campo desconocido' });
    expect(await status(svc.upsert(owner, 'email', 'default', 'company', { provider: 'twilio', enabled: true, values: {} }))).toBe(400);
    expect(await status(svc.upsert(owner, 'email', 'default', 'company', { provider: 'sendgrid', enabled: 'si' as never, values: {} }))).toBe(400);
  });

  test('borrar: 204 lógico y 404 si no existe', async () => {
    const { svc } = build();
    await svc.upsert(owner, 'sms', 'default', 'company', twilio());
    await svc.remove(owner, 'sms', 'default', 'company');
    expect(await status(svc.get(owner, 'sms', 'default', 'company'))).toBe(404);
    expect(await status(svc.remove(owner, 'sms', 'default', 'company'))).toBe(404);
  });
});

describe('permisos', () => {
  test('alcance plataforma: solo owner/admin de G3_PLATFORM_COMPANY_ID', async () => {
    const { svc } = build();
    const stripe = { provider: 'stripe', enabled: true, values: { publishableKey: 'pk_test_1', secretKey: 'sk_test_1', webhookSecret: 'whsec_1' } };
    expect(await status(svc.upsert(owner, 'payments', 'default', 'platform', stripe))).toBe(403);
    expect(await status(svc.upsert(ctxOf(PLATFORM, 'dispatcher'), 'payments', 'default', 'platform', stripe))).toBe(403);
    expect(await status(svc.upsert(platformAdmin, 'payments', 'default', 'platform', stripe))).toBe(200);
    expect(await status(svc.get(owner, 'payments', 'default', 'platform'))).toBe(403);
    expect(await status(svc.test(owner, 'payments', 'default', 'platform'))).toBe(403);
    expect(await status(svc.remove(owner, 'payments', 'default', 'platform'))).toBe(403);
  });

  test('sin G3_PLATFORM_COMPANY_ID nadie edita plataforma', async () => {
    const { svc } = build({ platformCompanyId: null });
    expect(svc.canEditPlatform(platformAdmin)).toBe(false);
  });

  test('alcance compañía: owner/admin; dispatcher solo overview; driver nada', async () => {
    const { svc } = build();
    expect(await status(svc.upsert(ctxOf('cmp_a', 'admin'), 'sms', 'default', 'company', twilio()))).toBe(200);
    expect(await status(svc.upsert(dispatcher, 'sms', 'default', 'company', twilio()))).toBe(403);
    expect(await status(svc.get(dispatcher, 'sms', 'default', 'company'))).toBe(403);
    expect(await status(svc.overview(dispatcher))).toBe(200);
    expect(await status(svc.overview(driver))).toBe(403);
    expect(await status(svc.get(driver, 'sms', 'default', 'company'))).toBe(403);
    expect(await status(svc.overview(ctxOf('', '')))).toBe(401);
  });

  test('cada compañía solo ve y edita lo suyo', async () => {
    const { svc } = build();
    await svc.upsert(owner, 'sms', 'default', 'company', twilio());
    expect(await status(svc.get(otherOwner, 'sms', 'default', 'company'))).toBe(404);
    const ov = await svc.overview(otherOwner);
    expect(ov.find((i) => i.category === 'sms')!.company).toBeNull();
  });

  test('la categoría debe admitir el alcance; categoría y ranura válidas', async () => {
    const { svc } = build();
    expect(await status(svc.upsert(platformAdmin, 'payments', 'default', 'company', { provider: 'stripe', enabled: true, values: {} }))).toBe(400);
    expect(await status(svc.upsert(platformAdmin, 'push', 'default', 'company', { provider: 'expo', enabled: true, values: {} }))).toBe(400);
    expect(await status(svc.get(owner, 'fax', 'default'))).toBe(404);
    expect(await status(svc.get(owner, 'pac', 'default'))).toBe(404);
    expect(await status(svc.get(owner, 'sms', 'default', 'global'))).toBe(400);
  });
});

describe('overview y resolución company → platform → env → none', () => {
  const metaValues = (token: string, phoneNumberId = '1234567') => ({
    provider: 'meta_cloud', enabled: true, values: { phoneNumberId, accessToken: token, template: 'g3_incidente', language: 'es_MX' },
  });

  test('fuente efectiva y resumen de plataforma para compañías normales', async () => {
    const { svc } = build({ env: { EXPO_PUSH_ENABLED: '1' } });
    await svc.upsert(platformAdmin, 'whatsapp', 'default', 'platform', metaValues('platform-meta-token'));
    await svc.upsert(owner, 'sms', 'default', 'company', twilio());

    const ov = await svc.overview(owner);
    const by = (cat: string, slot = 'default') => ov.find((i) => i.category === cat && i.slot === slot)!;
    expect(ov).toHaveLength(9); // 8 categorías, PAC con primary + backup
    expect(by('pac', 'primary')).toBeDefined();
    expect(by('pac', 'backup')).toBeDefined();
    expect(by('sms').effective).toEqual({ source: 'company', provider: 'twilio', status: 'unverified', enabled: true });
    expect(by('whatsapp').effective.source).toBe('platform');
    expect(by('whatsapp').platform).toEqual({ provider: 'meta_cloud', status: 'unverified', enabled: true });
    expect(by('push')).toMatchObject({ effective: { source: 'env', provider: 'expo' }, envFallbackPresent: true });
    expect(by('email').effective.source).toBe('none');
    expect(by('sms').canEditPlatform).toBe(false);
    expect(JSON.stringify(ov)).not.toContain('platform-meta-token');

    const full = await svc.overview(platformAdmin);
    const wa = full.find((i) => i.category === 'whatsapp')!;
    expect(wa.canEditPlatform).toBe(true);
    expect(wa.platform).toMatchObject({ id: expect.any(String), scope: 'platform', secrets: { accessToken: { set: true, storage: 'encrypted' } } });
  });

  test('el dispatcher ve el overview sin hints de secretos', async () => {
    const { svc } = build();
    await svc.upsert(owner, 'sms', 'default', 'company', twilio());
    const sms = (await svc.overview(dispatcher)).find((i) => i.category === 'sms')!;
    expect(sms.company!.secrets.authToken).toEqual({ set: true, storage: 'encrypted', hint: null });
  });

  test('resolve: compañía con secretos en claro; deshabilitada cae a plataforma; luego env; luego none', async () => {
    const { svc } = build({ env: { WHATSAPP_PHONE_NUMBER_ID: '999', WHATSAPP_ACCESS_TOKEN: 'env-wa-token' } });
    await svc.upsert(platformAdmin, 'whatsapp', 'default', 'platform', metaValues('platform-meta-token', '2222222'));
    await svc.upsert(owner, 'whatsapp', 'default', 'company', metaValues('company-meta-token', '1111111'));

    expect(await svc.resolve('cmp_a', 'whatsapp')).toEqual({
      category: 'whatsapp', slot: 'default', source: 'company', provider: 'meta_cloud',
      settings: { phoneNumberId: '1111111', template: 'g3_incidente', language: 'es_MX' },
      secrets: { accessToken: 'company-meta-token' },
    });
    expect(await svc.resolve('cmp_b', 'whatsapp')).toMatchObject({ source: 'platform', secrets: { accessToken: 'platform-meta-token' } });

    await svc.upsert(owner, 'whatsapp', 'default', 'company', { ...metaValues(''), enabled: false });
    expect(await svc.resolve('cmp_a', 'whatsapp')).toMatchObject({ source: 'platform' });

    await svc.remove(platformAdmin, 'whatsapp', 'default', 'platform');
    expect(await svc.resolve('cmp_a', 'whatsapp')).toMatchObject({ source: 'env', settings: { phoneNumberId: '999' }, secrets: { accessToken: 'env-wa-token' } });

    expect(await svc.resolve('cmp_a', 'email')).toEqual({ category: 'email', slot: 'default', source: 'none', provider: null, settings: {}, secrets: {} });
  });

  test('resolve: referencias gsm/env se resuelven; categorías solo-plataforma ignoran la compañía', async () => {
    const { svc } = build();
    await svc.upsert(owner, 'sms', 'default', 'company', twilio('gsm:projects/g3-prod/secrets/twilio/versions/1'));
    expect((await svc.resolve('cmp_a', 'sms')).secrets).toEqual({ authToken: 'from-gsm-token-xyz' });
    await svc.upsert(owner, 'sms', 'default', 'company', twilio('env:NO_DEFINIDA'));
    expect(await status(svc.resolve('cmp_a', 'sms'))).toBe(502);
    expect(await svc.resolve(null, 'payments')).toMatchObject({ source: 'none' });
  });

  test('PAC: ranuras primary y backup independientes', async () => {
    const { svc } = build();
    const pac = (p: string) => ({ provider: p, enabled: true, values: { environment: 'sandbox', rfc: 'EKU9003173C9', user: 'u', password: 'pac-password-1' } });
    await svc.upsert(owner, 'pac', 'primary', 'company', pac('diverza'));
    await svc.upsert(owner, 'pac', 'backup', 'company', pac('facturama'));
    expect((await svc.resolve('cmp_a', 'pac', 'primary')).provider).toBe('diverza');
    expect((await svc.resolve('cmp_a', 'pac', 'backup')).provider).toBe('facturama');
    expect(await status(svc.resolve('cmp_a', 'pac', 'default'))).toBe(404);
  });
});

describe('probar conexión', () => {
  test('Twilio OK → verified, lastTest guardado, sin secretos en la respuesta', async () => {
    const { svc, http } = build();
    await svc.upsert(owner, 'sms', 'default', 'company', twilio());
    const r = await svc.test(owner, 'sms', 'default', 'company');
    expect(r).toMatchObject({ ok: true, live: true });
    expect(http.calls[0].url).toBe(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}.json`);
    expect(http.calls[0].init.method).toBe('GET');
    const dto = await svc.get(owner, 'sms', 'default', 'company');
    expect(dto.status).toBe('verified');
    expect(dto.lastTest).toEqual(r);
    expect(JSON.stringify(r)).not.toContain(TWILIO_TOKEN);
  });

  test('401 → failed', async () => {
    const { svc, http } = build();
    http.reply = { status: 401, body: { message: `bad ${TWILIO_TOKEN}` } };
    await svc.upsert(owner, 'sms', 'default', 'company', twilio());
    const r = await svc.test(owner, 'sms', 'default', 'company');
    expect(r).toMatchObject({ ok: false, message: 'Twilio rechazó las credenciales (HTTP 401)' });
    expect((await svc.get(owner, 'sms', 'default', 'company')).status).toBe('failed');
  });

  test('sin prueba en vivo (PAC) → ok de formato, queda unverified', async () => {
    const { svc, http } = build();
    await svc.upsert(owner, 'pac', 'primary', 'company', { provider: 'diverza', enabled: true, values: { environment: 'sandbox', rfc: 'EKU9003173C9', user: 'u', password: 'pw-123456789' } });
    const r = await svc.test(owner, 'pac', 'primary', 'company');
    expect(r).toMatchObject({ ok: true, live: false });
    expect(http.calls).toHaveLength(0);
    expect((await svc.get(owner, 'pac', 'primary', 'company')).status).toBe('unverified');
  });

  test('secreto no resoluble → failed con mensaje claro', async () => {
    const { svc } = build();
    await svc.upsert(owner, 'sms', 'default', 'company', twilio('env:NO_DEFINIDA'));
    const r = await svc.test(owner, 'sms', 'default', 'company');
    expect(r).toMatchObject({ ok: false, live: false, message: expect.stringContaining('No se pudo resolver el secreto "authToken"') });
  });

  test('cambiar la configuración vuelve a "sin verificar"', async () => {
    const { svc } = build();
    await svc.upsert(owner, 'sms', 'default', 'company', twilio());
    await svc.test(owner, 'sms', 'default', 'company');
    const dto = await svc.upsert(owner, 'sms', 'default', 'company', twilio(OMIT));
    expect(dto).toMatchObject({ status: 'unverified', lastTest: null });
  });
});

describe('auditoría', () => {
  test('alta, cambio, prueba y borrado se registran sin secretos', async () => {
    const { svc, audit } = build();
    await svc.upsert(owner, 'sms', 'default', 'company', twilio());
    await svc.upsert(owner, 'sms', 'default', 'company', twilio('otro-token-0123456789', { from: '+15005550009' }));
    await svc.test(owner, 'sms', 'default', 'company');
    await svc.remove(owner, 'sms', 'default', 'company');
    await svc.upsert(platformAdmin, 'payments', 'default', 'platform', {
      provider: 'stripe', enabled: true, values: { publishableKey: 'pk_test_1', secretKey: 'sk_test_supersecret', webhookSecret: 'whsec_supersecret' },
    });

    expect(audit.events.map((e) => e.action)).toEqual([
      'integration.updated', 'integration.updated', 'integration.tested', 'integration.deleted', 'integration.updated',
    ]);
    expect(audit.events[0]).toMatchObject({
      companyId: 'cmp_a',
      actor: { type: 'user', userId: 'usr_owner', role: 'owner' },
      resource: { type: 'integration', id: expect.stringMatching(/^int_/) },
      ip: '10.0.0.1',
      metadata: { scope: 'company', category: 'sms', slot: 'default', provider: 'twilio', created: true, secretsChanged: ['authToken'] },
    });
    expect(audit.events[1].metadata).toMatchObject({ created: false, secretsChanged: ['authToken'], settingsChanged: ['from'] });
    expect(audit.events[2].metadata).toMatchObject({ ok: true, live: true });
    // plataforma: en la bitácora de la compañía plataforma
    expect(audit.events[4]).toMatchObject({ companyId: PLATFORM, metadata: { scope: 'platform', category: 'payments' } });

    const all = JSON.stringify(audit.events);
    for (const s of [TWILIO_TOKEN, 'otro-token-0123456789', 'sk_test_supersecret', 'whsec_supersecret']) {
      expect(all).not.toContain(s);
    }
  });
});
