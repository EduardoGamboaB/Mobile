import Redis, { type RedisOptions } from 'ioredis';

/**
 * Estado efímero con TTL que debe compartirse entre réplicas: retos MFA,
 * `state` de SSO, códigos OTP, enlaces de recuperación, contadores de
 * intentos, rate limiting y cachés. En producción va a Redis
 * (Memorystore); en dev/tests a memoria.
 *
 * Todas las operaciones son atómicas en Redis (SET NX PX, GETDEL, INCR).
 */
export interface EphemeralStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs: number): Promise<void>;
  /** Escribe solo si no existe. Devuelve `true` si escribió (anti-replay, locks). */
  setIfAbsent(key: string, value: string, ttlMs: number): Promise<boolean>;
  /** Lee y borra en una sola operación (tokens de un solo uso). */
  take(key: string): Promise<string | null>;
  del(key: string): Promise<void>;
  /** Incrementa; el TTL se fija al crear la llave (ventana fija). */
  incr(key: string, ttlMs: number): Promise<number>;
  /**
   * Ventana deslizante: registra `now` y devuelve cuántos eventos hay en
   * `[now - windowMs, now]` y el más viejo. Para rate limiting.
   */
  slidingHit(key: string, now: number, windowMs: number): Promise<{ count: number; oldest: number }>;
  close(): Promise<void>;
  ping(): Promise<void>;
}

export class MemoryEphemeralStore implements EphemeralStore {
  private readonly data = new Map<string, { v: string; exp: number }>();
  private readonly windows = new Map<string, { stamps: number[]; exp: number }>();
  constructor(private readonly now: () => number = () => Date.now()) {}

  private live(key: string) {
    const e = this.data.get(key);
    if (!e) return null;
    if (e.exp <= this.now()) {
      this.data.delete(key);
      return null;
    }
    return e;
  }

  async get(key: string) {
    return this.live(key)?.v ?? null;
  }
  async set(key: string, value: string, ttlMs: number) {
    this.data.set(key, { v: value, exp: this.now() + ttlMs });
  }
  async setIfAbsent(key: string, value: string, ttlMs: number) {
    if (this.live(key)) return false;
    await this.set(key, value, ttlMs);
    return true;
  }
  async take(key: string) {
    const e = this.live(key);
    this.data.delete(key);
    return e?.v ?? null;
  }
  async del(key: string) {
    this.data.delete(key);
    this.windows.delete(key);
  }
  async incr(key: string, ttlMs: number) {
    const e = this.live(key);
    const n = (e ? Number(e.v) : 0) + 1;
    this.data.set(key, { v: String(n), exp: e?.exp ?? this.now() + ttlMs });
    return n;
  }
  async slidingHit(key: string, now: number, windowMs: number) {
    const w = this.windows.get(key) ?? { stamps: [], exp: 0 };
    w.stamps = w.stamps.filter((t) => t > now - windowMs);
    w.stamps.push(now);
    w.exp = now + windowMs;
    this.windows.set(key, w);
    if (this.windows.size > 100_000) {
      for (const [k, v] of this.windows) if (v.exp <= now) this.windows.delete(k);
    }
    return { count: w.stamps.length, oldest: w.stamps[0] };
  }
  async close() {}
  async ping() {}
}

/** Ventana deslizante atómica con un sorted set por llave. */
const SLIDING_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local member = ARGV[3]
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window)
local count = redis.call('ZCARD', key)
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
return {count, oldest[2]}
`;

export class RedisEphemeralStore implements EphemeralStore {
  private seq = 0;
  constructor(
    private readonly redis: Redis,
    /** Prefijo por servicio/ambiente para compartir instancia sin choques. */
    private readonly prefix: string,
  ) {}

  private k(key: string) {
    return `${this.prefix}:${key}`;
  }

  async get(key: string) {
    return this.redis.get(this.k(key));
  }
  async set(key: string, value: string, ttlMs: number) {
    await this.redis.set(this.k(key), value, 'PX', Math.max(1, Math.round(ttlMs)));
  }
  async setIfAbsent(key: string, value: string, ttlMs: number) {
    const r = await this.redis.set(this.k(key), value, 'PX', Math.max(1, Math.round(ttlMs)), 'NX');
    return r === 'OK';
  }
  async take(key: string) {
    return this.redis.getdel(this.k(key));
  }
  async del(key: string) {
    await this.redis.del(this.k(key));
  }
  async incr(key: string, ttlMs: number) {
    const k = this.k(key);
    const [[, n]] = (await this.redis
      .multi()
      .incr(k)
      .pexpire(k, Math.max(1, Math.round(ttlMs)), 'NX')
      .exec()) as [[Error | null, number], [Error | null, number]];
    return n;
  }
  async slidingHit(key: string, now: number, windowMs: number) {
    const member = `${now}-${process.pid}-${this.seq++}`;
    const [count, oldest] = (await this.redis.eval(SLIDING_LUA, 1, this.k(key), now, windowMs, member)) as [
      number,
      string,
    ];
    return { count: Number(count), oldest: Number(oldest) };
  }
  async close() {
    await this.redis.quit().catch(() => undefined);
  }
  async ping() {
    await this.redis.ping();
  }
}

/**
 * Redis desde el entorno: `REDIS_URL` (`redis://` o `rediss://` con TLS de
 * Memorystore). Sin variable → `null` (el servicio usa memoria, solo dev).
 */
export function createRedisFromEnv(env: NodeJS.ProcessEnv = process.env, extra: RedisOptions = {}): Redis | null {
  const url = env.REDIS_URL;
  if (!url) return null;
  return new Redis(url, {
    maxRetriesPerRequest: 2,
    // Con cola: los comandos emitidos mientras conecta (arranque, reconexión)
    // esperan en vez de fallar con "Stream isn't writeable"; si Redis sigue
    // caído, fallan tras `maxRetriesPerRequest` reintentos de conexión.
    enableOfflineQueue: true,
    connectTimeout: 5_000,
    lazyConnect: false,
    ...extra,
  });
}

/** Store efímero del servicio: Redis si hay `REDIS_URL`, si no memoria (prohibido en producción). */
export function ephemeralStoreFromEnv(service: string, env: NodeJS.ProcessEnv = process.env): EphemeralStore {
  const redis = createRedisFromEnv(env);
  if (redis) return new RedisEphemeralStore(redis, `g3:${env.G3_ENV ?? 'dev'}:${service}`);
  if (env.NODE_ENV === 'production' && env.ALLOW_MEMORY_STORES !== '1') {
    throw new Error(`[${service}] REDIS_URL es obligatorio en producción (estado compartido entre réplicas)`);
  }
  return new MemoryEphemeralStore();
}
