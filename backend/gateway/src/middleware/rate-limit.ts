import type { NextFunction, Request, Response } from 'express';

/**
 * Rate limiting del gateway para rutas públicas sensibles (login, MFA, OTP,
 * recuperación de contraseña, SSO, alta de compañía) y para el webhook de
 * telemetría (límite más alto).
 *
 * - Ventana deslizante exacta (registro de marcas de tiempo por llave, acotado
 *   al límite): sin el "doble ráfaga" de las ventanas fijas.
 * - Llave por IP (`req.ip`, que respeta `trust proxy`, así que un
 *   X-Forwarded-For falsificado no la cambia) y, si el body trae `email` o
 *   `phone`, también por identificador normalizado: frena el credential
 *   stuffing distribuido contra una misma cuenta.
 * - Respuesta 429 con `Retry-After` (segundos) y cuerpo JSON estándar.
 * - Fail-open: si el store falla (p.ej. Redis caído) se deja pasar y se
 *   loguea; los servicios de auth tienen sus propios límites de respaldo.
 *
 * Producción: este límite es una capa de defensa en profundidad, NO
 * sustituye a Cloud Armor (rate-based ban por IP en el LB, antes de llegar a
 * Cloud Run). Con varias réplicas del gateway el store en memoria cuenta por
 * réplica: usar una implementación de `RateLimitStore` sobre Redis /
 * Memorystore (ZSET por llave + script Lua atómico: ZREMRANGEBYSCORE, ZCARD,
 * ZADD, PEXPIRE).
 */

export interface RateLimitDecision {
  allowed: boolean;
  /** Intentos que quedan en la ventana tras este (0 si se rechazó). */
  remaining: number;
  /** Milisegundos hasta que se libera un lugar (0 si se permitió). */
  retryAfterMs: number;
}

/** Almacén de contadores. Debe ser atómico por llave (en Redis: script Lua). */
export interface RateLimitStore {
  /** Registra un intento si cabe en la ventana; los rechazos no se registran. */
  consume(key: string, limit: number, windowMs: number, now: number): Promise<RateLimitDecision>;
}

/** Store en memoria de una sola réplica. Acotado por `maxKeys` (descarta la llave más vieja). */
export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly hits = new Map<string, { stamps: number[]; windowMs: number }>();
  private readonly maxKeys: number;

  constructor(opts: { maxKeys?: number } = {}) {
    this.maxKeys = opts.maxKeys ?? 100_000;
  }

  async consume(key: string, limit: number, windowMs: number, now: number): Promise<RateLimitDecision> {
    let entry = this.hits.get(key);
    if (!entry) {
      if (this.hits.size >= this.maxKeys) {
        const oldest = this.hits.keys().next().value;
        if (oldest !== undefined) this.hits.delete(oldest);
      }
      entry = { stamps: [], windowMs };
      this.hits.set(key, entry);
    }
    entry.windowMs = windowMs;
    const since = now - windowMs;
    let drop = 0;
    while (drop < entry.stamps.length && entry.stamps[drop] <= since) drop++;
    if (drop > 0) entry.stamps.splice(0, drop);

    if (entry.stamps.length >= limit) {
      return { allowed: false, remaining: 0, retryAfterMs: Math.max(1, entry.stamps[0] + windowMs - now) };
    }
    entry.stamps.push(now);
    return { allowed: true, remaining: limit - entry.stamps.length, retryAfterMs: 0 };
  }

  /** Elimina llaves sin intentos vigentes. Llamar periódicamente. */
  sweep(now: number): void {
    for (const [key, entry] of this.hits) {
      const last = entry.stamps[entry.stamps.length - 1];
      if (last === undefined || last <= now - entry.windowMs) this.hits.delete(key);
    }
  }

  size(): number {
    return this.hits.size;
  }
}

export interface RateLimitRule {
  id: string;
  paths: RegExp[];
  /** Métodos limitados; por defecto todos. */
  methods?: string[];
  ipMax: number;
  ipWindowMs: number;
  /** Límite por identificador (email/phone del body); omitido = no aplica. */
  identifierMax?: number;
  identifierWindowMs?: number;
}

interface Limits {
  ipMax: number;
  ipWindowMs: number;
}

export interface RateLimitConfig {
  enabled: boolean;
  auth: Limits & { identifierMax: number; identifierWindowMs: number };
  ingest: Limits;
}

const DEFAULTS: RateLimitConfig = {
  enabled: true,
  // 30 intentos/min por IP: holgado para oficinas o carriers con NAT.
  // 10 intentos / 15 min por cuenta: frena fuerza bruta distribuida.
  auth: { ipMax: 30, ipWindowMs: 60_000, identifierMax: 10, identifierWindowMs: 15 * 60_000 },
  // Proveedores de GPS mandan lotes de muchas unidades desde pocas IPs.
  ingest: { ipMax: 3000, ipWindowMs: 60_000 },
};

function positiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

/**
 * Variables (todas opcionales):
 * RATE_LIMIT_ENABLED (0/false lo apaga), RATE_LIMIT_AUTH_MAX,
 * RATE_LIMIT_AUTH_WINDOW_MS, RATE_LIMIT_AUTH_ID_MAX,
 * RATE_LIMIT_AUTH_ID_WINDOW_MS, RATE_LIMIT_INGEST_MAX,
 * RATE_LIMIT_INGEST_WINDOW_MS.
 */
export function loadRateLimitConfig(env: Record<string, string | undefined>): RateLimitConfig {
  const flag = (env.RATE_LIMIT_ENABLED ?? '').trim().toLowerCase();
  return {
    enabled: !['0', 'false', 'off', 'no'].includes(flag),
    auth: {
      ipMax: positiveInt(env.RATE_LIMIT_AUTH_MAX, DEFAULTS.auth.ipMax),
      ipWindowMs: positiveInt(env.RATE_LIMIT_AUTH_WINDOW_MS, DEFAULTS.auth.ipWindowMs),
      identifierMax: positiveInt(env.RATE_LIMIT_AUTH_ID_MAX, DEFAULTS.auth.identifierMax),
      identifierWindowMs: positiveInt(env.RATE_LIMIT_AUTH_ID_WINDOW_MS, DEFAULTS.auth.identifierWindowMs),
    },
    ingest: {
      ipMax: positiveInt(env.RATE_LIMIT_INGEST_MAX, DEFAULTS.ingest.ipMax),
      ipWindowMs: positiveInt(env.RATE_LIMIT_INGEST_WINDOW_MS, DEFAULTS.ingest.ipWindowMs),
    },
  };
}

export function defaultRateLimitRules(cfg: RateLimitConfig): RateLimitRule[] {
  return [
    {
      id: 'auth',
      paths: [
        /^\/api\/auth\/login$/,
        /^\/api\/auth\/register-company$/,
        /^\/api\/auth\/(mfa|otp|password|sso)\/.+$/,
      ],
      ...cfg.auth,
    },
    { id: 'ingest', paths: [/^\/api\/telemetry\/ingest\/[a-z0-9_-]+$/], ...cfg.ingest },
  ];
}

export function matchRateLimitRule(rules: RateLimitRule[], method: string, path: string): RateLimitRule | null {
  return (
    rules.find(
      (r) => (!r.methods || r.methods.includes(method.toUpperCase())) && r.paths.some((p) => p.test(path)),
    ) ?? null
  );
}

/** Correo → minúsculas sin espacios; teléfono → solo dígitos. */
export function normalizeIdentifier(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (v.includes('@')) return v;
  const digits = v.replace(/\D/g, '');
  return digits || v;
}

export function identifierFromBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  for (const k of ['email', 'phone']) {
    if (typeof b[k] === 'string') {
      const n = normalizeIdentifier(b[k] as string);
      if (n) return n;
    }
  }
  return null;
}

export interface RateLimitMiddlewareOptions {
  rules: RateLimitRule[];
  store: RateLimitStore;
  now?: () => number;
  log?: (msg: string) => void;
}

export function createRateLimitMiddleware(opts: RateLimitMiddlewareOptions) {
  const now = opts.now ?? Date.now;
  // eslint-disable-next-line no-console
  const log = opts.log ?? ((m: string) => console.warn(m));

  return async function rateLimit(req: Request, res: Response, next: NextFunction) {
    const rule = matchRateLimitRule(opts.rules, req.method, req.path);
    if (!rule) return next();
    try {
      const t = now();
      const checks: Array<Promise<RateLimitDecision>> = [
        opts.store.consume(`${rule.id}:ip:${req.ip ?? 'unknown'}`, rule.ipMax, rule.ipWindowMs, t),
      ];
      const id = rule.identifierMax ? identifierFromBody(req.body) : null;
      if (id && rule.identifierMax) {
        checks.push(
          opts.store.consume(`${rule.id}:id:${id}`, rule.identifierMax, rule.identifierWindowMs ?? rule.ipWindowMs, t),
        );
      }
      const decisions = await Promise.all(checks);
      const denied = decisions.filter((d) => !d.allowed);
      if (denied.length === 0) return next();

      const retryAfterSeconds = Math.ceil(Math.max(...denied.map((d) => d.retryAfterMs)) / 1000);
      log(`[gateway] rate limit ${rule.id}: ${req.method} ${req.path} ip=${req.ip ?? '?'}`);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Demasiados intentos. Espera un momento antes de volver a intentar.',
        retryAfterSeconds,
      });
    } catch (e) {
      log(`[gateway] rate limit store falló (fail-open): ${(e as Error).message}`);
      return next();
    }
  };
}

/** Middleware listo para `main.ts`, configurado desde el entorno. */
export function rateLimitFromEnv(env: Record<string, string | undefined> = process.env) {
  const cfg = loadRateLimitConfig(env);
  if (!cfg.enabled) return (_req: Request, _res: Response, next: NextFunction) => next();
  const store = new InMemoryRateLimitStore();
  setInterval(() => store.sweep(Date.now()), 60_000).unref();
  return createRateLimitMiddleware({ rules: defaultRateLimitRules(cfg), store });
}
