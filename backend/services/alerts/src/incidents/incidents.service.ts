import { v4 as uuid } from 'uuid';
import {
  DEFAULT_SLA,
  INCIDENT_TYPES,
  INCIDENT_URGENCIES,
  type AlertRuleDto,
  type AlertRuleTrigger,
  type CreateIncidentDto,
  type IncidentCommentDto,
  type IncidentDto,
  type IncidentSource,
  type IncidentStatus,
  type IncidentType,
  type IncidentUrgency,
  type IncidentWithSlaDto,
  type NotificationChannel,
  type OperationalSignalDto,
  type SosDto,
  type TierValue,
} from '@g3/contracts';
import type { AlertRuleRepo, ContactDirectory, IncidentPatch, IncidentRepo, NewIncident, VehicleSignalRepo } from './incidents.repo';
import { InMemoryVehicleSignalRepo } from './in-memory.incidents.repo';
import type { Notifier, NotificationResult, Recipient } from './notifier';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from './errors';
import type { EventBus } from '../event.bus';

export interface RequestCtx {
  companyId: string;
  tier: TierValue;
  userId?: string;
  role?: string;
  driverId?: string;
}

export interface IncidentFilter {
  status?: IncidentStatus;
  urgency?: IncidentUrgency;
  assigneeId?: string;
  breached?: boolean;
  tripId?: string;
}

export interface ManualIncidentInput {
  type: IncidentType;
  urgency: IncidentUrgency;
  description: string;
  tripId?: string | null;
  driverId?: string | null;
  vehicleId?: string | null;
  locationText?: string | null;
}

export type AlertRuleInput = Pick<AlertRuleDto, 'name' | 'enabled' | 'trigger' | 'channels' | 'notifyRoles'>;

export interface IncidentsDeps {
  incidents: IncidentRepo;
  rules: AlertRuleRepo;
  contacts: ContactDirectory;
  /** Última posición por unidad (regla device_offline). Default: memoria (una réplica). */
  signals?: VehicleSignalRepo;
  notifiers: Notifier[];
  bus: EventBus;
  now?: () => Date;
}

const MANAGER_ROLES = ['owner', 'admin', 'dispatcher'];
/** A quién se avisa cuando no hay una regla configurada que diga otra cosa. */
const DEFAULT_ESCALATION_ROLES = ['owner', 'admin', 'dispatcher'];
const URGENCY_RANK: Record<IncidentUrgency, number> = { low: 0, medium: 1, high: 2, critical: 3 };
/** La regla device_offline más corta permitida (validateRule). */
const MIN_OFFLINE_MINUTES = 5;

export const formatFolio = (year: number, seq: number) => `INC-${year}-${String(seq).padStart(5, '0')}`;

export const INCIDENT_TITLE_ES: Record<IncidentType, string> = {
  mechanical: 'Falla mecánica',
  checkpoint: 'Retén / inspección',
  accident: 'Accidente',
  delay_loading: 'Retraso en carga',
  delay_unloading: 'Retraso en descarga',
  client_issue: 'Problema con cliente',
  theft_attempt: 'Robo / extorsión',
  sos: 'SOS del operador',
  speeding: 'Exceso de velocidad',
  device_offline: 'GPS sin señal en viaje activo',
  other: 'Incidente',
};

/** Transiciones del ciclo de atención. `resolved → in_progress` reabre. */
const TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  open: ['acknowledged', 'in_progress', 'resolved'],
  acknowledged: ['in_progress', 'resolved'],
  in_progress: ['resolved'],
  resolved: ['closed', 'in_progress'],
  closed: [],
};

const isManager = (ctx: RequestCtx) => !!ctx.role && MANAGER_ROLES.includes(ctx.role);
const isDriver = (ctx: RequestCtx) => ctx.role === 'driver';

function requireManager(ctx: RequestCtx) {
  if (!isManager(ctx)) throw new ForbiddenError();
}

export class IncidentsService {
  private readonly now: () => Date;
  private readonly signals: VehicleSignalRepo;

  constructor(private readonly deps: IncidentsDeps) {
    this.now = deps.now ?? (() => new Date());
    this.signals = deps.signals ?? new InMemoryVehicleSignalRepo();
  }

  // ── Alta ────────────────────────────────────────────────────────────────

  /** Reporte del chofer desde G3 Drive. Idempotente por clientUuid. */
  async report(ctx: RequestCtx, input: CreateIncidentDto): Promise<IncidentDto> {
    if (!INCIDENT_TYPES.includes(input.type)) throw new ValidationError(`Tipo de incidente inválido: ${input.type}`);
    if (!INCIDENT_URGENCIES.includes(input.urgency)) throw new ValidationError(`Urgencia inválida: ${input.urgency}`);
    if (!input.description?.trim()) throw new ValidationError('La descripción es obligatoria');
    const existing = await this.deps.incidents.findByClientUuid(ctx.companyId, input.clientUuid);
    if (existing) return existing;
    return this.open(ctx, {
      source: isDriver(ctx) ? 'driver_report' : 'manual',
      clientUuid: input.clientUuid,
      type: input.type,
      urgency: input.urgency,
      description: input.description.trim(),
      tripId: input.tripId,
      driverId: isDriver(ctx) ? ctx.driverId ?? input.driverId : input.driverId,
      vehicleId: null,
      occurredAt: input.occurredAt,
      locationText: input.locationText,
      lat: input.lat,
      lng: input.lng,
    });
  }

  /** Botón SOS: siempre crítico y siempre avisa a la torre, haya o no reglas. */
  async sos(ctx: RequestCtx, input: SosDto): Promise<IncidentDto> {
    const existing = await this.deps.incidents.findByClientUuid(ctx.companyId, input.clientUuid);
    if (existing) return existing;
    return this.open(
      ctx,
      {
        source: 'sos',
        clientUuid: input.clientUuid,
        type: 'sos',
        urgency: 'critical',
        description: 'SOS activado por el operador',
        tripId: input.tripId,
        driverId: isDriver(ctx) ? ctx.driverId ?? input.driverId : input.driverId,
        vehicleId: null,
        occurredAt: input.occurredAt,
        locationText: null,
        lat: input.lat,
        lng: input.lng,
      },
      { forceNotify: true },
    );
  }

  /** Captura manual desde la torre de control. */
  async createManual(ctx: RequestCtx, input: ManualIncidentInput): Promise<IncidentDto> {
    requireManager(ctx);
    return this.report(ctx, {
      clientUuid: uuid(),
      tripId: input.tripId ?? null,
      driverId: input.driverId ?? '',
      type: input.type,
      urgency: input.urgency,
      description: input.description,
      occurredAt: this.now().toISOString(),
      locationText: input.locationText ?? null,
      lat: null,
      lng: null,
    }).then(async (i) =>
      input.vehicleId ? (await this.deps.incidents.update(ctx.companyId, i.id, { vehicleId: input.vehicleId })) ?? i : i,
    );
  }

  private async open(
    ctx: RequestCtx,
    data: Pick<
      IncidentDto,
      | 'source' | 'clientUuid' | 'type' | 'urgency' | 'description' | 'tripId' | 'driverId'
      | 'vehicleId' | 'occurredAt' | 'locationText' | 'lat' | 'lng'
    >,
    opts: { forceNotify?: boolean; afterCreate?: (i: IncidentDto) => Promise<unknown> } = {},
  ): Promise<IncidentDto> {
    const now = this.now();
    const sla = DEFAULT_SLA[data.urgency];
    const draft: NewIncident = {
      ...data,
      driverId: data.driverId || null,
      id: uuid(),
      companyId: ctx.companyId,
      status: 'open',
      title: INCIDENT_TITLE_ES[data.type],
      assigneeId: null,
      evidenceIds: [],
      slaAckDueAt: new Date(now.getTime() + sla.ackMinutes * 60_000).toISOString(),
      slaResolveDueAt: new Date(now.getTime() + sla.resolveMinutes * 60_000).toISOString(),
      acknowledgedAt: null,
      resolvedAt: null,
      closedAt: null,
      escalationLevel: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    // El folio lo asigna el repo (contador por compañía/año, atómico). Si otra
    // petición con el mismo clientUuid ganó la carrera, se devuelve esa sin
    // volver a notificar.
    const { incident: saved, created } = await this.deps.incidents.create(draft, formatFolio);
    if (!created) return saved;
    await this.system(saved, `Incidente abierto (${labelSource(saved.source)}) · SLA acuse ${sla.ackMinutes} min`);
    await this.publish(ctx.companyId, 'incident.opened', {
      incidentId: saved.id,
      folio: saved.folio,
      type: saved.type,
      urgency: saved.urgency,
    });

    const matching = (await this.enabledRules(ctx.companyId, 'incident_created')).filter(
      (r) =>
        r.trigger.kind === 'incident_created' &&
        URGENCY_RANK[saved.urgency] >= URGENCY_RANK[r.trigger.minUrgency] &&
        (!r.trigger.types?.length || r.trigger.types.includes(saved.type)),
    );
    if (matching.length) {
      for (const r of matching) await this.notify(saved, r.channels, r.notifyRoles, `Regla "${r.name}"`);
    } else if (opts.forceNotify) {
      await this.notify(saved, ['push', 'whatsapp'], DEFAULT_ESCALATION_ROLES, 'SOS activado');
    }
    await opts.afterCreate?.(saved);
    return saved;
  }

  // ── Consulta ────────────────────────────────────────────────────────────

  async list(ctx: RequestCtx, filter: IncidentFilter = {}): Promise<IncidentWithSlaDto[]> {
    requireManager(ctx);
    const rows = (
      await this.deps.incidents.list(ctx.companyId, {
        status: filter.status,
        urgency: filter.urgency,
        assigneeId: filter.assigneeId,
        tripId: filter.tripId,
      })
    )
      .filter((i) => !filter.status || i.status === filter.status)
      .filter((i) => !filter.urgency || i.urgency === filter.urgency)
      .filter((i) => !filter.assigneeId || i.assigneeId === filter.assigneeId)
      .filter((i) => !filter.tripId || i.tripId === filter.tripId)
      .map((i) => this.withSla(i))
      .filter((i) => filter.breached === undefined || (i.sla.ackBreached || i.sla.resolveBreached) === filter.breached);
    return rows.sort(byPriority);
  }

  /** Incidentes reportados por el chofer autenticado. */
  async mine(ctx: RequestCtx): Promise<IncidentDto[]> {
    if (!ctx.driverId) throw new ForbiddenError('El usuario no está vinculado a un chofer');
    return (await this.deps.incidents.list(ctx.companyId, { driverId: ctx.driverId }))
      .filter((i) => i.driverId === ctx.driverId)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }

  async get(ctx: RequestCtx, id: string): Promise<{ incident: IncidentWithSlaDto; comments: IncidentCommentDto[] }> {
    const i = await this.find(ctx, id);
    return { incident: this.withSla(i), comments: await this.deps.incidents.listComments(i.companyId, i.id) };
  }

  /** Resumen para el tablero: abiertos, críticos, SLA vencidos y sin asignar. */
  async summary(ctx: RequestCtx) {
    const all = await this.list(ctx);
    const open = all.filter((i) => i.status !== 'resolved' && i.status !== 'closed');
    return {
      open: open.length,
      critical: open.filter((i) => i.urgency === 'critical').length,
      breached: open.filter((i) => i.sla.ackBreached || i.sla.resolveBreached).length,
      unassigned: open.filter((i) => !i.assigneeId).length,
    };
  }

  // ── Atención ────────────────────────────────────────────────────────────

  async assign(ctx: RequestCtx, id: string, assigneeId: string | null): Promise<IncidentDto> {
    requireManager(ctx);
    const i = await this.find(ctx, id);
    this.assertOpen(i);
    const updated = await this.patch(i, { assigneeId });
    await this.system(i, assigneeId ? `Asignado a ${assigneeId}` : 'Sin asignar', ctx.userId);
    if (assigneeId) {
      const r = await this.deps.contacts.findByUser(ctx.companyId, assigneeId);
      if (r) await this.sendTo([r], updated, ['push'], 'Se te asignó este incidente');
    }
    return updated;
  }

  async acknowledge(ctx: RequestCtx, id: string) {
    return this.transition(ctx, id, 'acknowledged');
  }

  async start(ctx: RequestCtx, id: string) {
    return this.transition(ctx, id, 'in_progress');
  }

  async resolve(ctx: RequestCtx, id: string, note: string) {
    if (!note?.trim()) throw new ValidationError('Describe cómo se resolvió el incidente');
    const i = await this.transition(ctx, id, 'resolved');
    await this.addComment(ctx, id, `Resolución: ${note.trim()}`);
    return i;
  }

  async close(ctx: RequestCtx, id: string) {
    return this.transition(ctx, id, 'closed');
  }

  async reopen(ctx: RequestCtx, id: string) {
    return this.transition(ctx, id, 'in_progress');
  }

  private async transition(ctx: RequestCtx, id: string, next: IncidentStatus): Promise<IncidentDto> {
    requireManager(ctx);
    const i = await this.find(ctx, id);
    if (!TRANSITIONS[i.status].includes(next)) {
      throw new ConflictError(`Transición inválida: ${i.status} → ${next}`);
    }
    const now = this.now().toISOString();
    const patch: IncidentPatch = { status: next };
    // Cualquier atención cuenta como acuse para el SLA.
    if (!i.acknowledgedAt) patch.acknowledgedAt = now;
    if (next === 'resolved') patch.resolvedAt = now;
    if (next === 'closed') patch.closedAt = now;
    if (next === 'in_progress' && i.status === 'resolved') patch.resolvedAt = null;
    // Control optimista: si otro operador cambió el estado entre la lectura y
    // la escritura, la transición se rechaza en vez de pisarlo.
    const updated = await this.deps.incidents.update(i.companyId, i.id, { ...patch, updatedAt: now }, { ifStatus: i.status });
    if (!updated) throw new ConflictError('El incidente cambió mientras lo atendías; recarga e intenta de nuevo');
    await this.system(i, `Estado: ${i.status} → ${next}`, ctx.userId);
    await this.publish(ctx.companyId, 'incident.status_changed', { incidentId: i.id, from: i.status, to: next });
    return updated;
  }

  async addComment(ctx: RequestCtx, id: string, body: string): Promise<IncidentCommentDto> {
    const i = await this.find(ctx, id);
    if (!body?.trim()) throw new ValidationError('El comentario está vacío');
    return this.deps.incidents.addComment(i.companyId, {
      id: uuid(),
      incidentId: i.id,
      authorId: ctx.userId ?? null,
      kind: 'comment',
      body: body.trim().slice(0, 4000),
      createdAt: this.now().toISOString(),
    });
  }

  /** Liga una evidencia (subida vía /trips/:id/evidences) al incidente. */
  async attachEvidence(ctx: RequestCtx, id: string, evidenceId: string): Promise<IncidentDto> {
    const i = await this.find(ctx, id);
    if (!evidenceId) throw new ValidationError('evidenceId requerido');
    if (i.evidenceIds.includes(evidenceId)) return i;
    const updated = await this.deps.incidents.addEvidence(i.companyId, i.id, evidenceId, this.now().toISOString());
    if (!updated) throw new NotFoundError('Incidente no encontrado');
    await this.system(i, `Evidencia agregada (${evidenceId})`, ctx.userId);
    return updated;
  }

  // ── Escalamiento y reglas ───────────────────────────────────────────────

  /**
   * Barrido periódico (Cloud Scheduler cada minuto): escala los incidentes
   * con SLA vencido —nivel 1 por acuse, nivel 2 por resolución— y abre
   * incidentes `device_offline` según las reglas.
   */
  async runEscalations(): Promise<{ escalated: number; offline: number }> {
    const now = this.now();
    let escalated = 0;
    // Seguro con varias instancias: cada nivel se "reclama" con un
    // compare-and-set en el repo y solo el ganador notifica.
    for (const i of await this.deps.incidents.listEscalationDue(now)) {
      const ackLate = !i.acknowledgedAt && now.getTime() > Date.parse(i.slaAckDueAt);
      const resolveLate = now.getTime() > Date.parse(i.slaResolveDueAt);
      let claimed: IncidentDto | null = null;
      if (ackLate && i.escalationLevel < 1) {
        claimed = await this.deps.incidents.claimEscalation(i.companyId, i.id, 1, 'ack', now);
        if (claimed) await this.escalate(claimed, 1, 'ack', 'Sin acuse dentro del SLA');
      } else if (resolveLate && i.escalationLevel < 2) {
        claimed = await this.deps.incidents.claimEscalation(i.companyId, i.id, 2, 'resolve', now);
        if (claimed) await this.escalate(claimed, 2, 'resolve', 'Sin resolver dentro del SLA');
      }
      if (claimed) escalated++;
    }
    return { escalated, offline: await this.sweepOffline(now) };
  }

  /** `i` ya trae el nivel nuevo (reclamado por este barrido). */
  private async escalate(i: IncidentDto, level: number, stage: 'ack' | 'resolve', reason: string) {
    await this.system(i, `Escalamiento nivel ${level}: ${reason}`);
    const rules = (await this.enabledRules(i.companyId, 'sla_breach')).filter(
      (r) => r.trigger.kind === 'sla_breach' && r.trigger.stage === stage,
    );
    if (rules.length) {
      for (const r of rules) await this.notify(i, r.channels, r.notifyRoles, `${reason} · regla "${r.name}"`);
    } else {
      // Sin regla: push a la torre; WhatsApp solo si es alto/crítico.
      const channels: NotificationChannel[] =
        URGENCY_RANK[i.urgency] >= URGENCY_RANK.high ? ['push', 'whatsapp'] : ['push'];
      await this.notify(i, channels, DEFAULT_ESCALATION_ROLES, reason);
    }
    await this.publish(i.companyId, 'incident.escalated', { incidentId: i.id, level, stage });
  }

  /**
   * Señal operativa (p.ej. desde la ingesta de telemetría vía Pub/Sub):
   * evalúa reglas de velocidad y registra la última posición para la
   * regla de GPS sin señal.
   */
  async ingestSignal(companyId: string, signal: OperationalSignalDto): Promise<IncidentDto | null> {
    await this.signals.record(companyId, signal);
    if (signal.speedKph == null) return null;
    const rule = (await this.enabledRules(companyId, 'speeding'))
      .filter((r) => r.trigger.kind === 'speeding' && signal.speedKph! > r.trigger.thresholdKph)
      .sort((a, b) => thresholdOf(a) - thresholdOf(b))[0];
    if (!rule) return null;
    // Una sola alerta abierta de velocidad por unidad cada 30 min.
    const recent = (await this.deps.incidents.list(companyId, { type: 'speeding', vehicleId: signal.vehicleId, limit: 20 })).find(
      (i) =>
        i.type === 'speeding' &&
        i.vehicleId === signal.vehicleId &&
        i.status !== 'closed' &&
        Date.parse(signal.recordedAt) - Date.parse(i.occurredAt) < 30 * 60_000,
    );
    if (recent) return null;
    const ctx: RequestCtx = { companyId, tier: 'enterprise' };
    // clientUuid determinista por unidad y ventana de 30 min: con varias
    // réplicas recibiendo señales de la misma unidad a la vez, la unicidad
    // (company_id, client_uuid) deja abrir uno solo y solo ese notifica.
    const bucket = Math.floor(Date.parse(signal.recordedAt) / (30 * 60_000));
    let opened = false;
    const incident = await this.open(ctx, {
      source: 'rule',
      clientUuid: `rule:speeding:${signal.vehicleId}:${bucket}`,
      type: 'speeding',
      urgency: 'high',
      description: `${Math.round(signal.speedKph)} km/h (límite de la regla: ${thresholdOf(rule)} km/h)`,
      tripId: signal.tripId,
      driverId: signal.driverId,
      vehicleId: signal.vehicleId,
      occurredAt: signal.recordedAt,
      locationText: null,
      lat: signal.lat,
      lng: signal.lng,
    }, {
      afterCreate: async (created) => {
        opened = true;
        await this.notify(created, rule.channels, rule.notifyRoles, `Regla "${rule.name}"`);
      },
    });
    return opened ? incident : null;
  }

  /**
   * Regla device_offline sobre la última posición compartida
   * (`VehicleSignalRepo`). Cada unidad se "reclama" antes de abrir el
   * incidente: con varias instancias solo una lo abre.
   */
  private async sweepOffline(now: Date): Promise<number> {
    let opened = 0;
    const stale = await this.signals.listStale(new Date(now.getTime() - MIN_OFFLINE_MINUTES * 60_000));
    for (const { companyId, signal } of stale) {
      const rule = (await this.enabledRules(companyId, 'device_offline'))[0];
      if (!rule || rule.trigger.kind !== 'device_offline') {
        // Sin regla no hay nada que vigilar; la próxima señal la vuelve a registrar.
        await this.signals.claim(companyId, signal.vehicleId, signal.recordedAt);
        continue;
      }
      if (now.getTime() - Date.parse(signal.recordedAt) < rule.trigger.minutes * 60_000) continue;
      if (!(await this.signals.claim(companyId, signal.vehicleId, signal.recordedAt))) continue;
      const already = await this.deps.incidents.list(companyId, {
        type: 'device_offline',
        vehicleId: signal.vehicleId,
        openOnly: true,
        limit: 1,
      });
      if (already.length) continue;
      const incident = await this.open({ companyId, tier: 'enterprise' }, {
        source: 'rule',
        clientUuid: null,
        type: 'device_offline',
        urgency: 'high',
        description: `Sin posición desde ${signal.recordedAt} (regla: ${rule.trigger.minutes} min)`,
        tripId: signal.tripId,
        driverId: signal.driverId,
        vehicleId: signal.vehicleId,
        occurredAt: now.toISOString(),
        locationText: null,
        lat: signal.lat,
        lng: signal.lng,
      });
      await this.notify(incident, rule.channels, rule.notifyRoles, `Regla "${rule.name}"`);
      opened++;
    }
    return opened;
  }

  // ── Reglas (CRUD) ───────────────────────────────────────────────────────

  async listRules(ctx: RequestCtx) {
    requireManager(ctx);
    return this.deps.rules.list(ctx.companyId);
  }

  async createRule(ctx: RequestCtx, input: AlertRuleInput): Promise<AlertRuleDto> {
    requireManager(ctx);
    validateRule(input);
    return this.deps.rules.save({
      ...input,
      id: uuid(),
      companyId: ctx.companyId,
      createdAt: this.now().toISOString(),
    });
  }

  async updateRule(ctx: RequestCtx, id: string, patch: Partial<AlertRuleInput>): Promise<AlertRuleDto> {
    requireManager(ctx);
    const cur = await this.deps.rules.findById(ctx.companyId, id);
    if (!cur) throw new NotFoundError('Regla no encontrada');
    const next = { ...cur, ...patch, id: cur.id, companyId: cur.companyId };
    validateRule(next);
    return this.deps.rules.save(next);
  }

  async deleteRule(ctx: RequestCtx, id: string): Promise<void> {
    requireManager(ctx);
    if (!(await this.deps.rules.remove(ctx.companyId, id))) throw new NotFoundError('Regla no encontrada');
  }

  /** Cada usuario registra su token push (Drive / app) y su WhatsApp. */
  async upsertMyContact(ctx: RequestCtx, input: { pushToken?: string | null; whatsapp?: string | null }) {
    if (!ctx.userId || !ctx.role) throw new ForbiddenError('Sesión sin usuario');
    if (input.whatsapp && !/^\+\d{10,15}$/.test(input.whatsapp)) {
      throw new ValidationError('El WhatsApp debe ir en formato E.164, p.ej. +5215512345678');
    }
    return this.deps.contacts.upsert(ctx.companyId, {
      userId: ctx.userId,
      role: ctx.role,
      ...(input.pushToken !== undefined ? { pushToken: input.pushToken } : {}),
      ...(input.whatsapp !== undefined ? { whatsapp: input.whatsapp } : {}),
    });
  }

  // ── Internos ────────────────────────────────────────────────────────────

  /** El chofer solo ve lo que él reportó; la torre ve todo lo de su compañía. */
  private async find(ctx: RequestCtx, id: string): Promise<IncidentDto> {
    const i = await this.deps.incidents.findById(ctx.companyId, id);
    if (!i || (isDriver(ctx) && i.driverId !== ctx.driverId) || (!isDriver(ctx) && !isManager(ctx))) {
      throw new NotFoundError('Incidente no encontrado');
    }
    return i;
  }

  private assertOpen(i: IncidentDto) {
    if (i.status === 'closed') throw new ConflictError('El incidente está cerrado');
  }

  private async patch(i: IncidentDto, patch: IncidentPatch) {
    const updated = await this.deps.incidents.update(i.companyId, i.id, { ...patch, updatedAt: this.now().toISOString() });
    if (!updated) throw new NotFoundError('Incidente no encontrado');
    return updated;
  }

  private withSla(i: IncidentDto): IncidentWithSlaDto {
    const now = this.now().getTime();
    const done = i.status === 'resolved' || i.status === 'closed';
    const ackAt = i.acknowledgedAt ? Date.parse(i.acknowledgedAt) : now;
    const resolveAt = i.resolvedAt ? Date.parse(i.resolvedAt) : now;
    const ackBreached = ackAt > Date.parse(i.slaAckDueAt);
    const resolveBreached = resolveAt > Date.parse(i.slaResolveDueAt);
    const nextDue = done ? null : !i.acknowledgedAt ? i.slaAckDueAt : i.slaResolveDueAt;
    return {
      ...i,
      sla: {
        ackBreached,
        resolveBreached,
        minutesToNextDue: nextDue ? Math.round((Date.parse(nextDue) - now) / 60_000) : null,
      },
    };
  }

  private async enabledRules(companyId: string, kind: AlertRuleTrigger['kind']) {
    return (await this.deps.rules.list(companyId)).filter((r) => r.enabled && r.trigger.kind === kind);
  }

  private async notify(i: IncidentDto, channels: NotificationChannel[], roles: string[], reason: string) {
    const recipients = await this.deps.contacts.findByRoles(i.companyId, roles);
    return this.sendTo(recipients, i, channels, reason);
  }

  private async sendTo(recipients: Recipient[], i: IncidentDto, channels: NotificationChannel[], reason: string) {
    const results: NotificationResult[] = [];
    for (const n of this.deps.notifiers.filter((x) => channels.includes(x.channel))) {
      // Solo quien tiene dado de alta ese canal (token push o WhatsApp).
      const reachable = recipients.filter((r) => (n.channel === 'push' ? !!r.pushToken : !!r.whatsapp));
      for (const to of reachable) {
        results.push(
          await n.send({ channel: n.channel, to, incident: i, reason }).catch((e: unknown) => ({
            channel: n.channel,
            userId: to.userId,
            ok: false,
            error: e instanceof Error ? e.message : String(e),
          })),
        );
      }
    }
    const ok = results.filter((r) => r.ok);
    await this.system(
      i,
      ok.length
        ? `Notificado (${reason}): ${ok.map((r) => `${r.channel}→${r.userId}`).join(', ')}`
        : `Sin destinatarios con ${channels.join('/')} para: ${reason}`,
    );
    return results;
  }

  private async system(i: IncidentDto, body: string, authorId: string | null = null) {
    await this.deps.incidents.addComment(i.companyId, {
      id: uuid(),
      incidentId: i.id,
      authorId,
      kind: 'system',
      body,
      createdAt: this.now().toISOString(),
    });
  }

  private publish(companyId: string, type: string, data: Record<string, unknown>) {
    return this.deps.bus.publish({ type, occurredAt: this.now().toISOString(), companyId, data });
  }
}

function thresholdOf(r: AlertRuleDto) {
  return r.trigger.kind === 'speeding' ? r.trigger.thresholdKph : Infinity;
}

function labelSource(s: IncidentSource) {
  return { driver_report: 'reporte del operador', sos: 'botón SOS', rule: 'regla automática', manual: 'captura manual' }[s];
}

function byPriority(a: IncidentWithSlaDto, b: IncidentWithSlaDto) {
  const doneA = a.status === 'resolved' || a.status === 'closed' ? 1 : 0;
  const doneB = b.status === 'resolved' || b.status === 'closed' ? 1 : 0;
  if (doneA !== doneB) return doneA - doneB;
  const brA = a.sla.ackBreached || a.sla.resolveBreached ? 0 : 1;
  const brB = b.sla.ackBreached || b.sla.resolveBreached ? 0 : 1;
  if (brA !== brB) return brA - brB;
  if (a.urgency !== b.urgency) return URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency];
  return (a.sla.minutesToNextDue ?? Infinity) - (b.sla.minutesToNextDue ?? Infinity);
}

function validateRule(r: AlertRuleInput) {
  if (!r.name?.trim()) throw new ValidationError('La regla necesita nombre');
  if (!r.channels?.length || r.channels.some((c) => c !== 'push' && c !== 'whatsapp')) {
    throw new ValidationError('Canales válidos: push, whatsapp');
  }
  if (!r.notifyRoles?.length) throw new ValidationError('Indica al menos un rol a notificar');
  const t = r.trigger;
  switch (t?.kind) {
    case 'incident_created':
      if (!INCIDENT_URGENCIES.includes(t.minUrgency)) throw new ValidationError('minUrgency inválida');
      return;
    case 'sla_breach':
      if (t.stage !== 'ack' && t.stage !== 'resolve') throw new ValidationError('stage debe ser ack o resolve');
      return;
    case 'speeding':
      if (!(t.thresholdKph > 0 && t.thresholdKph < 200)) throw new ValidationError('Umbral de velocidad inválido');
      return;
    case 'device_offline':
      if (!(t.minutes >= 5 && t.minutes <= 24 * 60)) throw new ValidationError('Minutos sin señal: 5 a 1440');
      return;
    default:
      throw new ValidationError('Disparador de regla inválido');
  }
}
