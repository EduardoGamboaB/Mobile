import type { TripDto, TripStatus } from '@g3/contracts';
import { referenceMs, type TripListFilter, type TripRepo, type TripReportFilter, type TripTransitionPatch } from './repos';

/** Repo en memoria (dev/tests). Gemelo de `PgTripRepo`. */
export class InMemoryTripRepo implements TripRepo {
  private readonly byId = new Map<string, TripDto>();
  private readonly folioCounters = new Map<string, number>();

  async list(companyId: string, filter: TripListFilter = {}) {
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

  async transition(companyId: string, id: string, from: TripStatus, to: TripStatus, patch: TripTransitionPatch) {
    const t = this.byId.get(id);
    if (!t || t.companyId !== companyId || t.status !== from) return null;
    return this.write(t, { ...patch, status: to });
  }

  async releasePayment(companyId: string, id: string, payable: readonly TripStatus[], at: string) {
    const t = this.byId.get(id);
    if (!t || t.companyId !== companyId || t.paymentStatus !== 'pending' || !payable.includes(t.status)) return null;
    return this.write(t, { paymentStatus: 'released', paymentReleasedAt: at, updatedAt: at });
  }

  /** Escritura síncrona tras la verificación: sin `await` en medio, igual que el UPDATE … WHERE de Postgres. */
  private write(t: TripDto, patch: Partial<TripDto>) {
    const next = { ...t, ...patch, id: t.id, companyId: t.companyId };
    this.byId.set(t.id, next);
    return { ...next };
  }

  async nextFolioSeq(companyId: string, year: number) {
    const k = `${companyId}|${year}`;
    const n = (this.folioCounters.get(k) ?? 0) + 1;
    this.folioCounters.set(k, n);
    return n;
  }

  async countInCurrentMonth(companyId: string): Promise<number> {
    const now = new Date();
    const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
    const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
    return [...this.byId.values()].filter((t) => {
      if (t.companyId !== companyId) return false;
      const at = t.scheduledAt ?? t.startedAt;
      const ms = at ? Date.parse(at) : now.getTime();
      return ms >= start && ms < end;
    }).length;
  }

  async countTotalForCompany(companyId: string): Promise<number> {
    return [...this.byId.values()].filter((t) => t.companyId === companyId).length;
  }

  async listByVehicle(companyId: string, vehicleId: string, statuses: readonly TripStatus[]) {
    return [...this.byId.values()]
      .filter((t) => t.companyId === companyId && statuses.includes(t.status))
      .filter((t) => t.tractorId === vehicleId || t.trailerId === vehicleId)
      .map((t) => ({ ...t }));
  }

  async listForReport(companyId: string, f: TripReportFilter) {
    return [...this.byId.values()]
      .filter((t) => t.companyId === companyId)
      .filter((t) => (f.statuses ? f.statuses.includes(t.status) : t.status !== 'draft' && t.status !== 'cancelled'))
      .filter((t) => !f.driverId || t.driverId === f.driverId)
      .filter((t) => !f.tractorId || t.tractorId === f.tractorId)
      .filter((t) => {
        const at = referenceMs(t);
        return (f.fromMs == null || at >= f.fromMs) && (f.toMs == null || at <= f.toMs);
      })
      .sort((a, b) => referenceMs(b) - referenceMs(a) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map((t) => ({ ...t }));
  }
}
