/**
 * Estado efímero de auth contra Redis real (TEST_REDIS_URL): dos
 * contenedores comparten el store como lo harían dos réplicas de Cloud Run.
 */
import { randomUUID } from 'crypto';
import { createRedisFromEnv, RedisEphemeralStore, type EphemeralStore } from '@g3/platform';
import { describeIfRedis } from '@g3/platform/testing';
import { MfaChallengeService } from '../src/mfa/mfa-challenge';
import { EphemeralSsoStateStore } from '../src/sso/sso.repos';
import { ManualClock } from '../src/clock';
import { InMemoryUserRepo } from '../src/repos/in-memory.user.repo';
import { InMemoryCompanyRepo } from '../src/repos/in-memory.company.repo';
import { InMemoryAuditRepo } from '../src/audit/audit.repo';
import { buildTestContainer, META, registerOwner, type TestContainer } from './helpers/container';
import type { RecordingEmailSender, RecordingSmsSender } from '../src/passwordless/passwordless.service';
import type { ActorContext } from '../src/security/actor';

describeIfRedis('auth · estado efímero en Redis', () => {
  let redis: NonNullable<ReturnType<typeof createRedisFromEnv>>;
  let store: EphemeralStore;
  const prefix = `g3:test:auth:${randomUUID()}`;

  beforeAll(async () => {
    redis = createRedisFromEnv({ REDIS_URL: process.env.TEST_REDIS_URL })!;
    // Sin cola offline (así lo configura el kit): esperar la conexión antes del primer comando.
    if (redis.status !== 'ready') await new Promise((ok) => redis.once('ready', ok));
    store = new RedisEphemeralStore(redis, prefix);
  });
  afterAll(async () => {
    const keys = await redis.keys(`${prefix}:*`);
    if (keys.length) await redis.del(...keys);
    await redis.quit();
  });

  /** Dos "réplicas": mismo store y mismos repos, servicios independientes. */
  function replicas(): [TestContainer, TestContainer] {
    const repos = { users: new InMemoryUserRepo(), companies: new InMemoryCompanyRepo(), audit: new InMemoryAuditRepo() };
    // Reloj real: los TTL de Redis corren en tiempo real.
    const now = Date.now();
    return [buildTestContainer({ repos, ephemeral: store, now }), buildTestContainer({ repos, ephemeral: store, now })];
  }

  test('mfaToken: los intentos se suman entre réplicas y el reto se consume una sola vez', async () => {
    const clock = new ManualClock(Date.now());
    const a = new MfaChallengeService({ secret: 'm'.repeat(32), maxAttempts: 5 }, clock, store);
    const b = new MfaChallengeService({ secret: 'm'.repeat(32), maxAttempts: 5 }, clock, store);
    const { token } = await a.issue('usr_1', 'verify');
    const { jti } = await b.verify(token, 'verify');

    const fails = await Promise.all([a.recordFailure(jti), b.recordFailure(jti), a.recordFailure(jti), b.recordFailure(jti)]);
    expect(fails.map((f) => f.remaining).sort()).toEqual([1, 2, 3, 4]);
    expect(await b.verify(token, 'verify')).toMatchObject({ userId: 'usr_1' });

    const consumed = await Promise.all([a.consume(jti), b.consume(jti), a.consume(jti)]);
    expect(consumed.filter(Boolean)).toHaveLength(1);
    await expect(b.verify(token, 'verify')).rejects.toThrow(/ya usado/);
  });

  test('mfaToken: 5 fallos repartidos entre réplicas bloquean el reto', async () => {
    const clock = new ManualClock(Date.now());
    const a = new MfaChallengeService({ secret: 'm'.repeat(32), maxAttempts: 5 }, clock, store);
    const b = new MfaChallengeService({ secret: 'm'.repeat(32), maxAttempts: 5 }, clock, store);
    const { token } = await a.issue('usr_2', 'verify');
    const { jti } = await a.verify(token, 'verify');
    for (let i = 0; i < 5; i++) await (i % 2 ? a : b).recordFailure(jti);
    await expect(a.verify(token, 'verify')).rejects.toMatchObject({ status: 429 });
  });

  test('SSO state: lo que guarda una réplica lo consume otra, una sola vez', async () => {
    const a = new EphemeralSsoStateStore(store);
    const b = new EphemeralSsoStateStore(store);
    const state = randomUUID();
    await a.put(state, { companyId: 'cmp_1', nonce: 'n', codeVerifier: 'v', createdAtMs: 1 });
    const [x, y] = await Promise.all([b.take(state), a.take(state)]);
    expect([x, y].filter(Boolean)).toEqual([{ companyId: 'cmp_1', nonce: 'n', codeVerifier: 'v', createdAtMs: 1 }]);
  });

  test('SSO state: expira con el TTL de Redis', async () => {
    const s = new EphemeralSsoStateStore(store, 50);
    const state = randomUUID();
    await s.put(state, { companyId: 'c', nonce: 'n', codeVerifier: 'v', createdAtMs: 1 });
    await new Promise((r) => setTimeout(r, 120));
    expect(await s.take(state)).toBeNull();
  });

  test('OTP SMS: se pide en una réplica, se valida en otra y es de un solo uso', async () => {
    const [a, b] = replicas();
    const owner = await registerOwner(a, `owner-${randomUUID()}@acme.mx`);
    const actor: ActorContext = { userId: owner.user.id, companyId: owner.user.companyId, role: 'owner', ...META };
    const phone = `+5215${Math.floor(1e9 + Math.random() * 8e9)}`;
    await a.passwordless.grantDriverAccess(actor, { driverId: 'drv_1', phone, fullName: 'Juan' });
    await a.passwordless.requestOtp(phone, META);
    const code = (a.sms as RecordingSmsSender).sent.at(-1)!.body.match(/\b(\d{6})\b/)![1];
    const results = await Promise.allSettled([b.passwordless.verifyOtp(phone, code), a.passwordless.verifyOtp(phone, code)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });

  test('OTP SMS: el límite de envíos y los intentos se comparten entre réplicas', async () => {
    const [a, b] = replicas();
    const phone = `+5215${Math.floor(1e9 + Math.random() * 8e9)}`;
    await a.passwordless.requestOtp(phone);
    await b.passwordless.requestOtp(phone);
    await a.passwordless.requestOtp(phone);
    await expect(b.passwordless.requestOtp(phone)).rejects.toMatchObject({ status: 429 });

    const owner = await registerOwner(a, `owner-${randomUUID()}@acme.mx`);
    const actor: ActorContext = { userId: owner.user.id, companyId: owner.user.companyId, role: 'owner', ...META };
    const phone2 = `+5215${Math.floor(1e9 + Math.random() * 8e9)}`;
    await a.passwordless.grantDriverAccess(actor, { driverId: 'drv_2', phone: phone2, fullName: 'Ana' });
    await a.passwordless.requestOtp(phone2);
    const good = (a.sms as RecordingSmsSender).sent.at(-1)!.body.match(/\b(\d{6})\b/)![1];
    const bad = good === '000000' ? '111111' : '000000';
    // 5 intentos fallidos en paralelo, repartidos entre réplicas: ni uno más.
    await Promise.allSettled(Array.from({ length: 5 }, (_, i) => (i % 2 ? a : b).passwordless.verifyOtp(phone2, bad)));
    await expect(b.passwordless.verifyOtp(phone2, good)).rejects.toMatchObject({ status: 401 });
  });

  test('recuperación de contraseña: el enlace emitido en una réplica se usa una vez en otra', async () => {
    const [a, b] = replicas();
    const owner = await registerOwner(a, `owner-${randomUUID()}@acme.mx`);
    await a.passwordless.requestPasswordReset(owner.user.email);
    const token = (a.email as RecordingEmailSender).sent[0].body.match(/token=([A-Za-z0-9_-]+)/)![1];
    const r = await Promise.allSettled([
      b.passwordless.resetPassword(token, 'una-nueva-contraseña-larga'),
      a.passwordless.resetPassword(token, 'otra-nueva-contraseña-larga'),
    ]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    // Las llaves en Redis llevan solo hashes: el token en claro no aparece.
    const keys = await redis.keys(`${prefix}:*`);
    expect(keys.some((k) => k.includes(token))).toBe(false);
  });
});
