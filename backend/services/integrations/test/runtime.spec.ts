import { randomBytes } from 'crypto';
import { HttpAuditSink, LogAuditSink, type IntegrationAuditEvent } from '../src/audit';
import { depsFromEnv } from '../src/main';
import { fakeHttp } from './helpers';

const event: IntegrationAuditEvent = {
  companyId: 'cmp_a',
  actor: { type: 'user', userId: 'usr_1', role: 'owner' },
  action: 'integration.updated',
  resource: { type: 'integration', id: 'int_1' },
  ip: null,
  userAgent: null,
  metadata: { scope: 'company', category: 'sms' },
};

describe('HttpAuditSink → ingesta interna de auth', () => {
  test('POST {AUTH_URL}/api/audit/events con x-internal-token', async () => {
    const http = fakeHttp(201, {});
    await new HttpAuditSink('http://auth:8081/', 'tok-internal', http.fetch).record(event);
    expect(http.calls[0].url).toBe('http://auth:8081/api/audit/events');
    expect(http.calls[0].init.method).toBe('POST');
    expect(http.calls[0].init.headers['x-internal-token']).toBe('tok-internal');
    expect(JSON.parse(http.calls[0].init.body!)).toEqual(event);
  });

  test('auth caído o rechazo: avisa por log y no rompe la operación', async () => {
    const logs: string[] = [];
    const http = fakeHttp(400, {});
    await new HttpAuditSink('http://auth', 'tok-internal', http.fetch, (m) => logs.push(m)).record(event);
    await new HttpAuditSink('http://auth', 'tok-internal', async () => { throw new Error('ECONNREFUSED'); }, (m) => logs.push(m)).record(event);
    expect(logs).toHaveLength(2);
    expect(logs.join()).not.toContain('tok-internal');
  });
});

describe('depsFromEnv', () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  afterAll(() => warn.mockRestore());

  test('producción exige INTERNAL_TOKEN e INTEGRATIONS_ENCRYPTION_KEY', () => {
    expect(() => depsFromEnv({ NODE_ENV: 'production' })).toThrow('INTERNAL_TOKEN');
    expect(() => depsFromEnv({ NODE_ENV: 'production', INTERNAL_TOKEN: 'x'.repeat(32) })).toThrow('INTEGRATIONS_ENCRYPTION_KEY');
    const ok = depsFromEnv({
      NODE_ENV: 'production',
      INTERNAL_TOKEN: 'x'.repeat(32),
      INTEGRATIONS_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
      G3_PLATFORM_COMPANY_ID: 'cmp_g3',
      AUTH_URL: 'http://auth:8081',
    });
    expect(ok.deps.platformCompanyId).toBe('cmp_g3');
    expect(ok.deps.audit).toBeInstanceOf(HttpAuditSink);
  });

  test('desarrollo sin AUTH_URL audita solo a log', () => {
    expect(depsFromEnv({}).deps.audit).toBeInstanceOf(LogAuditSink);
  });
});
