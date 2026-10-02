import type { TractorDto, TrailerDto, LivePosition } from '@g3/contracts';

export * from './telemetry/in-memory.telemetry.repos';

export class InMemoryTractorRepo {
  private readonly byId = new Map<string, TractorDto>();
  async list(companyId: string) {
    return [...this.byId.values()].filter((t) => t.companyId === companyId).map((t) => ({ ...t }));
  }
  async findById(companyId: string, id: string) {
    const t = this.byId.get(id);
    return t && t.companyId === companyId ? { ...t } : null;
  }
  async create(t: TractorDto) {
    this.byId.set(t.id, { ...t });
    return { ...t };
  }
  async update(companyId: string, id: string, patch: Partial<TractorDto>) {
    const t = await this.findById(companyId, id);
    if (!t) return null;
    const next = { ...t, ...patch, id, companyId };
    this.byId.set(id, next);
    return { ...next };
  }
  async remove(companyId: string, id: string) {
    const t = await this.findById(companyId, id);
    if (!t) return false;
    this.byId.delete(id);
    return true;
  }
  async countByCompany(companyId: string) {
    return [...this.byId.values()].filter((t) => t.companyId === companyId).length;
  }
  async livePositions(companyId: string): Promise<LivePosition[]> {
    return [...this.byId.values()]
      .filter((t) => t.companyId === companyId && t.lastLat !== null && t.lastLng !== null)
      .map((t) => ({
        tractorId: t.id,
        unitNumber: t.unitNumber,
        lat: t.lastLat as number,
        lng: t.lastLng as number,
        speedKph: null,
        headingDeg: null,
        lastSeenAt: t.lastSeenAt as string,
      }));
  }
}

export class InMemoryTrailerRepo {
  private readonly byId = new Map<string, TrailerDto>();
  async list(companyId: string) {
    return [...this.byId.values()].filter((t) => t.companyId === companyId).map((t) => ({ ...t }));
  }
  async findById(companyId: string, id: string) {
    const t = this.byId.get(id);
    return t && t.companyId === companyId ? { ...t } : null;
  }
  async create(t: TrailerDto) {
    this.byId.set(t.id, { ...t });
    return { ...t };
  }
  async update(companyId: string, id: string, patch: Partial<TrailerDto>) {
    const t = await this.findById(companyId, id);
    if (!t) return null;
    const next = { ...t, ...patch, id, companyId };
    this.byId.set(id, next);
    return { ...next };
  }
  async remove(companyId: string, id: string) {
    const t = await this.findById(companyId, id);
    if (!t) return false;
    this.byId.delete(id);
    return true;
  }
  async countByCompany(companyId: string) {
    return [...this.byId.values()].filter((t) => t.companyId === companyId).length;
  }
}
