import type { DriverDto } from '@g3/contracts';
import { DriverConflictError, type CreateWithinLimitResult, type DriverRepo } from './driver.repo';

export type { DriverRepo, CreateWithinLimitResult } from './driver.repo';

type Row = DriverDto & { userId: string | null };

/** Repo en memoria (dev/tests). Mismas reglas de unicidad que Postgres. */
export class InMemoryDriverRepo implements DriverRepo {
  private readonly byId = new Map<string, Row>();

  private static out(r: Row): DriverDto {
    const { userId: _u, ...d } = r;
    return { ...d };
  }

  private assertUnique(next: Row) {
    for (const o of this.byId.values()) {
      if (o.id === next.id || o.companyId !== next.companyId) continue;
      if (o.phone === next.phone) throw new DriverConflictError('phone');
      if (next.federalLicense && o.federalLicense === next.federalLicense) throw new DriverConflictError('federalLicense');
      if (next.userId && o.userId === next.userId) throw new DriverConflictError('userId');
    }
  }

  async list(companyId: string) {
    return [...this.byId.values()].filter((d) => d.companyId === companyId).map(InMemoryDriverRepo.out);
  }
  async findById(companyId: string, id: string) {
    const d = this.byId.get(id);
    return d && d.companyId === companyId ? InMemoryDriverRepo.out(d) : null;
  }
  async create(d: DriverDto) {
    const row: Row = { ...d, userId: null };
    this.assertUnique(row);
    this.byId.set(d.id, row);
    return { ...d };
  }
  async createWithinLimit(d: DriverDto, limit: number): Promise<CreateWithinLimitResult> {
    // Sin `await` entre el conteo y el alta: atómico dentro del event loop.
    const count = [...this.byId.values()].filter((x) => x.companyId === d.companyId).length;
    if (count >= limit) return { ok: false, count };
    const row: Row = { ...d, userId: null };
    this.assertUnique(row);
    this.byId.set(d.id, row);
    return { ok: true, driver: { ...d } };
  }
  async update(companyId: string, id: string, patch: Partial<DriverDto>) {
    const d = this.byId.get(id);
    if (!d || d.companyId !== companyId) return null;
    const next: Row = { ...d, ...patch, id, companyId, userId: d.userId };
    this.assertUnique(next);
    this.byId.set(id, next);
    return InMemoryDriverRepo.out(next);
  }
  async remove(companyId: string, id: string) {
    const d = await this.findById(companyId, id);
    if (!d) return false;
    this.byId.delete(id);
    return true;
  }
  async countByCompany(companyId: string) {
    return [...this.byId.values()].filter((d) => d.companyId === companyId).length;
  }
  async linkUser(companyId: string, id: string, userId: string | null) {
    const d = this.byId.get(id);
    if (!d || d.companyId !== companyId) return false;
    const next = { ...d, userId };
    this.assertUnique(next);
    this.byId.set(id, next);
    return true;
  }
  async findByUserId(companyId: string, userId: string) {
    for (const d of this.byId.values()) {
      if (d.companyId === companyId && d.userId === userId) return InMemoryDriverRepo.out(d);
    }
    return null;
  }
}
