import type { AuditEntryDto } from '@g3/contracts';

/** Llave de cadena para eventos sin compañía (p.ej. login de correo inexistente). */
export const GLOBAL_CHAIN = '__global__';

export interface AuditHead {
  seq: number;
  hash: string;
}

/**
 * Repositorio APPEND-ONLY: a propósito no hay update ni delete.
 * En producción: tabla con `REVOKE UPDATE, DELETE` para el rol de la app
 * (o BigQuery/Cloud Logging bucket con retención bloqueada) y el `head`
 * anclado fuera de la DB (WORM bucket) para detectar truncado.
 */
export interface AuditRepo {
  append(chainKey: string, entry: AuditEntryDto): Promise<void>;
  head(chainKey: string): Promise<AuditHead | null>;
  list(chainKey: string): Promise<AuditEntryDto[]>;
}

export class InMemoryAuditRepo implements AuditRepo {
  // `chains` y `heads` son privados de facto; los tests de manipulación los
  // tocan por debajo para simular a alguien con acceso directo a la DB.
  private readonly chains = new Map<string, AuditEntryDto[]>();
  private readonly heads = new Map<string, AuditHead>();

  async append(chainKey: string, entry: AuditEntryDto): Promise<void> {
    const chain = this.chains.get(chainKey) ?? [];
    chain.push(structuredClone(entry));
    this.chains.set(chainKey, chain);
    this.heads.set(chainKey, { seq: entry.seq, hash: entry.hash });
  }

  async head(chainKey: string): Promise<AuditHead | null> {
    const h = this.heads.get(chainKey);
    return h ? { ...h } : null;
  }

  async list(chainKey: string): Promise<AuditEntryDto[]> {
    return (this.chains.get(chainKey) ?? []).map((e) => structuredClone(e));
  }
}
