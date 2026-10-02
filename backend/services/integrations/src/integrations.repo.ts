import type {
  IntegrationCategory,
  IntegrationScope,
  IntegrationStatus,
  IntegrationTestDto,
} from '@g3/contracts';

/** Cómo se guarda cada secreto. El valor literal solo existe cifrado. */
export type StoredSecret =
  | { storage: 'encrypted'; ciphertext: string; hint: string | null }
  | { storage: 'secret_manager' | 'env'; ref: string };

export interface IntegrationRecord {
  id: string;
  scope: IntegrationScope;
  /** null en alcance plataforma. */
  companyId: string | null;
  category: IntegrationCategory;
  slot: string;
  provider: string;
  enabled: boolean;
  settings: Record<string, string | boolean>;
  secrets: Record<string, StoredSecret>;
  status: IntegrationStatus;
  lastTest: IntegrationTestDto | null;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
}

export interface IntegrationRepo {
  find(scope: IntegrationScope, companyId: string | null, category: IntegrationCategory, slot: string): Promise<IntegrationRecord | null>;
  save(r: IntegrationRecord): Promise<IntegrationRecord>;
  remove(scope: IntegrationScope, companyId: string | null, category: IntegrationCategory, slot: string): Promise<boolean>;
}

const key = (scope: IntegrationScope, companyId: string | null, category: string, slot: string) =>
  `${scope}|${scope === 'platform' ? '' : companyId ?? ''}|${category}|${slot}`;

const clone = (r: IntegrationRecord): IntegrationRecord => JSON.parse(JSON.stringify(r)) as IntegrationRecord;

/**
 * Una configuración por (alcance, compañía|null, categoría, ranura). Solo
 * dev/tests (una réplica); en producción `PgIntegrationRepo`.
 */
export class InMemoryIntegrationRepo implements IntegrationRepo {
  private readonly rows = new Map<string, IntegrationRecord>();

  async find(scope: IntegrationScope, companyId: string | null, category: IntegrationCategory, slot: string) {
    const r = this.rows.get(key(scope, companyId, category, slot));
    return r ? clone(r) : null;
  }

  /** Alta o reemplazo del destino; conserva `id` y `createdAt` existentes (igual que Postgres). */
  async save(r: IntegrationRecord) {
    const k = key(r.scope, r.companyId, r.category, r.slot);
    const cur = this.rows.get(k);
    const next = clone({ ...r, companyId: r.scope === 'platform' ? null : r.companyId, ...(cur ? { id: cur.id, createdAt: cur.createdAt } : {}) });
    this.rows.set(k, next);
    return clone(next);
  }

  async remove(scope: IntegrationScope, companyId: string | null, category: IntegrationCategory, slot: string) {
    return this.rows.delete(key(scope, companyId, category, slot));
  }
}
