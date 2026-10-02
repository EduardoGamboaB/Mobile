import type { AlertRuleDto, IncidentCommentDto, IncidentDto } from '@g3/contracts';

export class InMemoryIncidentRepo {
  private readonly rows = new Map<string, IncidentDto>();
  private readonly comments: IncidentCommentDto[] = [];

  async create(i: IncidentDto) {
    this.rows.set(i.id, { ...i, evidenceIds: [...i.evidenceIds] });
    return this.clone(i);
  }

  async findById(companyId: string, id: string) {
    const r = this.rows.get(id);
    return r && r.companyId === companyId ? this.clone(r) : null;
  }

  async findByClientUuid(companyId: string, clientUuid: string) {
    const r = [...this.rows.values()].find((i) => i.companyId === companyId && i.clientUuid === clientUuid);
    return r ? this.clone(r) : null;
  }

  async list(companyId: string) {
    return [...this.rows.values()].filter((i) => i.companyId === companyId).map((i) => this.clone(i));
  }

  /** Todos los incidentes abiertos de todas las compañías (barrido de SLA). */
  async listOpenAll() {
    return [...this.rows.values()]
      .filter((i) => i.status !== 'resolved' && i.status !== 'closed')
      .map((i) => this.clone(i));
  }

  async countForCompany(companyId: string) {
    return [...this.rows.values()].filter((i) => i.companyId === companyId).length;
  }

  async update(companyId: string, id: string, patch: Partial<IncidentDto>) {
    const cur = await this.findById(companyId, id);
    if (!cur) return null;
    const next = { ...cur, ...patch, id, companyId };
    this.rows.set(id, next);
    return this.clone(next);
  }

  async addComment(c: IncidentCommentDto) {
    this.comments.push({ ...c });
    return { ...c };
  }

  async listComments(incidentId: string) {
    return this.comments.filter((c) => c.incidentId === incidentId).map((c) => ({ ...c }));
  }

  private clone(i: IncidentDto): IncidentDto {
    return { ...i, evidenceIds: [...i.evidenceIds] };
  }
}

export class InMemoryAlertRuleRepo {
  private readonly rows = new Map<string, AlertRuleDto>();

  async list(companyId: string) {
    return [...this.rows.values()].filter((r) => r.companyId === companyId).map((r) => ({ ...r }));
  }

  async findById(companyId: string, id: string) {
    const r = this.rows.get(id);
    return r && r.companyId === companyId ? { ...r } : null;
  }

  async save(r: AlertRuleDto) {
    this.rows.set(r.id, { ...r });
    return { ...r };
  }

  async remove(companyId: string, id: string) {
    const r = this.rows.get(id);
    if (!r || r.companyId !== companyId) return false;
    return this.rows.delete(id);
  }
}
