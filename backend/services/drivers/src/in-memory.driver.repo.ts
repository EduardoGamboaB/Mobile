import type { DriverDto } from '@g3/contracts';

export interface DriverRepo {
  list(companyId: string): Promise<DriverDto[]>;
  findById(companyId: string, id: string): Promise<DriverDto | null>;
  create(d: DriverDto): Promise<DriverDto>;
  update(companyId: string, id: string, patch: Partial<DriverDto>): Promise<DriverDto | null>;
  remove(companyId: string, id: string): Promise<boolean>;
  countByCompany(companyId: string): Promise<number>;
}

export class InMemoryDriverRepo implements DriverRepo {
  private readonly byId = new Map<string, DriverDto>();
  async list(companyId: string) {
    return [...this.byId.values()].filter((d) => d.companyId === companyId).map((d) => ({ ...d }));
  }
  async findById(companyId: string, id: string) {
    const d = this.byId.get(id);
    return d && d.companyId === companyId ? { ...d } : null;
  }
  async create(d: DriverDto) {
    this.byId.set(d.id, { ...d });
    return { ...d };
  }
  async update(companyId: string, id: string, patch: Partial<DriverDto>) {
    const d = await this.findById(companyId, id);
    if (!d) return null;
    const next = { ...d, ...patch, id, companyId };
    this.byId.set(id, next);
    return { ...next };
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
}
