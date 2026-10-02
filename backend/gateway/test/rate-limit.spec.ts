import type { AddressInfo } from 'net';
import type { Server } from 'http';
import express from 'express';
import {
  InMemoryRateLimitStore,
  createRateLimitMiddleware,
  defaultRateLimitRules,
  identifierFromBody,
  loadRateLimitConfig,
  matchRateLimitRule,
  normalizeIdentifier,
  type RateLimitRule,
} from '../src/middleware/rate-limit';

describe('rate-limit: InMemoryRateLimitStore (ventana deslizante)', () => {
  test('permite hasta el límite y luego rechaza con retryAfter hasta que sale el intento más viejo', async () => {
    const store = new InMemoryRateLimitStore();
    const w = 60_000;
    expect(await store.consume('k', 3, w, 0)).toMatchObject({ allowed: true, remaining: 2 });
    expect(await store.consume('k', 3, w, 10_000)).toMatchObject({ allowed: true, remaining: 1 });
    expect(await store.consume('k', 3, w, 20_000)).toMatchObject({ allowed: true, remaining: 0 });
    const denied = await store.consume('k', 3, w, 30_000);
    expect(denied.allowed).toBe(false);
    // El intento de t=0 sale de la ventana en t=60s → faltan 30 s.
    expect(denied.retryAfterMs).toBe(30_000);
    // Ventana deslizante: en t=60s ya cabe uno (el de t=0 expiró) pero no dos.
    expect((await store.consume('k', 3, w, 60_000)).allowed).toBe(true);
    expect((await store.consume('k', 3, w, 60_001)).allowed).toBe(false);
  });

  test('los rechazos no alargan el bloqueo; las llaves son independientes', async () => {
    const store = new InMemoryRateLimitStore();
    await store.consume('a', 1, 1000, 0);
    for (let t = 1; t < 1000; t += 100) expect((await store.consume('a', 1, 1000, t)).allowed).toBe(false);
    expect((await store.consume('a', 1, 1000, 1000)).allowed).toBe(true);
    expect((await store.consume('b', 1, 1000, 1)).allowed).toBe(true);
  });

  test('sweep() libera llaves vencidas y maxKeys acota la memoria', async () => {
    const store = new InMemoryRateLimitStore({ maxKeys: 2 });
    await store.consume('a', 5, 1000, 0);
    await store.consume('b', 5, 1000, 0);
    await store.consume('c', 5, 1000, 0);
    expect(store.size()).toBeLessThanOrEqual(2);
    store.sweep(5000);
    expect(store.size()).toBe(0);
  });
});

describe('rate-limit: reglas y configuración', () => {
  const rules = defaultRateLimitRules(loadRateLimitConfig({}));

  test.each([
    ['POST', '/api/auth/login', 'auth'],
    ['POST', '/api/auth/mfa/verify', 'auth'],
    ['POST', '/api/auth/mfa/challenge/enroll', 'auth'],
    ['POST', '/api/auth/otp/request', 'auth'],
    ['POST', '/api/auth/otp/verify', 'auth'],
    ['POST', '/api/auth/password/forgot', 'auth'],
    ['POST', '/api/auth/password/reset', 'auth'],
    ['GET', '/api/auth/sso/start', 'auth'],
    ['POST', '/api/auth/register-company', 'auth'],
    ['POST', '/api/telemetry/ingest/suntech', 'ingest'],
  ])('%s %s → regla %s', (method, path, id) => {
    expect(matchRateLimitRule(rules, method, path)?.id).toBe(id);
  });

  test.each([
    ['POST', '/api/auth/refresh'],
    ['GET', '/api/auth/me'],
    ['GET', '/api/trips'],
    ['POST', '/api/auth/loginx'],
    ['GET', '/health'],
  ])('%s %s no se limita', (method, path) => {
    expect(matchRateLimitRule(rules, method, path)).toBeNull();
  });

  test('defaults razonables y la ingesta tiene un límite más alto que auth', () => {
    const cfg = loadRateLimitConfig({});
    expect(cfg.enabled).toBe(true);
    expect(cfg.auth.ipMax).toBeGreaterThan(0);
    expect(cfg.auth.identifierMax).toBeGreaterThan(0);
    expect(cfg.ingest.ipMax).toBeGreaterThan(cfg.auth.ipMax);
  });

  test('se configura por variables RATE_LIMIT_*; valores inválidos usan el default', () => {
    const cfg = loadRateLimitConfig({
      RATE_LIMIT_ENABLED: '0',
      RATE_LIMIT_AUTH_MAX: '7',
      RATE_LIMIT_AUTH_WINDOW_MS: '1000',
      RATE_LIMIT_AUTH_ID_MAX: '3',
      RATE_LIMIT_AUTH_ID_WINDOW_MS: '2000',
      RATE_LIMIT_INGEST_MAX: 'abc',
      RATE_LIMIT_INGEST_WINDOW_MS: '-5',
    });
    expect(cfg.enabled).toBe(false);
    expect(cfg.auth).toEqual({ ipMax: 7, ipWindowMs: 1000, identifierMax: 3, identifierWindowMs: 2000 });
    expect(cfg.ingest).toEqual(loadRateLimitConfig({}).ingest);
  });

  test('normaliza identificadores: correo en minúsculas y teléfono solo dígitos', () => {
    expect(normalizeIdentifier(' Ana@Example.COM ')).toBe('ana@example.com');
    expect(normalizeIdentifier('+52 (55) 1234-5678')).toBe('525512345678');
    expect(normalizeIdentifier('')).toBeNull();
    expect(identifierFromBody({ email: 'A@b.mx', password: 'x' })).toBe('a@b.mx');
    expect(identifierFromBody({ phone: '+52 55 1234 5678' })).toBe('525512345678');
    expect(identifierFromBody({ password: 'x' })).toBeNull();
    expect(identifierFromBody('texto')).toBeNull();
    expect(identifierFromBody({ email: 42 })).toBeNull();
  });
});

describe('rate-limit: middleware montado en express', () => {
  let server: Server;
  let base: string;
  let now = 1_000_000;
  const rules: RateLimitRule[] = [
    { id: 'auth', paths: [/^\/api\/auth\/login$/], ipMax: 3, ipWindowMs: 60_000, identifierMax: 2, identifierWindowMs: 60_000 },
    { id: 'ingest', paths: [/^\/api\/telemetry\/ingest\/[a-z0-9_-]+$/], ipMax: 5, ipWindowMs: 60_000 },
  ];

  beforeAll(async () => {
    const app = express();
    app.set('trust proxy', 1);
    app.use(express.json());
    app.use(createRateLimitMiddleware({ rules, store: new InMemoryRateLimitStore(), now: () => now, log: () => {} }));
    app.use((_req, res) => res.json({ ok: true }));
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => resolve());
    });
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    await new Promise((r) => server.close(r));
  });

  const post = (path: string, body: unknown, ip: string) =>
    fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify(body),
    });

  test('por identificador: el 3er intento al mismo correo desde IPs distintas recibe 429 con Retry-After', async () => {
    expect((await post('/api/auth/login', { email: 'Chofer@G3.mx' }, '10.0.0.1')).status).toBe(200);
    expect((await post('/api/auth/login', { email: 'chofer@g3.mx ' }, '10.0.0.2')).status).toBe(200);
    now += 10_000;
    const r = await post('/api/auth/login', { email: 'CHOFER@g3.mx' }, '10.0.0.3');
    expect(r.status).toBe(429);
    expect(r.headers.get('retry-after')).toBe('50');
    expect(await r.json()).toEqual({
      statusCode: 429,
      error: 'Too Many Requests',
      message: expect.stringContaining('Demasiados intentos'),
      retryAfterSeconds: 50,
    });
  });

  test('por IP: la 4a petición desde la misma IP se rechaza aunque cambie el correo', async () => {
    for (const e of ['a@x.mx', 'b@x.mx', 'c@x.mx']) {
      expect((await post('/api/auth/login', { email: e }, '10.0.1.1')).status).toBe(200);
    }
    expect((await post('/api/auth/login', { email: 'd@x.mx' }, '10.0.1.1')).status).toBe(429);
    // Otra IP sigue pasando.
    expect((await post('/api/auth/login', { email: 'e@x.mx' }, '10.0.1.2')).status).toBe(200);
  });

  test('la ingesta tiene su propio límite y las rutas no listadas no se limitan', async () => {
    for (let i = 0; i < 5; i++) expect((await post('/api/telemetry/ingest/suntech', {}, '10.0.2.1')).status).toBe(200);
    expect((await post('/api/telemetry/ingest/suntech', {}, '10.0.2.1')).status).toBe(429);
    for (let i = 0; i < 10; i++) expect((await post('/api/trips', {}, '10.0.2.1')).status).toBe(200);
  });

  test('si el store falla, deja pasar (fail-open) en vez de tumbar el login', async () => {
    const app = express();
    app.use(express.json());
    const broken = { consume: async () => { throw new Error('redis caído'); } };
    const logs: string[] = [];
    app.use(createRateLimitMiddleware({ rules, store: broken, log: (m) => logs.push(m) }));
    app.use((_req, res) => res.json({ ok: true }));
    const s = await new Promise<Server>((resolve) => {
      const srv = app.listen(0, '127.0.0.1', () => resolve(srv));
    });
    const r = await fetch(`http://127.0.0.1:${(s.address() as AddressInfo).port}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    await new Promise((res) => s.close(res));
    expect(r.status).toBe(200);
    expect(logs.join(' ')).toContain('redis caído');
  });
});
