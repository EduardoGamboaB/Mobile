import type { AuditAction, AuditEntryDto } from '@g3/contracts';

/** Llave de cadena para eventos sin compañía (p.ej. login de correo inexistente). */
export const GLOBAL_CHAIN = '__global__';

/** prevHash de la primera entrada de una cadena. */
export const GENESIS_HASH = '0'.repeat(64);

export interface AuditHead {
  seq: number;
  hash: string;
}

/** Filtros de la bitácora (ya validados por el servicio). */
export interface AuditFilter {
  action?: AuditAction;
  actorId?: string;
  resourceType?: string;
  fromMs?: number | null;
  toMs?: number | null;
}

/**
 * Repositorio APPEND-ONLY: a propósito no hay update ni delete.
 * En Postgres: trigger que rechaza UPDATE/DELETE/TRUNCATE y `REVOKE` al rol
 * de la app (ver migrations/0001_init.sql); el `head` debería anclarse
 * además fuera de la DB (WORM bucket) para detectar un reescrito total.
 */
export interface AuditRepo {
  /**
   * Anexa atómicamente a la cadena: lee la cabeza, `build` arma la entrada
   * (seq/prevHash/hash) y se guarda, sin que otra escritura concurrente
   * (de este u otro proceso) pueda tomar la misma cabeza.
   */
  appendNext(chainKey: string, build: (head: AuditHead | null) => AuditEntryDto): Promise<AuditEntryDto>;
  head(chainKey: string): Promise<AuditHead | null>;
  /** Toda la cadena en orden de `seq` (para verificar). */
  list(chainKey: string): Promise<AuditEntryDto[]>;
  /** Página de la cadena, de la más nueva a la más vieja. */
  search(chainKey: string, filter: AuditFilter, offset: number, limit: number): Promise<{ items: AuditEntryDto[]; total: number }>;
}

export function matchesFilter(e: AuditEntryDto, f: AuditFilter): boolean {
  if (f.action && e.action !== f.action) return false;
  if (f.actorId && e.actor.userId !== f.actorId) return false;
  if (f.resourceType && e.resource.type !== f.resourceType) return false;
  if (f.fromMs != null && Date.parse(e.timestamp) < f.fromMs) return false;
  if (f.toMs != null && Date.parse(e.timestamp) > f.toMs) return false;
  return true;
}

export class InMemoryAuditRepo implements AuditRepo {
  // `chains` y `heads` son privados de facto; los tests de manipulación los
  // tocan por debajo para simular a alguien con acceso directo a la DB.
  private readonly chains = new Map<string, AuditEntryDto[]>();
  private readonly heads = new Map<string, AuditHead>();

  async appendNext(chainKey: string, build: (head: AuditHead | null) => AuditEntryDto): Promise<AuditEntryDto> {
    // Sin `await` entre leer la cabeza y escribir: atómico dentro del event loop.
    const h = this.heads.get(chainKey);
    const entry = build(h ? { ...h } : null);
    const chain = this.chains.get(chainKey) ?? [];
    chain.push(structuredClone(entry));
    this.chains.set(chainKey, chain);
    this.heads.set(chainKey, { seq: entry.seq, hash: entry.hash });
    return structuredClone(entry);
  }

  async head(chainKey: string): Promise<AuditHead | null> {
    const h = this.heads.get(chainKey);
    return h ? { ...h } : null;
  }

  async list(chainKey: string): Promise<AuditEntryDto[]> {
    return (this.chains.get(chainKey) ?? []).map((e) => structuredClone(e));
  }

  async search(chainKey: string, filter: AuditFilter, offset: number, limit: number) {
    const all = (this.chains.get(chainKey) ?? []).filter((e) => matchesFilter(e, filter)).reverse();
    return { items: all.slice(offset, offset + limit).map((e) => structuredClone(e)), total: all.length };
  }
}
