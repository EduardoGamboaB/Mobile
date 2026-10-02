import type { SsoConfigDto } from '@g3/contracts';
import { MemoryEphemeralStore, type EphemeralStore } from '@g3/platform';
import { AuthError } from '../errors';

export interface SsoConfigRepo {
  findByCompany(companyId: string): Promise<SsoConfigDto | null>;
  findByDomain(domain: string): Promise<SsoConfigDto | null>;
  /** Un dominio solo puede pertenecer a una compañía: si ya es de otra → 409. */
  save(cfg: SsoConfigDto): Promise<void>;
}

export class InMemorySsoConfigRepo implements SsoConfigRepo {
  private readonly byCompany = new Map<string, SsoConfigDto>();
  async findByCompany(companyId: string) {
    const c = this.byCompany.get(companyId);
    return c ? structuredClone(c) : null;
  }
  async findByDomain(domain: string) {
    const d = domain.toLowerCase();
    for (const c of this.byCompany.values()) if (c.allowedDomains.includes(d)) return structuredClone(c);
    return null;
  }
  async save(cfg: SsoConfigDto) {
    // Misma regla que la PK de sso_config_domains en Postgres.
    for (const c of this.byCompany.values()) {
      if (c.companyId === cfg.companyId) continue;
      const taken = cfg.allowedDomains.find((d) => c.allowedDomains.includes(d.toLowerCase()));
      if (taken) throw new AuthError(409, `El dominio ${taken} ya está asociado a otra compañía`);
    }
    this.byCompany.set(cfg.companyId, structuredClone({ ...cfg, allowedDomains: cfg.allowedDomains.map((d) => d.toLowerCase()) }));
  }
}

/** Estado de un login SSO en curso (server-side, uso único, TTL 10 min). */
export interface SsoPendingLogin {
  companyId: string;
  nonce: string;
  codeVerifier: string;
  createdAtMs: number;
}

/** `state` → login pendiente. Compartido entre réplicas (Redis) y de un solo uso. */
export interface SsoStateStore {
  put(state: string, v: SsoPendingLogin): Promise<void>;
  /** Lee y borra en una sola operación (uso único, también entre réplicas). */
  take(state: string): Promise<SsoPendingLogin | null>;
}

export const SSO_STATE_TTL_MS = 10 * 60_000;

/** `state`/`nonce`/PKCE en el `EphemeralStore` (Redis en producción), con TTL. */
export class EphemeralSsoStateStore implements SsoStateStore {
  constructor(private readonly store: EphemeralStore, private readonly ttlMs = SSO_STATE_TTL_MS) {}

  private key(state: string) {
    return `sso:state:${state}`;
  }
  async put(state: string, v: SsoPendingLogin): Promise<void> {
    await this.store.set(this.key(state), JSON.stringify(v), this.ttlMs);
  }
  async take(state: string): Promise<SsoPendingLogin | null> {
    const raw = await this.store.take(this.key(state));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SsoPendingLogin;
    } catch {
      return null;
    }
  }
}

/** Dev/tests: el mismo store sobre memoria. */
export class InMemorySsoStateStore extends EphemeralSsoStateStore {
  constructor(now?: () => number) {
    super(new MemoryEphemeralStore(now));
  }
}
