/**
 * Cálculo de rentabilidad por viaje (US-25). Funciones puras: el servicio
 * solo junta viaje + bitácora y delega aquí. Reglas en
 * `@g3/contracts` → dtos/profitability.ts.
 */
import {
  PROFITABILITY_DEVIATION_PCT,
  PROFITABILITY_MARGIN_HEALTHY_PCT,
  PROFITABILITY_MARGIN_THIN_PCT,
  type ExpenseComparisonDto,
  type LogbookEntryDto,
  type ProfitabilityDataIssue,
  type ProfitabilityExpenseKind,
  type ProfitabilityMarginBand,
  type ProfitabilityTotalsDto,
  type TripDto,
  type TripProfitabilityDto,
} from '@g3/contracts';

/** Redondeo a centavos para no arrastrar basura de punto flotante. */
const money = (n: number) => Math.round(n * 100) / 100;
const pct = (num: number, den: number) => Math.round((num / den) * 1000) / 10;

export function marginBandFor(marginPct: number | null): ProfitabilityMarginBand {
  if (marginPct == null) return 'unknown';
  if (marginPct >= PROFITABILITY_MARGIN_HEALTHY_PCT) return 'healthy';
  if (marginPct >= PROFITABILITY_MARGIN_THIN_PCT) return 'thin';
  return 'low';
}

/** Fecha de referencia del viaje para filtros por periodo. */
export function tripReferenceDate(t: TripDto): string {
  return t.scheduledAt ?? t.startedAt ?? t.createdAt;
}

function compare(estimated: number | null, actual: number): ExpenseComparisonDto {
  if (estimated == null) return { estimated: null, actual, variance: null, variancePct: null, deviated: false };
  const variance = money(actual - estimated);
  const variancePct = estimated > 0 ? pct(variance, estimated) : null;
  const deviated = estimated > 0 ? actual > estimated * (1 + PROFITABILITY_DEVIATION_PCT / 100) + 1e-9 : actual > 0;
  return { estimated, actual, variance, variancePct, deviated };
}

function revenueOf(t: TripDto): Pick<TripProfitabilityDto, 'revenue' | 'revenueSource'> {
  if (t.freightAmount != null) return { revenue: t.freightAmount, revenueSource: 'freight' };
  if (t.tons != null && t.pricePerTon != null) {
    return { revenue: money(t.tons * t.pricePerTon), revenueSource: 'tons_x_price' };
  }
  return { revenue: null, revenueSource: null };
}

export function computeTripProfitability(trip: TripDto, logbook: LogbookEntryDto[]): TripProfitabilityDto {
  const issues: ProfitabilityDataIssue[] = [];
  const { revenue, revenueSource } = revenueOf(trip);
  if (revenue == null) issues.push('missing_revenue');
  if (trip.driverCommission == null) issues.push('missing_commission');

  let tolls = 0;
  let diesel = 0;
  let other = 0;
  let withoutReceipt = 0;
  let withoutReceiptCount = 0;
  let expenseEntries = 0;
  let missingAmount = false;

  for (const e of logbook) {
    if (e.tripId !== trip.id) continue;
    if (e.expenseAmount == null) {
      // Una caseta o carga de diesel sin monto es un hueco de datos; un
      // evento de salida/llegada sin monto es normal.
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
  const marginPct = profit != null && revenue! > 0 ? pct(profit, revenue!) : null;

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

export function summarizeProfitability(rows: TripProfitabilityDto[]): ProfitabilityTotalsDto {
  const sum = (f: (r: TripProfitabilityDto) => number | null) => money(rows.reduce((s, r) => s + (f(r) ?? 0), 0));
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
