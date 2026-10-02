import type { INestApplication } from '@nestjs/common';
import { createIntegrationsApp } from '../src/main';
import { internalTokenMatches } from '../src/integrations.controller';
import { build, PLATFORM, TWILIO_SID, TWILIO_TOKEN } from './helpers';

const INTERNAL = 'internal-token-de-prueba-32-chars!!';

const headers = (companyId: string, role: string) => ({
  'x-company-id': companyId,
  'x-user-id': `usr_${role}`,
  'x-user-role': role,
  'content-type': 'application/json',
});

describe('integrations HTTP', () => {
  let app: INestApplication;
  let base: string;
  const env = build({ env: { EXPO_PUSH_ENABLED: '1' } });

  beforeAll(async () => {
    app = await createIntegrationsApp({ deps: env.deps, internalToken: INTERNAL, logger: false });
    await app.listen(0, '127.0.0.1');
    base = `${await app.getUrl()}/api`;
  });
  afterAll(async () => {
    await app.close();
  });

  const call = async (method: string, path: string, h: Record<string, string>, body?: unknown) => {
    const r = await fetch(`${base}${path}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await r.text();
    return { status: r.status, body: text ? JSON.parse(text) : null, text };
  };

  test('catálogo y overview', async () => {
    const cat = await call('GET', '/integrations/catalog', headers('cmp_h', 'owner'));
    expect(cat.status).toBe(200);
    expect(cat.body.map((c: { category: string }) => c.category)).toContain('pac');
    const ov = await call('GET', '/integrations', headers('cmp_h', 'dispatcher'));
    expect(ov.status).toBe(200);
    expect(ov.body.find((i: { category: string }) => i.category === 'push').effective.source).toBe('env');
    expect((await call('GET', '/integrations', headers('cmp_h', 'driver'))).status).toBe(403);
    expect((await call('GET', '/integrations', {})).status).toBe(401);
  });

  test('PUT → GET → test → DELETE (compañía)', async () => {
    const h = headers('cmp_h', 'owner');
    const put = await call('PUT', '/integrations/sms/default?scope=company', h, {
      provider: 'twilio', enabled: true, values: { accountSid: TWILIO_SID, authToken: TWILIO_TOKEN, from: '+15005550006' },
    });
    expect(put.status).toBe(200);
    expect(put.text).not.toContain(TWILIO_TOKEN);
    expect((await call('GET', '/integrations/sms/default?scope=company', h)).body.secrets.authToken.set).toBe(true);
    const t = await call('POST', '/integrations/sms/default/test?scope=company', h);
    expect(t.status).toBe(200);
    expect(t.body).toMatchObject({ ok: true, live: true });
    expect((await call('DELETE', '/integrations/sms/default?scope=company', h)).status).toBe(204);
    expect((await call('GET', '/integrations/sms/default?scope=company', h)).status).toBe(404);
  });

  test('errores de dominio con su status (400 / 403 / 404)', async () => {
    const bad = await call('PUT', '/integrations/sms/default', headers('cmp_h', 'owner'), { provider: 'twilio', enabled: true, values: { accountSid: 'x' } });
    expect(bad.status).toBe(400);
    // Forma que lee G3 Admin: body.errors por campo.
    expect(bad.body).toMatchObject({ statusCode: 400, error: 'Bad Request', message: 'Configuración inválida', errors: { authToken: 'Obligatorio' } });
    expect((await call('PUT', '/integrations/payments/default?scope=platform', headers('cmp_h', 'owner'), {})).status).toBe(403);
    expect((await call('GET', '/integrations/fax/default', headers('cmp_h', 'owner'))).status).toBe(404);
  });

  test('interno: exige x-internal-token y devuelve secretos en claro', async () => {
    await call('PUT', '/integrations/whatsapp/default?scope=platform', headers(PLATFORM, 'admin'), {
      provider: 'meta_cloud', enabled: true, values: { phoneNumberId: '1234567', accessToken: 'meta-token-123456', template: 'g3_incidente', language: 'es_MX' },
    });
    const path = '/integrations/internal/resolve?companyId=cmp_h&category=whatsapp&slot=default';
    expect((await call('GET', path, headers('cmp_h', 'owner'))).status).toBe(401);
    expect((await call('GET', path, { 'x-internal-token': 'otro' })).status).toBe(401);
    const ok = await call('GET', path, { 'x-internal-token': INTERNAL });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ source: 'platform', provider: 'meta_cloud', secrets: { accessToken: 'meta-token-123456' } });
  });

  test('comparación del token interno', () => {
    expect(internalTokenMatches(INTERNAL, INTERNAL)).toBe(true);
    expect(internalTokenMatches(INTERNAL.slice(0, -1), INTERNAL)).toBe(false);
    expect(internalTokenMatches(undefined, INTERNAL)).toBe(false);
    expect(internalTokenMatches('', '')).toBe(false);
  });
});
