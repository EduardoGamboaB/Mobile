import { readJson, requestWithTimeout, globalFetch, type FetchLike } from './http';

/**
 * Resolución de secretos:
 *  - `env:NOMBRE` → variable de entorno del proceso.
 *  - `gsm:projects/<p>/secrets/<s>[/versions/<v>]` → Secret Manager vía REST
 *    (`…:access`) con el token de la cuenta de servicio que da el metadata
 *    server de Cloud Run/GCE. Sin versión = `latest`.
 *  - cualquier otro valor → literal ya descifrado (se devuelve tal cual).
 *
 * `resolveReference` es la variante estricta (no acepta literales) que usa
 * el SSO OIDC de auth, donde también se acepta `projects/…` sin prefijo.
 */

export const GSM_REF_RE = /^gsm:projects\/([a-z0-9][a-z0-9-]{0,62})\/secrets\/([A-Za-z0-9_-]{1,255})(?:\/versions\/(latest|\d+))?$/;
export const ENV_REF_RE = /^env:([A-Z_][A-Z0-9_]*)$/;

export type SecretReference =
  | { kind: 'env'; name: string }
  | { kind: 'gsm'; project: string; secret: string; version: string }
  | { kind: 'literal' };

export function parseSecretReference(value: string): SecretReference {
  const env = ENV_REF_RE.exec(value);
  if (env) return { kind: 'env', name: env[1] };
  const gsm = GSM_REF_RE.exec(value);
  if (gsm) return { kind: 'gsm', project: gsm[1], secret: gsm[2], version: gsm[3] ?? 'latest' };
  return { kind: 'literal' };
}

/** `true` si parece una referencia (prefijo env:/gsm:), válida o no. */
export function looksLikeSecretReference(value: string): boolean {
  return /^(env|gsm):/.test(value);
}

export class SecretResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecretResolutionError';
  }
}

export interface SecretResolverOptions {
  fetch?: FetchLike;
  env?: Record<string, string | undefined>;
  now?: () => number;
  /** Caché de valores de Secret Manager (default 5 min). */
  cacheTtlMs?: number;
  timeoutMs?: number;
  metadataTokenUrl?: string;
  secretManagerBase?: string;
}

export const METADATA_TOKEN_URL =
  'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

export class SecretResolver {
  private readonly fetchImpl: FetchLike;
  private readonly env: Record<string, string | undefined>;
  private readonly now: () => number;
  private readonly ttl: number;
  private token: { value: string; expiresAt: number } | null = null;
  private readonly cache = new Map<string, { value: string; expiresAt: number }>();

  constructor(private readonly opts: SecretResolverOptions = {}) {
    this.fetchImpl = opts.fetch ?? globalFetch;
    this.env = opts.env ?? process.env;
    this.now = opts.now ?? Date.now;
    this.ttl = opts.cacheTtlMs ?? 5 * 60_000;
  }

  async resolve(value: string): Promise<string> {
    if (looksLikeSecretReference(value)) return this.resolveReference(value);
    return value;
  }

  /** Solo referencias (`env:`, `gsm:` o `projects/…`); un literal es error. */
  async resolveReference(ref: string): Promise<string> {
    const normalized = ref.startsWith('projects/') ? `gsm:${ref}` : ref;
    const parsed = parseSecretReference(normalized);
    if (parsed.kind === 'env') {
      const v = this.env[parsed.name];
      if (!v) throw new SecretResolutionError(`La variable de entorno ${parsed.name} no está definida`);
      return v;
    }
    if (parsed.kind === 'gsm') return this.accessSecretVersion(parsed.project, parsed.secret, parsed.version);
    throw new SecretResolutionError('Referencia de secreto inválida (usa env:NOMBRE o gsm:projects/<p>/secrets/<s>/versions/<v>)');
  }

  invalidate(): void {
    this.cache.clear();
    this.token = null;
  }

  private async accessSecretVersion(project: string, secret: string, version: string): Promise<string> {
    const name = `projects/${project}/secrets/${secret}/versions/${version}`;
    const hit = this.cache.get(name);
    if (hit && hit.expiresAt > this.now()) return hit.value;
    const token = await this.accessToken();
    const base = this.opts.secretManagerBase ?? 'https://secretmanager.googleapis.com/v1';
    let res;
    try {
      res = await requestWithTimeout(
        this.fetchImpl,
        `${base}/${name}:access`,
        { method: 'GET', headers: { authorization: `Bearer ${token}`, accept: 'application/json' } },
        this.opts.timeoutMs,
      );
    } catch {
      throw new SecretResolutionError(`No se pudo contactar Secret Manager para ${name}`);
    }
    if (!res.ok) {
      const why = res.status === 403 ? 'sin permiso secretAccessor' : res.status === 404 ? 'no existe' : `HTTP ${res.status}`;
      throw new SecretResolutionError(`Secret Manager rechazó ${name} (${why})`);
    }
    const data = ((await readJson(res))?.payload as { data?: string } | undefined)?.data;
    if (typeof data !== 'string') throw new SecretResolutionError(`Respuesta de Secret Manager sin payload para ${name}`);
    const value = Buffer.from(data, 'base64').toString('utf8');
    this.cache.set(name, { value, expiresAt: this.now() + this.ttl });
    return value;
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > this.now()) return this.token.value;
    let res;
    try {
      res = await requestWithTimeout(
        this.fetchImpl,
        this.opts.metadataTokenUrl ?? METADATA_TOKEN_URL,
        { method: 'GET', headers: { 'Metadata-Flavor': 'Google' } },
        this.opts.timeoutMs,
      );
    } catch {
      throw new SecretResolutionError('No hay metadata server (¿fuera de GCP?): no se puede leer Secret Manager');
    }
    if (!res.ok) throw new SecretResolutionError(`El metadata server respondió HTTP ${res.status}`);
    const json = await readJson(res);
    const value = typeof json?.access_token === 'string' ? json.access_token : '';
    if (!value) throw new SecretResolutionError('El metadata server no devolvió access_token');
    const expiresIn = typeof json?.expires_in === 'number' ? json.expires_in : 300;
    // Renueva un minuto antes de que venza.
    this.token = { value, expiresAt: this.now() + Math.max(0, expiresIn - 60) * 1000 };
    return value;
  }
}
