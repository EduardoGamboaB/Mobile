import type { AlertDto } from '@g3/contracts';

export interface AlertFilter {
  resolved?: boolean;
  level?: AlertDto['level'];
}

/** Alertas simples por compañía. Gemelos: `InMemoryAlertRepo` y `PgAlertRepo`. */
export interface AlertRepo {
  list(companyId: string, filter?: AlertFilter): Promise<AlertDto[]>;
  findById(companyId: string, id: string): Promise<AlertDto | null>;
  create(a: AlertDto): Promise<AlertDto>;
  /** Solo `resolved` es mutable. `null` si no existe en esa compañía. */
  update(companyId: string, id: string, patch: Pick<Partial<AlertDto>, 'resolved'>): Promise<AlertDto | null>;
}

export class InMemoryAlertRepo implements AlertRepo {
  private readonly byId = new Map<string, AlertDto>();
  async list(companyId: string, filter: AlertFilter = {}) {
    return [...this.byId.values()]
      .filter((a) => a.companyId === companyId)
      .filter((a) => filter.resolved === undefined || a.resolved === filter.resolved)
      .filter((a) => !filter.level || a.level === filter.level)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((a) => ({ ...a }));
  }
  async findById(companyId: string, id: string) {
    const a = this.byId.get(id);
    return a && a.companyId === companyId ? { ...a } : null;
  }
  async create(a: AlertDto) {
    this.byId.set(a.id, { ...a });
    return { ...a };
  }
  async update(companyId: string, id: string, patch: Pick<Partial<AlertDto>, 'resolved'>) {
    const a = await this.findById(companyId, id);
    if (!a) return null;
    const next = { ...a, ...(patch.resolved !== undefined ? { resolved: patch.resolved } : {}) };
    this.byId.set(id, next);
    return { ...next };
  }
}
