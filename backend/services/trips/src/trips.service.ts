import { v4 as uuid } from 'uuid';
import {
  ACTIVE_TRIP_STATUSES,
  FINAL_TRIP_STATUSES,
  Feature,
  PAYABLE_TRIP_STATUSES,
  TIER_LIMITS,
  TierLimitExceededError,
  UpgradeRequiredError,
  canTransition,
  isTripStatus,
  tierHas,
  type AuditActorDto,
  type CreateEvidenceDto,
  type CreateLogbookEntryDto,
  type EvidenceDto,
  type ExpensePolicyDto,
  type LogbookEntryDto,
  type ProfitabilityQueryDto,
  type ProfitabilityReportDto,
  type TierValue,
  type TripDto,
  type TripStatus,
  type TripProfitabilityDto,
  type UploadUrlDto,
} from '@g3/contracts';
import { computeTripProfitability, summarizeProfitability } from './profitability';
import type { EvidenceStorage } from './in-memory.ops.repo';
import { formatFolio, type TripTransitionPatch, type EvidenceRepo, type ExpensePolicyRepo, type LogbookRepo, type TripRepo } from './repos';
import type { EventBus } from './event.bus';
import { NoopAuditSink, type AuditSink } from './audit.sink';

export interface RequestCtx {
  companyId: string;
  tier: TierValue;
  userId?: string;
  role?: string;
  /** Presente cuando el usuario es un chofer (claim `driverId` del JWT). */
  driverId?: string;
  /** IP real del cliente (`x-client-ip` que fija el gateway) y user-agent, para auditoría. */
  ip?: string;
  userAgent?: string;
}

export interface CreateTripInput {
  origin: string;
  destination: string;
  scheduledAt?: string;
  estimatedUnloadAt?: string;
  clientName?: string;
  cargo?: string;
  driverId?: string;
  tractorId?: string;
  trailerId?: string;
  tons?: number;
  pricePerTon?: number;
  freightAmount?: number;
  driverCommission?: number;
  estimatedTolls?: number;
  estimatedDiesel?: number;
  notes?: string;
}

export type ExpensePolicyInput = Pick<ExpensePolicyDto, 'allowManualExpense' | 'manualMaxAmount' | 'requireReceipt'>;

export interface TripsServiceDeps {
  /** Bitácora de auditoría encadenada (auth). Por defecto no registra nada. */
  audit?: AuditSink;
  log?: (msg: string) => void;
}

/** Orden de preferencia cuando un vehículo tiene varios viajes activos. */
const ACTIVE_RANK: Partial<Record<TripStatus, number>> = {
  loading: 0,
  in_transit: 0,
  unloading: 0,
  pre_closed: 1,
  scheduled: 2,
};

type ExpenseRule = Pick<ExpensePolicyDto, 'allowManualExpense' | 'manualMaxAmount' | 'requireReceipt'>;
const RULE_FIELDS = ['allowManualExpense', 'manualMaxAmount', 'requireReceipt'] as const;
const ruleOf = (p: ExpenseRule): ExpenseRule => ({
  allowManualExpense: p.allowManualExpense,
  manualMaxAmount: p.manualMaxAmount,
  requireReceipt: p.requireReceipt,
});

export interface OpsRepos {
  logbook: LogbookRepo;
  evidences: EvidenceRepo;
  policies: ExpensePolicyRepo;
  storage: EvidenceStorage;
}

/** Roles con mando sobre la operación (crear, cancelar, pagar, configurar). */
const MANAGER_ROLES = ['owner', 'admin', 'dispatcher'];

const isDriver = (ctx: RequestCtx) => ctx.role === 'driver';

function requireManager(ctx: RequestCtx) {
  if (isDriver(ctx) || (ctx.role && !MANAGER_ROLES.includes(ctx.role))) {
    throw new Error('Sin permiso para esta operación');
  }
}

/** Estampa de tiempo que deja cada transición. */
const STAMP: Partial<Record<TripStatus, 'startedAt' | 'preClosedAt' | 'closedAt' | 'cancelledAt'>> = {
  loading: 'startedAt',
  pre_closed: 'preClosedAt',
  closed: 'closedAt',
  cancelled: 'cancelledAt',
};

export class TripsService {
  constructor(
    private readonly repo: TripRepo,
    private readonly bus: EventBus,
    private readonly ops: OpsRepos,
    deps: TripsServiceDeps = {},
  ) {
    this.audit = deps.audit ?? new NoopAuditSink();
    // eslint-disable-next-line no-console
    this.log = deps.log ?? ((m) => console.error(m));
  }

  private readonly audit: AuditSink;
  private readonly log: (msg: string) => void;

  list(ctx: RequestCtx, filter: { status?: TripStatus; driverId?: string } = {}) {
    if (isDriver(ctx)) return this.repo.list(ctx.companyId, { ...filter, driverId: ctx.driverId ?? '__none__' });
    return this.repo.list(ctx.companyId, filter);
  }

  /** Viajes del chofer autenticado: `active` (incluye precierre) o `history`. */
  async listMine(ctx: RequestCtx, scope: 'active' | 'history'): Promise<TripDto[]> {
    if (!ctx.driverId) throw new Error('El usuario no está vinculado a un chofer');
    const statuses = scope === 'active' ? ACTIVE_TRIP_STATUSES : FINAL_TRIP_STATUSES;
    const all = await this.repo.list(ctx.companyId, { driverId: ctx.driverId });
    return all
      .filter((t) => statuses.includes(t.status))
      .sort((a, b) =>
        scope === 'active'
          ? (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? '')
          : b.updatedAt.localeCompare(a.updatedAt),
      );
  }

  /** Un chofer solo "ve" los viajes que tiene asignados; para él, los ajenos no existen. */
  async get(ctx: RequestCtx, id: string): Promise<TripDto> {
    const t = await this.repo.findById(ctx.companyId, id);
    if (!t || (isDriver(ctx) && t.driverId !== ctx.driverId)) throw new Error('Viaje no encontrado');
    return t;
  }

  async create(ctx: RequestCtx, input: CreateTripInput): Promise<TripDto> {
    requireManager(ctx);
    const usedThisMonth = await this.repo.countInCurrentMonth(ctx.companyId);
    const monthlyLimit = TIER_LIMITS[ctx.tier].tripsPerMonth;
    if (usedThisMonth >= monthlyLimit) {
      throw new TierLimitExceededError({
        limit: 'tripsPerMonth',
        tier: ctx.tier,
        limitValue: monthlyLimit,
        currentValue: usedThisMonth + 1,
      });
    }

    const scheduledAt = optionalDate(input.scheduledAt, 'scheduledAt');
    const estimatedUnloadAt = optionalDate(input.estimatedUnloadAt, 'estimatedUnloadAt');
    const nowDate = new Date();
    const now = nowDate.toISOString();
    // Consecutivo atómico por compañía y año (en Postgres: UPDATE … RETURNING sobre
    // trip_folio_counters). Si el alta falla después, el número queda sin usar: los
    // folios pueden tener huecos, nunca repetirse.
    const year = nowDate.getUTCFullYear();
    const seq = await this.repo.nextFolioSeq(ctx.companyId, year);
    const trip: TripDto = {
      id: uuid(),
      companyId: ctx.companyId,
      folio: formatFolio(year, seq),
      status: 'scheduled',
      driverId: input.driverId ?? null,
      tractorId: input.tractorId ?? null,
      trailerId: input.trailerId ?? null,
      clientName: input.clientName ?? null,
      cargo: input.cargo ?? null,
      origin: input.origin,
      destination: input.destination,
      scheduledAt,
      estimatedUnloadAt,
      tons: input.tons ?? null,
      pricePerTon: input.pricePerTon ?? null,
      freightAmount: input.freightAmount ?? null,
      driverCommission: input.driverCommission ?? null,
      estimatedTolls: input.estimatedTolls ?? null,
      estimatedDiesel: input.estimatedDiesel ?? null,
      notes: input.notes ?? null,
      startedAt: null,
      preClosedAt: null,
      closedAt: null,
      cancelledAt: null,
      paymentStatus: 'pending',
      paymentReleasedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const saved = await this.repo.create(trip);
    await this.publish(ctx, 'trip.created', { tripId: saved.id, folio: saved.folio });
    return saved;
  }

  async setStatus(ctx: RequestCtx, id: string, next: TripStatus): Promise<TripDto> {
    if (!isTripStatus(next)) throw new Error(`Estado de viaje desconocido: ${String(next)}`);
    if (next === 'cancelled') requireManager(ctx);
    const trip = await this.get(ctx, id);
    if (!canTransition(trip.status, next)) {
      throw new Error(`Transición inválida: ${trip.status} → ${next}`);
    }
    const now = new Date().toISOString();
    const patch: TripTransitionPatch = { updatedAt: now };
    const stamp = STAMP[next];
    if (stamp) patch[stamp] = now;

    // Compare-and-set: solo avanza si el estado sigue siendo el que validamos. Si
    // otro request lo movió entre la lectura y la escritura, es una transición inválida.
    const updated = await this.repo.transition(ctx.companyId, id, trip.status, next, patch);
    if (!updated) {
      const current = await this.repo.findById(ctx.companyId, id);
      if (!current) throw new Error('Viaje no encontrado');
      throw new Error(`Transición inválida: ${current.status} → ${next}`);
    }
    await this.publish(ctx, 'trip.status_changed', { tripId: id, fromStatus: trip.status, toStatus: next });
    return updated;
  }

  /** El pago es independiente del estado: se libera desde el precierre sin esperar el retorno. */
  async releasePayment(ctx: RequestCtx, id: string): Promise<TripDto> {
    requireManager(ctx);
    if (!tierHas(ctx.tier, Feature.PaymentAuthorization)) {
      throw new UpgradeRequiredError({
        currentTier: ctx.tier,
        missingFeatures: [Feature.PaymentAuthorization],
      });
    }
    const trip = await this.get(ctx, id);
    if (!PAYABLE_TRIP_STATUSES.includes(trip.status)) {
      throw new Error('El viaje debe estar entregado (precierre o cierre) antes de liberar el pago');
    }
    if (trip.paymentStatus === 'released') throw new Error('El pago de este viaje ya fue liberado');
    const now = new Date().toISOString();
    // Condicional en la base: dos liberaciones simultáneas no pagan dos veces.
    const updated = await this.repo.releasePayment(ctx.companyId, id, PAYABLE_TRIP_STATUSES, now);
    if (!updated) throw new Error('El pago de este viaje ya fue liberado');
    await this.publish(ctx, 'trip.payment_released', { tripId: id, amount: trip.freightAmount });
    return updated;
  }

  /**
   * Interno (fleet → alerts): viaje activo cuyo tracto o remolque es el
   * vehículo. Si hay varios, el que está en movimiento; luego el más reciente.
   */
  async activeTripByVehicle(companyId: string, vehicleId: string): Promise<TripDto | null> {
    const rank = (t: TripDto) => ACTIVE_RANK[t.status] ?? 9;
    const candidates = (await this.repo.listByVehicle(companyId, vehicleId, ACTIVE_TRIP_STATUSES)).sort((a, b) => rank(a) - rank(b) || b.updatedAt.localeCompare(a.updatedAt));
    return candidates[0] ?? null;
  }

  // ── Bitácora ────────────────────────────────────────────────────────────

  async listLogbook(ctx: RequestCtx, tripId: string): Promise<LogbookEntryDto[]> {
    await this.get(ctx, tripId);
    return this.ops.logbook.listByTrip(ctx.companyId, tripId);
  }

  /**
   * Alta idempotente por `clientUuid` (la cola offline de Drive reintenta).
   * La política de gastos se valida aquí: la app la muestra, el servidor la hace cumplir.
   */
  async addLogbookEntry(ctx: RequestCtx, tripId: string, input: CreateLogbookEntryDto): Promise<LogbookEntryDto> {
    const trip = await this.get(ctx, tripId);
    const existing = await this.ops.logbook.findByClientUuid(ctx.companyId, input.clientUuid);
    if (existing) return existing;

    if (input.expenseAmount != null) {
      if (input.expenseAmount < 0) throw new Error('El monto del gasto no puede ser negativo');
      const reason = validateExpense(await this.getExpensePolicy(ctx), input.expenseAmount, input.expenseHasReceipt);
      if (reason) throw new Error(reason);
    }

    const row: LogbookEntryDto = {
      ...input,
      id: uuid(),
      companyId: ctx.companyId,
      tripId: trip.id,
      driverId: isDriver(ctx) ? ctx.driverId! : input.driverId,
      createdAt: new Date().toISOString(),
    };
    const saved = await this.ops.logbook.create(row);
    // Reintento concurrente de la cola offline: otro request guardó el mismo clientUuid primero.
    if (saved.id !== row.id) return saved;
    await this.publish(ctx, 'trip.logbook_entry_added', {
      tripId: trip.id,
      entryId: saved.id,
      eventType: saved.eventType,
      expenseAmount: saved.expenseAmount,
    });
    return saved;
  }

  // ── Rentabilidad (US-25) ────────────────────────────────────────────────

  /**
   * Pantalla del dueño: solo owner/admin/dispatcher. Se habilita con
   * `EarningsDashboard` (Starter+), la feature de reportes de ingreso que ya
   * existe en el catálogo; los reportes avanzados (Business) son otra cosa.
   */
  private requireProfitabilityAccess(ctx: RequestCtx) {
    requireManager(ctx);
    if (!tierHas(ctx.tier, Feature.EarningsDashboard)) {
      throw new UpgradeRequiredError({ currentTier: ctx.tier, missingFeatures: [Feature.EarningsDashboard] });
    }
  }

  async tripProfitability(ctx: RequestCtx, tripId: string): Promise<TripProfitabilityDto> {
    this.requireProfitabilityAccess(ctx);
    const trip = await this.get(ctx, tripId);
    return computeTripProfitability(trip, await this.ops.logbook.listByTrip(ctx.companyId, trip.id));
  }

  async profitabilityReport(ctx: RequestCtx, query: ProfitabilityQueryDto): Promise<ProfitabilityReportDto> {
    this.requireProfitabilityAccess(ctx);
    const from = query.from ? parseBound(query.from, 'from') : null;
    const to = query.to ? parseBound(query.to, 'to') : null;
    const statuses = query.status
      ? query.status.split(',').map((s) => s.trim()).filter(Boolean)
      : null;
    for (const s of statuses ?? []) {
      if (!isTripStatus(s)) throw new Error(`Estado de viaje desconocido: ${s}`);
    }

    const trips = await this.repo.listForReport(ctx.companyId, {
      statuses: statuses as TripStatus[] | null,
      driverId: query.driverId || undefined,
      tractorId: query.tractorId || undefined,
      fromMs: from,
      toMs: to,
    });

    const logbook = await this.ops.logbook.listByTrips(ctx.companyId, trips.map((t) => t.id));
    const rows = trips.map((t) => computeTripProfitability(t, logbook));
    const filters: ProfitabilityQueryDto = {};
    for (const k of ['from', 'to', 'driverId', 'tractorId', 'status'] as const) {
      if (query[k]) filters[k] = query[k];
    }
    return { filters, totals: summarizeProfitability(rows), rows, generatedAt: new Date().toISOString() };
  }

  // ── Política de gastos ──────────────────────────────────────────────────

  async getExpensePolicy(ctx: RequestCtx): Promise<ExpensePolicyDto> {
    return (
      (await this.ops.policies.get(ctx.companyId)) ?? {
        companyId: ctx.companyId,
        allowManualExpense: true,
        manualMaxAmount: null,
        requireReceipt: false,
        updatedAt: new Date(0).toISOString(),
      }
    );
  }

  async putExpensePolicy(ctx: RequestCtx, input: ExpensePolicyInput): Promise<ExpensePolicyDto> {
    requireManager(ctx);
    if (input.manualMaxAmount != null && (!Number.isFinite(input.manualMaxAmount) || input.manualMaxAmount < 0)) {
      throw new Error('El tope de gasto manual debe ser un número ≥ 0');
    }
    const before = ruleOf(await this.getExpensePolicy(ctx));
    const saved = await this.ops.policies.put({
      companyId: ctx.companyId,
      allowManualExpense: Boolean(input.allowManualExpense),
      manualMaxAmount: input.manualMaxAmount ?? null,
      requireReceipt: Boolean(input.requireReceipt),
      updatedAt: new Date().toISOString(),
    });
    await this.auditPolicyChange(ctx, before, ruleOf(saved));
    return saved;
  }

  /**
   * Registra `expense_policy.updated` en la bitácora de auth. Decisión: la
   * auditoría es best-effort respecto a la regla. Si auth no responde, la
   * política ya quedó guardada (el dueño no debe quedarse sin poder cambiar
   * la regla de su operación por una caída de otro servicio) y el fallo va al
   * log de errores para alertar y reconciliar. En prod: outbox/Pub/Sub con
   * reintentos para no perder el evento.
   */
  private async auditPolicyChange(ctx: RequestCtx, before: ExpenseRule, after: ExpenseRule) {
    try {
      await this.audit.record({
        companyId: ctx.companyId,
        actor: {
          type: 'user',
          userId: ctx.userId ?? null,
          role: (ctx.role ?? null) as AuditActorDto['role'],
        },
        action: 'expense_policy.updated',
        resource: { type: 'expense_policy', id: ctx.companyId },
        ip: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,
        metadata: { before, after, changed: RULE_FIELDS.filter((k) => before[k] !== after[k]) },
      });
    } catch (e) {
      this.log(
        `[trips-service] auditoría de expense_policy.updated falló (company ${ctx.companyId}); la política se guardó: ${(e as Error).message}`,
      );
    }
  }

  // ── Evidencias ──────────────────────────────────────────────────────────

  private evidencePrefix(ctx: RequestCtx, tripId: string) {
    return `${ctx.companyId}/${tripId}/`;
  }

  async evidenceUploadUrl(
    ctx: RequestCtx,
    tripId: string,
    input: { clientUuid: string; mimeType: string },
  ): Promise<UploadUrlDto> {
    await this.get(ctx, tripId);
    const ext = input.mimeType === 'image/png' ? 'png' : input.mimeType === 'application/pdf' ? 'pdf' : 'jpg';
    const safeId = input.clientUuid.replace(/[^a-zA-Z0-9_-]/g, '');
    return this.ops.storage.signUpload(`${this.evidencePrefix(ctx, tripId)}${safeId}.${ext}`, input.mimeType);
  }

  async registerEvidence(ctx: RequestCtx, tripId: string, input: CreateEvidenceDto): Promise<EvidenceDto> {
    await this.get(ctx, tripId);
    if (!input.storagePath.startsWith(this.evidencePrefix(ctx, tripId)) || input.storagePath.includes('..')) {
      throw new Error('La ruta del archivo no corresponde a este viaje');
    }
    const existing = await this.ops.evidences.findByClientUuid(ctx.companyId, input.clientUuid);
    if (existing) return existing;
    return this.ops.evidences.create({
      ...input,
      id: uuid(),
      companyId: ctx.companyId,
      tripId,
      driverId: isDriver(ctx) ? ctx.driverId! : input.driverId,
      createdAt: new Date().toISOString(),
    });
  }

  async listEvidences(ctx: RequestCtx, tripId: string): Promise<EvidenceDto[]> {
    await this.get(ctx, tripId);
    return this.ops.evidences.listByTrip(ctx.companyId, tripId);
  }

  private publish(ctx: RequestCtx, type: string, data: Record<string, unknown>) {
    return this.bus.publish({ type, occurredAt: new Date().toISOString(), companyId: ctx.companyId, data });
  }
}

/** Fecha opcional del alta normalizada a ISO UTC (igual en memoria y en Postgres). */
function optionalDate(v: string | undefined | null, field: string): string | null {
  if (v == null || v === '') return null;
  const ms = Date.parse(v);
  if (Number.isNaN(ms)) throw new Error(`Fecha inválida en ${field}: ${v}`);
  return new Date(ms).toISOString();
}

/** Fecha ISO o YYYY-MM-DD; un `to` de solo fecha cubre el día completo (UTC). */
function parseBound(v: string, kind: 'from' | 'to'): number {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(v);
  const ms = Date.parse(dateOnly ? `${v}T00:00:00.000Z` : v);
  if (Number.isNaN(ms)) throw new Error(`Fecha inválida en ${kind}: ${v}`);
  return dateOnly && kind === 'to' ? ms + 86_400_000 - 1 : ms;
}

/** Misma regla que `mobile/src/domain/expensePolicy.ts`, en camelCase. */
export function validateExpense(policy: ExpensePolicyDto, amount: number, hasReceipt: boolean): string | null {
  if (hasReceipt) return null;
  if (policy.requireReceipt) return 'Tu administrador requiere foto del ticket para todos los gastos.';
  if (!policy.allowManualExpense) {
    return 'Tu administrador no permite gastos sin comprobante. Toma foto del ticket.';
  }
  if (policy.manualMaxAmount != null && amount > policy.manualMaxAmount) {
    return `Los gastos sin ticket tienen tope de $${policy.manualMaxAmount.toFixed(2)}. Toma foto del ticket para montos mayores.`;
  }
  return null;
}
