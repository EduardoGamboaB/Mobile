import type { AlertRuleDto, IncidentCommentDto, IncidentDto, IncidentStatus, OperationalSignalDto } from '@g3/contracts';
import type {
  AlertRuleRepo,
  EscalationStage,
  FolioFormatter,
  IncidentListFilter,
  IncidentPatch,
  IncidentRepo,
  NewIncident,
  TrackedSignal,
  VehicleSignalRepo,
} from './incidents.repo';

const DONE: IncidentStatus[] = ['resolved', 'closed'];

/**
 * Repos en memoria (dev/tests, una sola réplica). Cada método corre sin
 * `await` intermedios, así que es atómico dentro del proceso.
 */
export class InMemoryIncidentRepo implements IncidentRepo {
  private readonly rows = new Map<string, IncidentDto>();
  private readonly comments: Array<IncidentCommentDto & { companyId: string }> = [];
  private readonly counters = new Map<string, number>();

  async create(draft: NewIncident, folioOf: FolioFormatter) {
    if (draft.clientUuid) {
      const existing = this.byClientUuid(draft.companyId, draft.clientUuid);
      if (existing) return { incident: this.clone(existing), created: false };
    }
    const year = new Date(draft.createdAt).getUTCFullYear();
    const key = `${draft.companyId}|${year}`;
    const seq = (this.counters.get(key) ?? 0) + 1;
    this.counters.set(key, seq);
    const i: IncidentDto = { ...draft, folio: folioOf(year, seq) };
    this.rows.set(i.id, this.clone(i));
    return { incident: this.clone(i), created: true };
  }

  async findById(companyId: string, id: string) {
    const r = this.rows.get(id);
    return r && r.companyId === companyId ? this.clone(r) : null;
  }

  async findByClientUuid(companyId: string, clientUuid: string) {
    const r = this.byClientUuid(companyId, clientUuid);
    return r ? this.clone(r) : null;
  }

  async list(companyId: string, f: IncidentListFilter = {}) {
    return [...this.rows.values()]
      .filter((i) => i.companyId === companyId)
      .filter((i) => !f.status || i.status === f.status)
      .filter((i) => !f.urgency || i.urgency === f.urgency)
      .filter((i) => !f.assigneeId || i.assigneeId === f.assigneeId)
      .filter((i) => !f.tripId || i.tripId === f.tripId)
      .filter((i) => !f.driverId || i.driverId === f.driverId)
      .filter((i) => !f.vehicleId || i.vehicleId === f.vehicleId)
      .filter((i) => !f.type || i.type === f.type)
      .filter((i) => !f.openOnly || !DONE.includes(i.status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, f.limit ?? 1000)
      .map((i) => this.clone(i));
  }

  async update(companyId: string, id: string, patch: IncidentPatch, opts: { ifStatus?: IncidentStatus } = {}) {
    const cur = this.rows.get(id);
    if (!cur || cur.companyId !== companyId) return null;
    if (opts.ifStatus && cur.status !== opts.ifStatus) return null;
    const next: IncidentDto = { ...cur, ...definedOnly(patch) };
    this.rows.set(id, next);
    return this.clone(next);
  }

  async addEvidence(companyId: string, id: string, evidenceId: string, updatedAt: string) {
    const cur = this.rows.get(id);
    if (!cur || cur.companyId !== companyId) return null;
    if (!cur.evidenceIds.includes(evidenceId)) {
      this.rows.set(id, { ...cur, evidenceIds: [...cur.evidenceIds, evidenceId], updatedAt });
    }
    return this.clone(this.rows.get(id)!);
  }

  async listEscalationDue(now: Date, limit = 500) {
    const t = now.getTime();
    return [...this.rows.values()]
      .filter((i) => !DONE.includes(i.status) && i.escalationLevel < 2)
      .filter(
        (i) =>
          (!i.acknowledgedAt && i.escalationLevel < 1 && Date.parse(i.slaAckDueAt) < t) ||
          Date.parse(i.slaResolveDueAt) < t,
      )
      .sort((a, b) => a.slaAckDueAt.localeCompare(b.slaAckDueAt))
      .slice(0, limit)
      .map((i) => this.clone(i));
  }

  async claimEscalation(companyId: string, id: string, level: number, stage: EscalationStage, now: Date) {
    const cur = this.rows.get(id);
    if (!cur || cur.companyId !== companyId) return null;
    if (DONE.includes(cur.status) || cur.escalationLevel >= level) return null;
    const t = now.getTime();
    const late = stage === 'ack' ? !cur.acknowledgedAt && Date.parse(cur.slaAckDueAt) < t : Date.parse(cur.slaResolveDueAt) < t;
    if (!late) return null;
    const next = { ...cur, escalationLevel: level, updatedAt: now.toISOString() };
    this.rows.set(id, next);
    return this.clone(next);
  }

  async addComment(companyId: string, c: IncidentCommentDto) {
    this.comments.push({ ...c, companyId });
    return { ...c };
  }

  async listComments(companyId: string, incidentId: string) {
    return this.comments
      .filter((c) => c.companyId === companyId && c.incidentId === incidentId)
      .map(({ companyId: _c, ...c }) => c);
  }

  private byClientUuid(companyId: string, clientUuid: string) {
    return [...this.rows.values()].find((i) => i.companyId === companyId && i.clientUuid === clientUuid) ?? null;
  }

  private clone(i: IncidentDto): IncidentDto {
    return { ...i, evidenceIds: [...i.evidenceIds] };
  }
}

export class InMemoryAlertRuleRepo implements AlertRuleRepo {
  private readonly rows = new Map<string, AlertRuleDto>();

  async list(companyId: string) {
    return [...this.rows.values()]
      .filter((r) => r.companyId === companyId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(cloneRule);
  }

  async findById(companyId: string, id: string) {
    const r = this.rows.get(id);
    return r && r.companyId === companyId ? cloneRule(r) : null;
  }

  async save(r: AlertRuleDto) {
    const cur = this.rows.get(r.id);
    if (cur && cur.companyId !== r.companyId) throw new Error('La regla pertenece a otra compañía');
    this.rows.set(r.id, cloneRule(r));
    return cloneRule(r);
  }

  async remove(companyId: string, id: string) {
    const r = this.rows.get(id);
    if (!r || r.companyId !== companyId) return false;
    return this.rows.delete(id);
  }
}

export class InMemoryVehicleSignalRepo implements VehicleSignalRepo {
  private readonly rows = new Map<string, TrackedSignal>();

  async record(companyId: string, signal: OperationalSignalDto) {
    const key = `${companyId}|${signal.vehicleId}`;
    if (!signal.tripId) {
      this.rows.delete(key);
      return;
    }
    const cur = this.rows.get(key);
    if (cur && Date.parse(cur.signal.recordedAt) >= Date.parse(signal.recordedAt)) return;
    this.rows.set(key, { companyId, signal: { ...signal } });
  }

  async listStale(before: Date, limit = 500) {
    return [...this.rows.values()]
      .filter((r) => Date.parse(r.signal.recordedAt) < before.getTime())
      .sort((a, b) => a.signal.recordedAt.localeCompare(b.signal.recordedAt))
      .slice(0, limit)
      .map((r) => ({ companyId: r.companyId, signal: { ...r.signal } }));
  }

  async claim(companyId: string, vehicleId: string, recordedAt: string) {
    const key = `${companyId}|${vehicleId}`;
    const cur = this.rows.get(key);
    if (!cur || Date.parse(cur.signal.recordedAt) !== Date.parse(recordedAt)) return false;
    return this.rows.delete(key);
  }
}

function cloneRule(r: AlertRuleDto): AlertRuleDto {
  return JSON.parse(JSON.stringify(r)) as AlertRuleDto;
}

function definedOnly<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}
