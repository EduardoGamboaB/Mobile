/**
 * Piezas de operación comunes a todos los servicios: logs estructurados
 * (Cloud Logging), health/readiness, apagado ordenado, configuración
 * obligatoria en producción y llamadas autenticadas entre servicios.
 */
import { timingSafeEqual } from 'crypto';

type Severity = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';

/** Logger JSON de una línea: Cloud Logging toma `severity` y `message`. */
export function createLogger(service: string) {
  const write = (severity: Severity, message: string, fields: Record<string, unknown> = {}) => {
    const line = JSON.stringify({ severity, message, service, time: new Date().toISOString(), ...fields });
    // eslint-disable-next-line no-console
    (severity === 'ERROR' || severity === 'WARNING' ? console.error : console.log)(line);
  };
  return {
    debug: (m: string, f?: Record<string, unknown>) => write('DEBUG', m, f),
    info: (m: string, f?: Record<string, unknown>) => write('INFO', m, f),
    warn: (m: string, f?: Record<string, unknown>) => write('WARNING', m, f),
    error: (m: string, f?: Record<string, unknown>) => write('ERROR', m, f),
  };
}
export type Logger = ReturnType<typeof createLogger>;

export const isProduction = (env: NodeJS.ProcessEnv = process.env) => env.NODE_ENV === 'production';

/**
 * Falla al arrancar si faltan variables obligatorias en producción (mejor un
 * deploy que no levanta que un servicio que corre a medias).
 */
export function assertProductionEnv(service: string, required: string[], env: NodeJS.ProcessEnv = process.env) {
  if (!isProduction(env)) return;
  const missing = required.filter((k) => !env[k]);
  if (missing.length) throw new Error(`[${service}] faltan variables obligatorias en producción: ${missing.join(', ')}`);
}

export type ReadinessCheck = { name: string; check: () => Promise<void> };

export interface HealthReport {
  ok: boolean;
  service: string;
  checks: Record<string, 'ok' | string>;
}

/** Corre las verificaciones de readiness con timeout individual. */
export async function readiness(service: string, checks: ReadinessCheck[], timeoutMs = 2_000): Promise<HealthReport> {
  const results: Record<string, string> = {};
  await Promise.all(
    checks.map(async (c) => {
      try {
        await Promise.race([
          c.check(),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs)),
        ]);
        results[c.name] = 'ok';
      } catch (e) {
        results[c.name] = (e as Error).message || 'error';
      }
    }),
  );
  return { ok: Object.values(results).every((v) => v === 'ok'), service, checks: results };
}

interface ExpressLike {
  get(path: string, handler: (req: unknown, res: { status(n: number): { json(b: unknown): void } }) => void): void;
}

/**
 * `/health` (liveness: el proceso responde) y `/ready` (readiness: DB/Redis
 * accesibles). Cloud Run usa el startup/liveness probe sobre estas rutas.
 */
export function registerHealthRoutes(app: ExpressLike, service: string, checks: ReadinessCheck[]) {
  app.get('/health', (_req, res) => res.status(200).json({ ok: true, service }));
  app.get('/ready', (_req, res) => {
    void readiness(service, checks).then((r) => res.status(r.ok ? 200 : 503).json(r));
  });
}

/**
 * Apagado ordenado: Cloud Run manda SIGTERM y da 10 s. Se dejan de aceptar
 * peticiones (app.close) y luego se cierran pool/Redis.
 */
export function onShutdown(log: Logger, steps: Array<() => Promise<unknown>>) {
  let done = false;
  const run = async (signal: string) => {
    if (done) return;
    done = true;
    log.info(`apagando (${signal})`);
    for (const s of steps) {
      await s().catch((e: unknown) => log.warn('fallo al cerrar', { error: (e as Error).message }));
    }
    process.exit(0);
  };
  process.once('SIGTERM', () => void run('SIGTERM'));
  process.once('SIGINT', () => void run('SIGINT'));
}

/** Compara secretos en tiempo constante (tokens internos). */
export function safeEqual(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

type FetchLike = typeof fetch;

/**
 * Llamada servicio→servicio. Siempre agrega `x-internal-token`; con
 * `SERVICE_AUTH=gcp` además pide al metadata server un ID token con
 * audiencia = URL base del destino (Cloud Run con --no-allow-unauthenticated
 * exige rol run.invoker). El ID token se cachea hasta 5 min antes de expirar.
 */
export function createServiceFetch(opts: {
  internalToken?: string;
  mode?: 'none' | 'gcp';
  fetchImpl?: FetchLike;
  now?: () => number;
}) {
  const f = opts.fetchImpl ?? fetch;
  const now = opts.now ?? (() => Date.now());
  const cache = new Map<string, { token: string; exp: number }>();

  async function idToken(audience: string): Promise<string> {
    const hit = cache.get(audience);
    if (hit && hit.exp - 5 * 60_000 > now()) return hit.token;
    const r = await f(
      `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(audience)}&format=full`,
      { headers: { 'Metadata-Flavor': 'Google' } },
    );
    if (!r.ok) throw new Error(`metadata server respondió ${r.status} al pedir ID token`);
    const token = (await r.text()).trim();
    let exp = now() + 55 * 60_000;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as { exp?: number };
      if (payload.exp) exp = payload.exp * 1000;
    } catch {
      /* token opaco: se usa el TTL por defecto */
    }
    cache.set(audience, { token, exp });
    return token;
  }

  return async function serviceFetch(url: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    if (opts.internalToken) headers.set('x-internal-token', opts.internalToken);
    if (opts.mode === 'gcp') {
      const audience = new URL(url).origin;
      headers.set('authorization', `Bearer ${await idToken(audience)}`);
    }
    return f(url, { ...init, headers });
  };
}

export function serviceFetchFromEnv(env: NodeJS.ProcessEnv = process.env, fetchImpl?: FetchLike) {
  return createServiceFetch({
    internalToken: env.INTERNAL_TOKEN,
    mode: env.SERVICE_AUTH === 'gcp' ? 'gcp' : 'none',
    fetchImpl,
  });
}
