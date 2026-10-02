import type { SsoConfigDto } from '@g3/contracts';

export interface SsoConfigRepo {
  findByCompany(companyId: string): Promise<SsoConfigDto | null>;
  findByDomain(domain: string): Promise<SsoConfigDto | null>;
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
    this.byCompany.set(cfg.companyId, structuredClone(cfg));
  }
}

/** Estado de un login SSO en curso (server-side, uso único, TTL 10 min). */
export interface SsoPendingLogin {
  companyId: string;
  nonce: string;
  codeVerifier: string;
  createdAtMs: number;
}

/** En producción: Redis/Memorystore con TTL (compartido entre réplicas). */
export class InMemorySsoStateStore {
  private readonly byState = new Map<string, SsoPendingLogin>();
  put(state: string, v: SsoPendingLogin): void {
    this.byState.set(state, { ...v });
  }
  /** Lee y borra (uso único). */
  take(state: string): SsoPendingLogin | null {
    const v = this.byState.get(state) ?? null;
    this.byState.delete(state);
    return v;
  }
  gc(olderThanMs: number): void {
    for (const [k, v] of this.byState) if (v.createdAtMs < olderThanMs) this.byState.delete(k);
  }
}
