import { assertProductionEnv, createServiceFetch, readiness, safeEqual, ephemeralStoreFromEnv, MemoryEphemeralStore } from '../src';

describe('runtime', () => {
  test('assertProductionEnv solo exige en producción', () => {
    expect(() => assertProductionEnv('x', ['A'], { NODE_ENV: 'development' })).not.toThrow();
    expect(() => assertProductionEnv('x', ['A', 'B'], { NODE_ENV: 'production', A: '1' })).toThrow(/B/);
  });

  test('readiness reporta cada verificación y aplica timeout', async () => {
    const r = await readiness('svc', [
      { name: 'db', check: async () => undefined },
      { name: 'redis', check: () => new Promise(() => undefined) },
      { name: 'otro', check: async () => { throw new Error('caído'); } },
    ], 50);
    expect(r).toEqual({ ok: false, service: 'svc', checks: { db: 'ok', redis: 'timeout', otro: 'caído' } });
  });

  test('safeEqual', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('', '')).toBe(false);
    expect(safeEqual(undefined, 'a')).toBe(false);
  });

  test('serviceFetch agrega token interno y, en modo gcp, ID token cacheado por audiencia', async () => {
    const calls: { url: string; headers: Headers }[] = [];
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = `x.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.y`;
    const fake = (async (url: string, init?: RequestInit) => {
      calls.push({ url, headers: new Headers(init?.headers) });
      if (url.startsWith('http://metadata')) return new Response(jwt);
      return new Response('{}', { status: 200 });
    }) as typeof fetch;
    const sf = createServiceFetch({ internalToken: 'it', mode: 'gcp', fetchImpl: fake });
    await sf('https://alerts-abc.a.run.app/api/incidents/signals', { method: 'POST' });
    await sf('https://alerts-abc.a.run.app/api/x');
    const metadata = calls.filter((c) => c.url.startsWith('http://metadata'));
    expect(metadata).toHaveLength(1);
    expect(metadata[0].url).toContain(encodeURIComponent('https://alerts-abc.a.run.app'));
    const api = calls.filter((c) => !c.url.startsWith('http://metadata'));
    expect(api[0].headers.get('x-internal-token')).toBe('it');
    expect(api[0].headers.get('authorization')).toBe(`Bearer ${jwt}`);
  });

  test('en producción el store efímero exige Redis', () => {
    expect(() => ephemeralStoreFromEnv('auth', { NODE_ENV: 'production' })).toThrow(/REDIS_URL/);
    expect(ephemeralStoreFromEnv('auth', { NODE_ENV: 'development' })).toBeInstanceOf(MemoryEphemeralStore);
  });
});
