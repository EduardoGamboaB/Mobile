/**
 * Rentabilidad por viaje (US-25) — la pantalla del dueño.
 *
 *   utilidad = ingreso − casetas − diesel − otros gastos − comisión del chofer
 *
 * Todo sale de datos que G3 Drive ya captura (bitácora con gastos y foto de
 * ticket) y de lo que el despacho pactó al crear el viaje (flete, comisión,
 * casetas y diesel estimados). Sin sensores.
 *
 * Reglas:
 * - Ingreso = `freightAmount`; si falta, `tons × pricePerTon`; si tampoco, se
 *   marca `missing_revenue` y la utilidad queda en null (no se inventa).
 * - Gasto REAL = suma de `expenseAmount` de la bitácora: 'toll' → casetas,
 *   'diesel' → diesel, cualquier otro evento con monto → otros gastos.
 * - Se compara REAL vs ESTIMADO (`estimatedTolls` / `estimatedDiesel`): una
 *   desviación es un real más de 15% arriba de lo estimado.
 * - "Dinero recuperable" = gasto registrado SIN comprobante
 *   (`expenseHasReceipt = false`): lo que no se puede deducir ni auditar.
 * - El margen es de CONTRIBUCIÓN (no incluye costos fijos de la unidad), por
 *   eso el semáforo es más exigente que un margen neto.
 */
import type { TripPaymentStatus, TripStatus } from '../trip-status';

/** Un gasto real se considera desviado si supera lo estimado en más de este %. */
export const PROFITABILITY_DEVIATION_PCT = 15;

/** Semáforo de margen de contribución (en %). */
export const PROFITABILITY_MARGIN_HEALTHY_PCT = 30;
export const PROFITABILITY_MARGIN_THIN_PCT = 15;

/** verde ≥ 30% · ámbar 15–30% · rojo < 15% (incluye pérdida) · gris sin datos. */
export type ProfitabilityMarginBand = 'healthy' | 'thin' | 'low' | 'unknown';

export type ProfitabilityRevenueSource = 'freight' | 'tons_x_price';

/** Datos incompletos detectados: se reportan, nunca se rellenan. */
export type ProfitabilityDataIssue =
  /** Sin flete ni toneladas × precio: no hay ingreso contra qué medir. */
  | 'missing_revenue'
  /** Sin comisión pactada: la utilidad saldría inflada. */
  | 'missing_commission'
  /** Hay registros de caseta/diesel en bitácora sin monto capturado. */
  | 'expense_without_amount'
  /** El viaje no trae casetas ni diesel estimados: no hay contra qué comparar. */
  | 'missing_estimates';

export type ProfitabilityExpenseKind = 'tolls' | 'diesel';

export interface ExpenseComparisonDto {
  /** Lo que el despacho estimó al crear el viaje; null si no se capturó. */
  estimated: number | null;
  /** Suma real de la bitácora. */
  actual: number;
  /** actual − estimated; null sin estimado. */
  variance: number | null;
  /** variance / estimated × 100; null sin estimado (o estimado 0). */
  variancePct: number | null;
  /** true si actual > estimated × (1 + 15%). */
  deviated: boolean;
}

export interface TripProfitabilityDto {
  tripId: string;
  folio: string;
  status: TripStatus;
  paymentStatus: TripPaymentStatus;
  driverId: string | null;
  tractorId: string | null;
  clientName: string | null;
  origin: string;
  destination: string;
  /** Fecha de referencia del viaje (programada, o inicio, o alta). */
  tripDate: string;

  revenue: number | null;
  revenueSource: ProfitabilityRevenueSource | null;

  tolls: ExpenseComparisonDto;
  diesel: ExpenseComparisonDto;
  /** Gastos de bitácora que no son caseta ni diesel (p. ej. 'stop'). */
  otherExpenses: number;
  driverCommission: number | null;

  /** casetas + diesel + otros + comisión (la comisión cuenta solo si se conoce). */
  totalCost: number;
  /** null si falta ingreso o comisión. */
  profit: number | null;
  /** profit / revenue × 100, 1 decimal; null si no hay utilidad. */
  marginPct: number | null;
  marginBand: ProfitabilityMarginBand;

  /** Gasto de bitácora sin foto de ticket: el dinero recuperable. */
  expensesWithoutReceipt: number;
  expensesWithoutReceiptCount: number;
  /** Registros de gasto con monto en bitácora. */
  expenseEntries: number;

  deviations: ProfitabilityExpenseKind[];
  dataIssues: ProfitabilityDataIssue[];
}

export interface ProfitabilityTotalsDto {
  trips: number;
  /** Viajes con utilidad calculable (ingreso y comisión conocidos). */
  tripsComputed: number;
  /** Viajes con datos incompletos (no cuenta la falta de estimados, que es informativa). */
  tripsWithIssues: number;
  tripsDeviated: number;
  revenue: number;
  tolls: number;
  diesel: number;
  otherExpenses: number;
  driverCommission: number;
  estimatedTolls: number;
  estimatedDiesel: number;
  /** casetas + diesel + otros (sin comisión). */
  operatingExpenses: number;
  /** Suma de utilidad de los viajes calculables. */
  profit: number;
  /** Margen ponderado sobre los viajes calculables; null si no hay ninguno. */
  marginPct: number | null;
  marginBand: ProfitabilityMarginBand;
  expensesWithoutReceipt: number;
  expensesWithoutReceiptCount: number;
}

export interface ProfitabilityQueryDto {
  /** ISO (inclusive) sobre la fecha de referencia del viaje. */
  from?: string;
  /** ISO (inclusive; una fecha YYYY-MM-DD cubre el día completo). */
  to?: string;
  driverId?: string;
  tractorId?: string;
  /** Uno o varios estados separados por coma. Por defecto: todos menos draft y cancelled. */
  status?: string;
}

export interface ProfitabilityReportDto {
  filters: ProfitabilityQueryDto;
  totals: ProfitabilityTotalsDto;
  rows: TripProfitabilityDto[];
  generatedAt: string;
}
