import type { IntegrationCategory, ResolvedIntegrationDto } from '@g3/contracts';
import { globalFetch, readJson, requestWithTimeout, type FetchLike } from './http';
import { envFallbackFor, type EnvLike } from './env-fallback';

export interface IntegrationResolver {
  resolve(companyId: string | null, category: IntegrationCategory, slot?: string): Promise<ResolvedIntegrationDto>;
}

export interface IntegrationsClientOptions {
  /** URL del servicio integrations (`INTEGRATIONS_URL`), sin `/api`. Vacío = solo entorno. */
  baseUrl?: string;
  /** `INTERNAL_TOKEN` compartido entre servicios. */
  internalToken?: string;
  /**
   * `fetch` para llamar a integrations. En los servicios: `serviceFetchFromEnv()`
   * de @g3/platform (agrega el ID token de Cloud Run con SERVICE_AUTH=gcp).
   */
  fetch?: FetchLike;
  env?: EnvLike;
  /** TTL de la caché por (companyId, categoría, ranura). Default 60 s. */
  ttlMs?: number;
  now?: () => number;
  timeoutMs?: number;
  /** Aviso cuando el servicio no responde (se usa el entorno). Sin secretos. */
  onError?: (message: string) => void;
}

/**
 * Cliente del endpoint interno `GET /api/integrations/internal/resolve`.
 *
 * Orden: lo que diga el servicio (compañía → plataforma → entorno del
 * servicio) y, si el servicio dice `none` o no responde, las variables de
 * entorno de ESTE proceso (`envFallback` del catálogo). Caché de 60 s por
 * (companyId, categoría, ranura) por instancia; `invalidate()` la limpia y
 * `subscribeToIntegrationChanges` la conecta a los avisos de integrations
 * (Redis pub/sub) para que un cambio se vea en todas las réplicas al instante.
 */
export class IntegrationsClient implements IntegrationResolver {
  private readonly cache = new Map<string, { value: ResolvedIntegrationDto; expiresAt: number }>();
  private readonly fetchImpl: FetchLike;
  private readonly now: () => number;
  private readonly ttl: number;
  private readonly env: EnvLike;

  constructor(private readonly opts: IntegrationsClientOptions = {}) {
    this.fetchImpl = opts.fetch ?? globalFetch;
    this.now = opts.now ?? Date.now;
    this.ttl = opts.ttlMs ?? 60_000;
    this.env = opts.env ?? process.env;
  }

  async resolve(companyId: string | null, category: IntegrationCategory, slot = 'default'): Promise<ResolvedIntegrationDto> {
    const key = `${companyId ?? ''}|${category}|${slot}`;
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > this.now()) return hit.value;

    const remote = await this.fetchRemote(companyId, category, slot);
    const value = remote && remote.source !== 'none' ? remote : this.fromEnv(category, slot);
    // Si el servicio no respondió no se cachea: el siguiente intento vuelve a preguntar.
    if (remote) this.cache.set(key, { value, expiresAt: this.now() + this.ttl });
    return value;
  }

  /** Sin argumentos limpia todo; con argumentos, solo lo que coincida. */
  invalidate(companyId?: string | null, category?: IntegrationCategory, slot?: string): void {
    if (companyId === undefined && !category && !slot) {
      this.cache.clear();
      return;
    }
    for (const k of [...this.cache.keys()]) {
      const [c, cat, s] = k.split('|');
      if (companyId !== undefined && c !== (companyId ?? '')) continue;
      if (category && cat !== category) continue;
      if (slot && s !== slot) continue;
      this.cache.delete(k);
    }
  }

  fromEnv(category: IntegrationCategory, slot: string): ResolvedIntegrationDto {
    const env = slot === 'default' ? envFallbackFor(category, this.env) : null;
    return env
      ? { category, slot, source: 'env', provider: env.provider, settings: env.settings, secrets: env.secrets }
      : { category, slot, source: 'none', provider: null, settings: {}, secrets: {} };
  }

  private async fetchRemote(companyId: string | null, category: IntegrationCategory, slot: string): Promise<ResolvedIntegrationDto | null> {
    const base = (this.opts.baseUrl ?? '').replace(/\/$/, '');
    if (!base || !this.opts.internalToken) return null;
    const q = new URLSearchParams({ category, slot, ...(companyId ? { companyId } : {}) }).toString();
    try {
      const res = await requestWithTimeout(
        this.fetchImpl,
        `${base}/api/integrations/internal/resolve?${q}`,
        { method: 'GET', headers: { 'x-internal-token': this.opts.internalToken, accept: 'application/json' } },
        this.opts.timeoutMs ?? 5_000,
      );
      if (!res.ok) {
        this.opts.onError?.(`[integrations-client] ${category}/${slot}: el servicio respondió HTTP ${res.status}; se usa el entorno`);
        return null;
      }
      const json = (await readJson(res)) as ResolvedIntegrationDto | null;
      if (!json || typeof json.source !== 'string') return null;
      return { ...json, settings: json.settings ?? {}, secrets: json.secrets ?? {} };
    } catch {
      this.opts.onError?.(`[integrations-client] ${category}/${slot}: servicio no disponible; se usa el entorno`);
      return null;
    }
  }
}

/** Resolver fijo para tests y para servicios sin integrations. */
export class StaticIntegrationResolver implements IntegrationResolver {
  readonly calls: { companyId: string | null; category: IntegrationCategory; slot: string }[] = [];
  constructor(private readonly table: Partial<Record<string, Omit<ResolvedIntegrationDto, 'category' | 'slot'>>> = {}) {}

  /** Clave: `companyId|category|slot` o `*|category|slot` como comodín. */
  async resolve(companyId: string | null, category: IntegrationCategory, slot = 'default'): Promise<ResolvedIntegrationDto> {
    this.calls.push({ companyId, category, slot });
    const hit = this.table[`${companyId ?? ''}|${category}|${slot}`] ?? this.table[`*|${category}|${slot}`];
    return hit
      ? { category, slot, ...hit }
      : { category, slot, source: 'none', provider: null, settings: {}, secrets: {} };
  }
}
