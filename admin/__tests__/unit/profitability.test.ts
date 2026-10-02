/**
 * Rentabilidad por viaje (US-25) en Admin: mismas reglas que el backend
 * (services/trips/src/profitability.ts) para el modo demo, y cliente HTTP
 * para el modo en vivo.
 */
import {
  buildProfitabilityReport,
  computeTripProfitability,
  demoProfitabilityReport,
  demoTripProfitability,
  loadProfitabilityReport,
  loadTripProfitability,
  marginBandFor,
  sortProfitabilityRows,
  summarizeProfitability,
  type ProfitabilityExpenseInput,
  type ProfitabilityTripInput,
} from '../../lib/profitability';
import { tokenStore } from '../../lib/api/client';
import { fixtures } from '../helpers/fixtures';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';

const trip = (over: Partial<ProfitabilityTripInput> = {}): ProfitabilityTripInput => ({
  id: 'a', folio: 'G3-1', status: 'closed', paymentStatus: 'pending',
  driverId: 'd1', tractorId: 'u1', clientName: 'Bimbo', origin: 'CDMX', destination: 'Qro',
  scheduledAt: '2026-09-10T08:00:00.000Z', startedAt: null, createdAt: '2026-09-01T00:00:00.000Z',
  tons: 20, pricePerTon: 1500, freightAmount: 30000, driverCommission: 3000,
  estimatedTolls: 1000, estimatedDiesel: 5000,
  ...over,
});
const e = (
  eventType: ProfitabilityExpenseInput['eventType'],
  expenseAmount: number | null,
  expenseHasReceipt = true,
  tripId = 'a',
): ProfitabilityExpenseInput => ({ tripId, eventType, expenseAmount, expenseHasReceipt });

describe('computeTripProfitability (admin)', () => {
  test('ingreso − casetas − diesel − otros − comisión', () => {
    const r = computeTripProfitability(trip(), [e('toll', 900), e('diesel', 4800), e('stop', 300), e('departure', null)]);
    expect(r.profit).toBe(21000);
    expect(r.marginPct).toBe(70);
    expect(r.marginBand).toBe('healthy');
    expect(r.otherExpenses).toBe(300);
  });

  test('sin flete cae a toneladas × precio; sin ninguno se marca y no se inventa', () => {
    expect(computeTripProfitability(trip({ freightAmount: null }), []).revenueSource).toBe('tons_x_price');
    const r = computeTripProfitability(trip({ freightAmount: null, pricePerTon: null }), []);
    expect(r.revenue).toBeNull();
    expect(r.profit).toBeNull();
    expect(r.dataIssues).toContain('missing_revenue');
  });

  test('desviación > 15% sobre lo estimado; 15% exacto no', () => {
    const r = computeTripProfitability(trip(), [e('toll', 1151), e('diesel', 5750)]);
    expect(r.deviations).toEqual(['tolls']);
    expect(r.tolls.variancePct).toBe(15.1);
  });

  test('gasto sin ticket = recuperable; caseta sin monto = dato incompleto', () => {
    const r = computeTripProfitability(trip(), [e('toll', 250, false), e('stop', 180, false), e('diesel', null)]);
    expect(r.expensesWithoutReceipt).toBe(430);
    expect(r.expensesWithoutReceiptCount).toBe(2);
    expect(r.dataIssues).toContain('expense_without_amount');
  });

  test('semáforo verde ≥30 · ámbar ≥15 · rojo debajo', () => {
    expect([marginBandFor(30), marginBandFor(15), marginBandFor(14.9), marginBandFor(null)]).toEqual([
      'healthy', 'thin', 'low', 'unknown',
    ]);
  });

  test('totales: margen ponderado solo sobre viajes calculables', () => {
    const a = computeTripProfitability(trip(), [e('toll', 1000)]);
    const b = computeTripProfitability(trip({ id: 'b', freightAmount: null, pricePerTon: null }), [e('toll', 200, true, 'b')]);
    const t = summarizeProfitability([a, b]);
    expect(t.trips).toBe(2);
    expect(t.tripsComputed).toBe(1);
    expect(t.profit).toBe(26000);
    expect(t.marginPct).toBe(86.7);
    expect(t.tolls).toBe(1200);
  });
});

describe('buildProfitabilityReport — filtros como el backend', () => {
  const trips = [
    trip({ id: 'sep', scheduledAt: '2026-09-30T22:00:00.000Z', driverId: 'd1', tractorId: 'u1' }),
    trip({ id: 'aug', scheduledAt: '2026-08-20T08:00:00.000Z', driverId: 'd2', tractorId: 'u1' }),
    trip({ id: 'canc', scheduledAt: '2026-09-12T08:00:00.000Z', status: 'cancelled' }),
  ];

  test('por defecto excluye cancelados; ordena del más reciente al más antiguo', () => {
    expect(buildProfitabilityReport(trips, []).rows.map((r) => r.tripId)).toEqual(['sep', 'aug']);
  });

  test('periodo (to de solo fecha cubre el día), chofer, unidad y estado', () => {
    expect(buildProfitabilityReport(trips, [], { from: '2026-09-01', to: '2026-09-30' }).rows.map((r) => r.tripId)).toEqual(['sep']);
    expect(buildProfitabilityReport(trips, [], { driverId: 'd2' }).rows.map((r) => r.tripId)).toEqual(['aug']);
    expect(buildProfitabilityReport(trips, [], { tractorId: 'u1' }).rows).toHaveLength(2);
    expect(buildProfitabilityReport(trips, [], { status: 'cancelled' }).rows.map((r) => r.tripId)).toEqual(['canc']);
  });

  test('estado fuera del vocabulario único se rechaza', () => {
    expect(() => buildProfitabilityReport(trips, [], { status: 'finished' })).toThrow('Estado de viaje desconocido');
  });
});

describe('sortProfitabilityRows', () => {
  const rows = [
    computeTripProfitability(trip({ id: 'x', folio: 'B', freightAmount: 10000 }), []),
    computeTripProfitability(trip({ id: 'y', folio: 'A', freightAmount: null, pricePerTon: null }), []),
    computeTripProfitability(trip({ id: 'z', folio: 'C', freightAmount: 50000 }), []),
  ];

  test('ordena por margen y deja los desconocidos al final en ambos sentidos', () => {
    expect(sortProfitabilityRows(rows, 'marginPct', 'desc').map((r) => r.tripId)).toEqual(['z', 'x', 'y']);
    expect(sortProfitabilityRows(rows, 'marginPct', 'asc').map((r) => r.tripId)).toEqual(['x', 'z', 'y']);
  });

  test('ordena por texto y no muta el arreglo original', () => {
    expect(sortProfitabilityRows(rows, 'folio', 'asc').map((r) => r.folio)).toEqual(['A', 'B', 'C']);
    expect(rows.map((r) => r.tripId)).toEqual(['x', 'y', 'z']);
  });
});

describe('modo demo — datos que G3 Drive ya captura', () => {
  test('el reporte demo muestra el semáforo completo, datos incompletos y dinero recuperable', () => {
    const r = demoProfitabilityReport();
    const bands = new Set(r.rows.map((x) => x.marginBand));
    expect(bands).toEqual(new Set(['healthy', 'thin', 'low', 'unknown']));
    expect(r.totals.expensesWithoutReceipt).toBeGreaterThan(0);
    expect(r.totals.tripsDeviated).toBeGreaterThan(0);
    expect(r.rows.find((x) => x.folio === 'G3-2026-00109')?.dataIssues).toContain('missing_revenue');
  });

  test('desglose demo de un viaje (Lala): casetas reales, diesel desviado y gasto sin ticket', () => {
    const p = demoTripProfitability('t8')!;
    expect(p.tolls.actual).toBe(2080);
    expect(p.diesel).toMatchObject({ estimated: 5600, actual: 7200, deviated: true });
    expect(p.expensesWithoutReceipt).toBe(1100 + 980 + 3200 + 650);
    expect(p.profit).toBe(33000 - 2080 - 7200 - 650 - 2800);
    expect(demoTripProfitability('no-existe')).toBeNull();
  });
});

describe('modo en vivo — cliente HTTP', () => {
  let teardown: () => void;
  beforeEach(() => tokenStore.setInMemory({ accessToken: 'tok', refreshToken: 'rfr' }));
  afterEach(() => teardown?.());

  test('loadProfitabilityReport pega a GET /trips/profitability con los filtros', async () => {
    const m = makeFetchMock().onAny(
      (req) => req.url.startsWith('https://api.g3.test/api/trips/profitability?'),
      { status: 200, body: fixtures.profitabilityReport([fixtures.tripProfitability()]) },
    );
    teardown = installGlobalFetchMock(m);

    const r = await loadProfitabilityReport({ from: '2026-05-01', to: '2026-05-31', driverId: 'drv_1', status: 'closed' });
    expect(r.rows[0].folio).toBe('G3-2026-00001');
    const url = new URL(m.calls[0].url);
    expect(url.searchParams.get('from')).toBe('2026-05-01');
    expect(url.searchParams.get('to')).toBe('2026-05-31');
    expect(url.searchParams.get('driverId')).toBe('drv_1');
    expect(url.searchParams.get('status')).toBe('closed');
    expect(url.searchParams.has('tractorId')).toBe(false);
  });

  test('loadTripProfitability pega a GET /trips/:id/profitability', async () => {
    const m = makeFetchMock().on('GET /api/trips/trp_9/profitability', {
      status: 200,
      body: fixtures.tripProfitability({ tripId: 'trp_9' }),
    });
    teardown = installGlobalFetchMock(m);
    expect((await loadTripProfitability('trp_9'))?.tripId).toBe('trp_9');
  });

  test('plan Free → 402 con earnings_dashboard', async () => {
    const m = makeFetchMock().onAny(
      (req) => req.url.includes('/api/trips/profitability'),
      { status: 402, body: fixtures.upgradeRequired('earnings_dashboard', 'starter') },
    );
    teardown = installGlobalFetchMock(m);
    await expect(loadProfitabilityReport()).rejects.toMatchObject({ status: 402 });
  });
});
