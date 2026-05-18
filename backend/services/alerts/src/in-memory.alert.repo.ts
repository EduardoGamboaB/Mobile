import type { AlertDto } from '@g3/contracts';

export class InMemoryAlertRepo {
  private readonly byId = new Map<string, AlertDto>();
  async list(companyId: string, filter: { resolved?: boolean; level?: AlertDto['level'] } = {}) {
    return [...this.byId.values()]
      .filter((a) => a.companyId === companyId)
      .filter((a) => filter.resolved === undefined || a.resolved === filter.resolved)
      .filter((a) => !filter.level || a.level === filter.level)
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
  async update(companyId: string, id: string, patch: Partial<AlertDto>) {
    const a = await this.findById(companyId, id);
    if (!a) return null;
    const next = { ...a, ...patch, id, companyId };
    this.byId.set(id, next);
    return { ...next };
  }
}
