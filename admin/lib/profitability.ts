/**
 * Rentabilidad por viaje (US-25) en G3 Admin.
 *
 * En vivo la calcula el backend (`GET /trips/profitability`,
 * `GET /trips/:id/profitability`). En modo demo se calcula aquí con las
 * MISMAS reglas que `backend/services/trips/src/profitability.ts`, sobre
 * `demoData` (flete, comisión, estimados y bitácora con gastos):
 *
 *   utilidad = ingreso − casetas − diesel − otros gastos − comisión
 *
 * - Ingreso = flete; si falta, toneladas × precio; si tampoco: se marca.
 * - Desviación: gasto real > estimado + 15%.
 * - Recuperable: gasto de bitácora sin foto de ticket.
 * - Datos incompletos se marcan; la utilidad queda en null (no se inventa).
 */
import { isTripStatus } from './contracts/tripStatus';
import type {
  ExpenseComparisonDTO,
  LogbookEvent,
  ProfitabilityDataIssue,
  ProfitabilityExpenseKind,
  ProfitabilityMarginBand,
  ProfitabilityQuery,
  ProfitabilityReportDTO,
  ProfitabilityTotalsDTO,
  TripDTO,
  TripProfitabilityDTO,
} from './api/types';
import { isLive } from './api/config';
import { profitabilityApi } from './api/modules';
import { logbook as demoLogbook, trips as demoTrips, type Trip as DemoTrip } from './demoData';

export const PROFITABILITY_DEVIATION_PCT = 15;
export const PROFITABILITY_MARGIN_HEALTHY_PCT = 30;
export const PROFITABILITY_MARGIN_THIN_PCT = 15;

/** Lo mínimo del viaje que necesita el cálculo (subconjunto de TripDTO). */
export type ProfitabilityTripInput = Pick<
  TripDTO,
  | 'id' | 'folio' | 'status' | 'paymentStatus' | 'driverId' | 'tractorId' | 'clientName'
  | 'origin' | 'destination' | 'scheduledAt' | 'startedAt' | 'createdAt'
  | 'tons' | 'pricePerTon' | 'freightAmount' | 'driverCommission'
  | 'estimatedTolls' | 'estimatedDiesel'
>;

/** Lo mínimo de un registro de bitácora (subconjunto de LogbookEntryDTO). */
export interface ProfitabilityExpenseInput {
  tripId: string;
  eventType: LogbookEvent;
  expenseAmount: number | null;
  expenseHasReceipt: boolean;
}

const money = (n: number) => Math.round(n * 100) / 100;
const pct = (num: number, den: number) => Math.round((num / den) * 1000) / 10;

export function marginBandFor(marginPct: number | null): ProfitabilityMarginBand {
  if (marginPct == null) return 'unknown';
  if (marginPct >= PROFITABILITY_MARGIN_HEALTHY_PCT) return 'healthy';
  if (marginPct >= PROFITABILITY_MARGIN_THIN_PCT) return 'thin';
  return 'low';
}

export const tripReferenceDate = (t: Pick<TripDTO, 'scheduledAt' | 'startedAt' | 'createdAt'>) =>
  t.scheduledAt ?? t.startedAt ?? t.createdAt;

function compare(estimated: number | null, actual: number): ExpenseComparisonDTO {
  if (estimated == null) return { estimated: null, actual, variance: null, variancePct: null, deviated: false };
  const variance = money(actual - estimated);
  const variancePct = estimated > 0 ? pct(variance, estimated) : null;
  const deviated =
    estimated > 0 ? actual > estimated * (1 + PROFITABILITY_DEVIATION_PCT / 100) + 1e-9 : actual > 0;
  return { estimated, actual, variance, variancePct, deviated };
}

export function computeTripProfitability(
  trip: ProfitabilityTripInput,
  entries: ProfitabilityExpenseInput[],
): TripProfitabilityDTO {
  const issues: ProfitabilityDataIssue[] = [];
  let revenue: number | null = null;
  let revenueSource: TripProfitabilityDTO['revenueSource'] = null;
  if (trip.freightAmount != null) {
    revenue = trip.freightAmount;
    revenueSource = 'freight';
  } else if (trip.tons != null && trip.pricePerTon != null) {
    revenue = money(trip.tons * trip.pricePerTon);
    revenueSource = 'tons_x_price';
  }
  if (revenue == null) issues.push('missing_revenue');
  if (trip.driverCommission == null) issues.push('missing_commission');

  let tolls = 0;
  let diesel = 0;
  let other = 0;
  let withoutReceipt = 0;
  let withoutReceiptCount = 0;
  let expenseEntries = 0;
  let missingAmount = false;
  for (const e of entries) {
    if (e.tripId !== trip.id) continue;
    if (e.expenseAmount == null) {
      if (e.eventType === 'toll' || e.eventType === 'diesel') missingAmount = true;
      continue;
    }
    expenseEntries += 1;
    if (e.eventType === 'toll') tolls += e.expenseAmount;
    else if (e.eventType === 'diesel') diesel += e.expenseAmount;
    else other += e.expenseAmount;
    if (!e.expenseHasReceipt) {
      withoutReceipt += e.expenseAmount;
      withoutReceiptCount += 1;
    }
  }
  if (missingAmount) issues.push('expense_without_amount');
  if (trip.estimatedTolls == null && trip.estimatedDiesel == null) issues.push('missing_estimates');

  const tollsCmp = compare(trip.estimatedTolls, money(tolls));
  const dieselCmp = compare(trip.estimatedDiesel, money(diesel));
  const deviations: ProfitabilityExpenseKind[] = [];
  if (tollsCmp.deviated) deviations.push('tolls');
  if (dieselCmp.deviated) deviations.push('diesel');

  const totalCost = money(tolls + diesel + other + (trip.driverCommission ?? 0));
  const profit = revenue != null && trip.driverCommission != null ? money(revenue - totalCost) : null;
  const marginPct = profit != null && revenue != null && revenue > 0 ? pct(profit, revenue) : null;

  return {
    tripId: trip.id,
    folio: trip.folio,
    status: trip.status,
    paymentStatus: trip.paymentStatus,
    driverId: trip.driverId,
    tractorId: trip.tractorId,
    clientName: trip.clientName,
    origin: trip.origin,
    destination: trip.destination,
    tripDate: tripReferenceDate(trip),
    revenue,
    revenueSource,
    tolls: tollsCmp,
    diesel: dieselCmp,
    otherExpenses: money(other),
    driverCommission: trip.driverCommission,
    totalCost,
    profit,
    marginPct,
    marginBand: marginBandFor(marginPct),
    expensesWithoutReceipt: money(withoutReceipt),
    expensesWithoutReceiptCount: withoutReceiptCount,
    expenseEntries,
    deviations,
    dataIssues: issues,
  };
}

export function summarizeProfitability(rows: TripProfitabilityDTO[]): ProfitabilityTotalsDTO {
  const sum = (f: (r: TripProfitabilityDTO) => number | null) =>
    money(rows.reduce((s, r) => s + (f(r) ?? 0), 0));
  const computed = rows.filter((r) => r.profit != null);
  const computedRevenue = computed.reduce((s, r) => s + (r.revenue ?? 0), 0);
  const profit = money(computed.reduce((s, r) => s + (r.profit ?? 0), 0));
  const marginPct = computedRevenue > 0 ? pct(profit, computedRevenue) : null;
  const tolls = sum((r) => r.tolls.actual);
  const diesel = sum((r) => r.diesel.actual);
  const otherExpenses = sum((r) => r.otherExpenses);
  return {
    trips: rows.length,
    tripsComputed: computed.length,
    tripsWithIssues: rows.filter((r) => r.dataIssues.some((i) => i !== 'missing_estimates')).length,
    tripsDeviated: rows.filter((r) => r.deviations.length > 0).length,
    revenue: sum((r) => r.revenue),
    tolls,
    diesel,
    otherExpenses,
    driverCommission: sum((r) => r.driverCommission),
    estimatedTolls: sum((r) => r.tolls.estimated),
    estimatedDiesel: sum((r) => r.diesel.estimated),
    operatingExpenses: money(tolls + diesel + otherExpenses),
    profit,
    marginPct,
    marginBand: marginBandFor(marginPct),
    expensesWithoutReceipt: sum((r) => r.expensesWithoutReceipt),
    expensesWithoutReceiptCount: rows.reduce((s, r) => s + r.expensesWithoutReceiptCount, 0),
  };
}

function parseBound(v: string, kind: 'from' | 'to'): number {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(v);
  const ms = Date.parse(dateOnly ? `${v}T00:00:00.000Z` : v);
  if (Number.isNaN(ms)) throw new Error(`Fecha inválida en ${kind}: ${v}`);
  return dateOnly && kind === 'to' ? ms + 86_400_000 - 1 : ms;
}

/** Mismos filtros que el backend: periodo, chofer, unidad, estado(s). */
export function buildProfitabilityReport(
  trips: ProfitabilityTripInput[],
  entries: ProfitabilityExpenseInput[],
  query: ProfitabilityQuery = {},
): ProfitabilityReportDTO {
  const from = query.from ? parseBound(query.from, 'from') : null;
  const to = query.to ? parseBound(query.to, 'to') : null;
  const statuses = query.status
    ? query.status.split(',').map((s) => s.trim()).filter(Boolean)
    : null;
  for (const s of statuses ?? []) {
    if (!isTripStatus(s)) throw new Error(`Estado de viaje desconocido: ${s}`);
  }
  const rows = trips
    .filter((t) =>
      statuses ? statuses.includes(t.status) : t.status !== 'draft' && t.status !== 'cancelled',
    )
    .filter((t) => !query.driverId || t.driverId === query.driverId)
    .filter((t) => !query.tractorId || t.tractorId === query.tractorId)
    .filter((t) => {
      const at = Date.parse(tripReferenceDate(t));
      return (from == null || at >= from) && (to == null || at <= to);
    })
    .sort((a, b) => tripReferenceDate(b).localeCompare(tripReferenceDate(a)))
    .map((t) => computeTripProfitability(t, entries));
  const filters: ProfitabilityQuery = {};
  for (const k of ['from', 'to', 'driverId', 'tractorId', 'status'] as const) {
    if (query[k]) filters[k] = query[k];
  }
  return { filters, totals: summarizeProfitability(rows), rows, generatedAt: new Date().toISOString() };
}

// ── Orden de la tabla ─────────────────────────────────────────────────────

export type ProfitabilitySortKey =
  | 'tripDate' | 'folio' | 'revenue' | 'tolls' | 'diesel' | 'commission'
  | 'profit' | 'marginPct' | 'withoutReceipt';

const SORT_VALUE: Record<ProfitabilitySortKey, (r: TripProfitabilityDTO) => number | string | null> = {
  tripDate: (r) => r.tripDate,
  folio: (r) => r.folio,
  revenue: (r) => r.revenue,
  tolls: (r) => r.tolls.actual,
  diesel: (r) => r.diesel.actual,
  commission: (r) => r.driverCommission,
  profit: (r) => r.profit,
  marginPct: (r) => r.marginPct,
  withoutReceipt: (r) => r.expensesWithoutReceipt,
};

/** Ordena sin mutar; los valores desconocidos (null) siempre van al final. */
export function sortProfitabilityRows(
  rows: TripProfitabilityDTO[],
  key: ProfitabilitySortKey,
  dir: 'asc' | 'desc',
): TripProfitabilityDTO[] {
  const get = SORT_VALUE[key];
  return [...rows].sort((a, b) => {
    const va = get(a);
    const vb = get(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    const c = typeof va === 'string' ? va.localeCompare(String(vb)) : va - (vb as number);
    return dir === 'asc' ? c : -c;
  });
}

// ── Etiquetas para la UI ──────────────────────────────────────────────────

export const MARGIN_BAND_LABEL: Record<ProfitabilityMarginBand, string> = {
  healthy: 'Sano',
  thin: 'Apretado',
  low: 'Bajo',
  unknown: 'Sin datos',
};

/** Clase de chip de globals.css por banda del semáforo. */
export const MARGIN_BAND_CHIP: Record<ProfitabilityMarginBand, string> = {
  healthy: 'green',
  thin: 'amber',
  low: 'red',
  unknown: 'gray',
};

export const DATA_ISSUE_LABEL: Record<ProfitabilityDataIssue, string> = {
  missing_revenue: 'Sin flete ni tarifa',
  missing_commission: 'Sin comisión pactada',
  expense_without_amount: 'Gasto sin monto en bitácora',
  missing_estimates: 'Sin casetas/diesel estimados',
};

// ── Fuente de datos: backend en vivo o demoData ───────────────────────────

/** Adapta un viaje de demoData a la forma del TripDTO que usa el cálculo. */
export function demoTripToInput(t: DemoTrip): ProfitabilityTripInput {
  return {
    id: t.id,
    folio: t.folio,
    status: t.status,
    paymentStatus: t.paymentStatus,
    driverId: t.driverId,
    tractorId: t.tractorId,
    clientName: t.client,
    origin: t.origin,
    destination: t.destination,
    scheduledAt: t.loadDate,
    startedAt: null,
    createdAt: t.loadDate,
    tons: t.tons,
    pricePerTon: t.pricePerTon,
    freightAmount: t.freightAmount,
    driverCommission: t.driverCommission,
    estimatedTolls: t.estimatedTolls,
    estimatedDiesel: t.estimatedDiesel,
  };
}

export function demoProfitabilityReport(query: ProfitabilityQuery = {}): ProfitabilityReportDTO {
  return buildProfitabilityReport(demoTrips.map(demoTripToInput), demoLogbook, query);
}

export function demoTripProfitability(id: string): TripProfitabilityDTO | null {
  const t = demoTrips.find((x) => x.id === id);
  return t ? computeTripProfitability(demoTripToInput(t), demoLogbook) : null;
}

export function loadProfitabilityReport(query: ProfitabilityQuery = {}): Promise<ProfitabilityReportDTO> {
  return isLive ? profitabilityApi.report(query) : Promise.resolve(demoProfitabilityReport(query));
}

export function loadTripProfitability(id: string): Promise<TripProfitabilityDTO | null> {
  return isLive ? profitabilityApi.trip(id) : Promise.resolve(demoTripProfitability(id));
}

