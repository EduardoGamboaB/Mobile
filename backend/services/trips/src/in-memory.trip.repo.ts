import type { TripDto } from '@g3/contracts';

export class InMemoryTripRepo {
  private readonly byId = new Map<string, TripDto>();

  async list(companyId: string, filter: { status?: TripDto['status']; driverId?: string } = {}) {
    return [...this.byId.values()]
      .filter((t) => t.companyId === companyId)
      .filter((t) => !filter.status || t.status === filter.status)
      .filter((t) => !filter.driverId || t.driverId === filter.driverId)
      .map((t) => ({ ...t }));
  }

  async findById(companyId: string, id: string) {
    const t = this.byId.get(id);
    return t && t.companyId === companyId ? { ...t } : null;
  }

  async create(t: TripDto) {
    this.byId.set(t.id, { ...t });
    return { ...t };
  }

  async update(companyId: string, id: string, patch: Partial<TripDto>) {
    const t = await this.findById(companyId, id);
    if (!t) return null;
    const next = { ...t, ...patch, id, companyId };
    this.byId.set(id, next);
    return { ...next };
  }

  async countInCurrentMonth(companyId: string): Promise<number> {
    const now = new Date();
    const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    return [...this.byId.values()].filter(
      (t) => t.companyId === companyId && (t.scheduledAt ?? t.startedAt ?? new Date().toISOString()).startsWith(ym),
    ).length;
  }

  async countTotalForCompany(companyId: string): Promise<number> {
    return [...this.byId.values()].filter((t) => t.companyId === companyId).length;
  }
}
