import { EventEmitter } from 'events';
import type { ResolvedIntegrationDto } from '@g3/contracts';
import { createRedisFromEnv, createServiceFetch } from '@g3/platform';
import { describeIfRedis } from '@g3/platform/testing';
import {
  applyInvalidation,
  IntegrationsClient,
  invalidationChannel,
  parseIntegrationChange,
  redisChangePublisher,
  subscribeToIntegrationChanges,
  type FetchLike,
} from '../src';
import { fakeFetch } from './fake-fetch';

const TOKEN = 'internal-token-de-prueba-32-chars!!';
const remote = (over: Partial<ResolvedIntegrationDto> = {}): ResolvedIntegrationDto => ({
  category: 'whatsapp', slot: 'default', source: 'company', provider: 'meta_cloud',
  settings: { phoneNumberId: '111' }, secrets: { accessToken: 'tok' }, ...over,
});

/** Pub/sub en memoria con la forma de ioredis (subscribe/on/publish). */
class FakeBus {
  private readonly subs: Array<FakeSubscriber> = [];
  subscriber() {
    const s = new FakeSubscriber();
    this.subs.push(s);
    return s;
  }
  async publish(channel: string, message: string) {
    for (const s of this.subs) if (s.channels.has(channel)) s.emit('message', channel, message);
    return this.subs.length;
  }
}
class FakeSubscriber extends EventEmitter {
  readonly channels = new Set<string>();
  status = 'ready';
  async subscribe(channel: string) {
    this.channels.add(channel);
  }
}

describe('invalidación cruzada de IntegrationsClient', () => {
  test('canal por ambiente y formato del aviso', () => {
    expect(invalidationChannel({ G3_ENV: 'prod' })).toBe('g3:prod:integrations:invalidate');
    expect(invalidationChannel({})).toBe('g3:dev:integrations:invalidate');
    expect(parseIntegrationChange('{"scope":"company","companyId":"cmp_1","category":"sms","slot":"default"}')).toEqual({
      scope: 'company', companyId: 'cmp_1', category: 'sms', slot: 'default',
    });
    expect(parseIntegrationChange('no-json')).toBeNull();
    expect(parseIntegrationChange('{"scope":"x"}')).toBeNull();
  });

  test('un cambio de compañía invalida solo esa compañía; uno de plataforma, a todas', async () => {
    const f = fakeFetch({ body: remote() });
    const c = new IntegrationsClient({ baseUrl: 'http://i', internalToken: TOKEN, fetch: f, env: {} });
    await c.resolve('cmp_1', 'whatsapp');
    await c.resolve('cmp_2', 'whatsapp');
    await c.resolve('cmp_1', 'sms');
    applyInvalidation(c, { scope: 'company', companyId: 'cmp_1', category: 'whatsapp', slot: 'default' });
    await c.resolve('cmp_1', 'whatsapp');
    await c.resolve('cmp_2', 'whatsapp');
    await c.resolve('cmp_1', 'sms');
    expect(f.calls).toHaveLength(4);
    applyInvalidation(c, { scope: 'platform', companyId: null, category: 'whatsapp', slot: 'default' });
    await c.resolve('cmp_1', 'whatsapp');
    await c.resolve('cmp_2', 'whatsapp');
    await c.resolve('cmp_1', 'sms');
    expect(f.calls).toHaveLength(6);
  });

  test('dos réplicas suscritas: el aviso publicado limpia ambas cachés; la reconexión limpia todo', async () => {
    const bus = new FakeBus();
    const f = fakeFetch({ body: remote() });
    const mk = () => new IntegrationsClient({ baseUrl: 'http://i', internalToken: TOKEN, fetch: f, env: {} });
    const [a, b] = [mk(), mk()];
    const subA = bus.subscriber();
    await subscribeToIntegrationChanges(subA, a, { channel: 'ch' });
    await subscribeToIntegrationChanges(bus.subscriber(), b, { channel: 'ch' });
    await a.resolve('cmp_1', 'whatsapp');
    await b.resolve('cmp_1', 'whatsapp');
    expect(f.calls).toHaveLength(2);
    await redisChangePublisher(bus, { channel: 'ch' })({ scope: 'company', companyId: 'cmp_1', category: 'whatsapp', slot: 'default' });
    await a.resolve('cmp_1', 'whatsapp');
    await b.resolve('cmp_1', 'whatsapp');
    expect(f.calls).toHaveLength(4);
    subA.emit('ready');
    await a.resolve('cmp_1', 'whatsapp');
    expect(f.calls).toHaveLength(5);
  });

  test('el publicador nunca lanza (el TTL es el respaldo)', async () => {
    const errors: string[] = [];
    const publish = redisChangePublisher({ publish: async () => { throw new Error('ECONNREFUSED'); } }, { onError: (m) => errors.push(m) });
    await expect(publish({ scope: 'company', companyId: 'c', category: 'sms', slot: 'default' })).resolves.toBeUndefined();
    expect(errors[0]).toMatch(/invalidación/);
  });
});

describe('IntegrationsClient con serviceFetch de @g3/platform', () => {
  test('con SERVICE_AUTH=gcp manda x-internal-token y el ID token con audiencia = integrations', async () => {
    const seen: Array<{ url: string; headers: Headers }> = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      seen.push({ url, headers: new Headers(init?.headers) });
      if (url.startsWith('http://metadata.google.internal')) return new Response('id-token-xyz');
      return new Response(JSON.stringify(remote()), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch;
    const serviceFetch = createServiceFetch({ internalToken: TOKEN, mode: 'gcp', fetchImpl });
    const fetchLike: FetchLike = serviceFetch;
    const c = new IntegrationsClient({ baseUrl: 'https://integrations-abc.a.run.app', internalToken: TOKEN, fetch: fetchLike, env: {} });
    expect(await c.resolve('cmp_1', 'whatsapp')).toMatchObject({ source: 'company' });
    expect(seen[0].url).toContain('audience=https%3A%2F%2Fintegrations-abc.a.run.app');
    const call = seen[1];
    expect(call.url).toMatch(/^https:\/\/integrations-abc\.a\.run\.app\/api\/integrations\/internal\/resolve/);
    expect(call.headers.get('x-internal-token')).toBe(TOKEN);
    expect(call.headers.get('authorization')).toBe('Bearer id-token-xyz');
  });
});

describeIfRedis('invalidación por Redis real', () => {
  const env = { REDIS_URL: process.env.TEST_REDIS_URL };
  const conns: Array<{ quit(): Promise<unknown> }> = [];
  afterAll(async () => {
    await Promise.all(conns.map((c) => c.quit().catch(() => undefined)));
  });

  test('integrations publica y las dos réplicas suscritas invalidan', async () => {
    const channel = `g3:test-${Date.now()}:integrations:invalidate`;
    const pub = createRedisFromEnv(env)!;
    const subA = createRedisFromEnv(env)!;
    const subB = createRedisFromEnv(env)!;
    conns.push(pub, subA, subB);
    const f = fakeFetch({ body: remote() });
    const mk = () => new IntegrationsClient({ baseUrl: 'http://i', internalToken: TOKEN, fetch: f, env: {} });
    const [a, b] = [mk(), mk()];
    await subscribeToIntegrationChanges(subA, a, { channel });
    await subscribeToIntegrationChanges(subB, b, { channel });
    await a.resolve('cmp_1', 'whatsapp');
    await b.resolve('cmp_1', 'whatsapp');
    expect(f.calls).toHaveLength(2);

    const received = new Promise<void>((resolve) => {
      let n = 0;
      const done = () => (++n === 2 ? resolve() : undefined);
      subA.once('message', done);
      subB.once('message', done);
    });
    await redisChangePublisher(pub, { channel })({ scope: 'company', companyId: 'cmp_1', category: 'whatsapp', slot: 'default' });
    await received;
    await a.resolve('cmp_1', 'whatsapp');
    await b.resolve('cmp_1', 'whatsapp');
    expect(f.calls).toHaveLength(4);
  });
});
