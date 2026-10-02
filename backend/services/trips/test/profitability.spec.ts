import { TripsService, type RequestCtx } from '../src/trips.service';
import { InMemoryTripRepo } from '../src/in-memory.trip.repo';
import {
  InMemoryEvidenceRepo,
  InMemoryExpensePolicyRepo,
  InMemoryLogbookRepo,
  StubEvidenceStorage,
} from '../src/in-memory.ops.repo';
import { RecordingEventBus } from '../src/event.bus';
import {
  computeTripProfitability,
  marginBandFor,
  summarizeProfitability,
} from '../src/profitability';
import {
  Feature,
  UpgradeRequiredError,
  type LogbookEntryDto,
  type LogbookEvent,
  type TripDto,
} from '@g3/contracts';

const NOW = '2026-09-15T12:00:00.000Z';

function trip(over: Partial<TripDto> = {}): TripDto {
  return {
    id: 'trp_1', companyId: 'cmp_1', folio: 'G3-2026-00001', status: 'closed',
    driverId: 'drv_1', tractorId: 'trc_1', trailerId: null, clientName: 'Bimbo', cargo: null,
    origin: 'CDMX', destination: 'Querétaro', scheduledAt: NOW, estimatedUnloadAt: null,
    tons: 20, pricePerTon: 1500, freightAmount: 30000, driverCommission: 3000,
    estimatedTolls: 1000, estimatedDiesel: 5000, notes: null,
    startedAt: NOW, preClosedAt: null, closedAt: NOW, cancelledAt: null,
    paymentStatus: 'pending', paymentReleasedAt: null, createdAt: NOW, updatedAt: NOW,
    ...over,
  };
}

let seq = 0;
function entry(eventType: LogbookEvent, expenseAmount: number | null, expenseHasReceipt = true, over: Partial<LogbookEntryDto> = {}): LogbookEntryDto {
  seq += 1;
  return {
    id: `lb_${seq}`, companyId: 'cmp_1', clientUuid: `cu_${seq}`, tripId: 'trp_1', driverId: 'drv_1',
    eventType, occurredAt: NOW, locationText: null, lat: null, lng: null, odometerKm: null, fuel: null,
    expenseAmount, expenseConcept: null, expenseHasReceipt, comments: null, createdAt: NOW,
    ...over,
  };
}

describe('computeTripProfitability — importe − casetas − diesel − otros − comisión', () => {
  test('calcula ingreso, gasto real por tipo, utilidad y margen', () => {
    const r = computeTripProfitability(trip(), [
      entry('toll', 400),
      entry('toll', 500),
      entry('diesel', 4800),
      entry('stop', 300),
      entry('departure', null),
    ]);
    expect(r.revenue).toBe(30000);
    expect(r.revenueSource).toBe('freight');
    expect(r.tolls.actual).toBe(900);
    expect(r.diesel.actual).toBe(4800);
    expect(r.otherExpenses).toBe(300);
    expect(r.driverCommission).toBe(3000);
    expect(r.totalCost).toBe(900 + 4800 + 300 + 3000);
    expect(r.profit).toBe(30000 - 9000);
    expect(r.marginPct).toBe(70);
    expect(r.marginBand).toBe('healthy');
    expect(r.expenseEntries).toBe(4);
    expect(r.dataIssues).toEqual([]);
  });

  test('sin flete usa toneladas × precio por tonelada', () => {
    const r = computeTripProfitability(trip({ freightAmount: null, tons: 24, pricePerTon: 1700 }), []);
    expect(r.revenue).toBe(40800);
    expect(r.revenueSource).toBe('tons_x_price');
  });

  test('sin ingreso: utilidad null y se marca, no se inventa', () => {
    const r = computeTripProfitability(trip({ freightAmount: null, tons: null }), [entry('toll', 100)]);
    expect(r.revenue).toBeNull();
    expect(r.profit).toBeNull();
    expect(r.marginPct).toBeNull();
    expect(r.marginBand).toBe('unknown');
    expect(r.dataIssues).toContain('missing_revenue');
  });

  test('sin comisión pactada: utilidad null (saldría inflada) y se marca', () => {
    const r = computeTripProfitability(trip({ driverCommission: null }), []);
    expect(r.profit).toBeNull();
    expect(r.dataIssues).toContain('missing_commission');
    expect(r.totalCost).toBe(0);
  });

  test('marca desviación cuando el real supera lo estimado en más de 15%', () => {
    const r = computeTripProfitability(trip({ estimatedTolls: 1000, estimatedDiesel: 5000 }), [
      entry('toll', 1151), // +15.1% → desviado
      entry('diesel', 5750), // +15% exacto → no desviado
    ]);
    expect(r.tolls).toMatchObject({ estimated: 1000, actual: 1151, variance: 151, variancePct: 15.1, deviated: true });
    expect(r.diesel).toMatchObject({ estimated: 5000, actual: 5750, variance: 750, variancePct: 15, deviated: false });
    expect(r.deviations).toEqual(['tolls']);
  });

  test('gastar menos de lo estimado no es desviación', () => {
    const r = computeTripProfitability(trip(), [entry('diesel', 3000)]);
    expect(r.diesel.variance).toBe(-2000);
    expect(r.diesel.deviated).toBe(false);
  });

  test('sin estimados: sin comparación ni desviación, y se marca', () => {
    const r = computeTripProfitability(trip({ estimatedTolls: null, estimatedDiesel: null }), [entry('toll', 900)]);
    expect(r.tolls).toEqual({ estimated: null, actual: 900, variance: null, variancePct: null, deviated: false });
    expect(r.dataIssues).toContain('missing_estimates');
  });

  test('gasto sin comprobante = dinero recuperable', () => {
    const r = computeTripProfitability(trip(), [
      entry('toll', 250, false),
      entry('diesel', 2000, true),
      entry('stop', 180, false),
    ]);
    expect(r.expensesWithoutReceipt).toBe(430);
    expect(r.expensesWithoutReceiptCount).toBe(2);
  });

  test('caseta/diesel registrados sin monto se marcan y no suman', () => {
    const r = computeTripProfitability(trip(), [entry('toll', null), entry('diesel', 1000)]);
    expect(r.tolls.actual).toBe(0);
    expect(r.dataIssues).toContain('expense_without_amount');
  });

  test('ignora registros de otros viajes', () => {
    const r = computeTripProfitability(trip(), [entry('toll', 500, true, { tripId: 'otro' })]);
    expect(r.tolls.actual).toBe(0);
  });
});

describe('marginBandFor — semáforo de margen de contribución', () => {
  test('verde ≥30 · ámbar 15–30 · rojo <15 · gris sin dato', () => {
    expect(marginBandFor(30)).toBe('healthy');
    expect(marginBandFor(29.9)).toBe('thin');
    expect(marginBandFor(15)).toBe('thin');
    expect(marginBandFor(14.9)).toBe('low');
    expect(marginBandFor(-5)).toBe('low');
    expect(marginBandFor(null)).toBe('unknown');
  });
});

describe('summarizeProfitability — totales del periodo', () => {
  test('suma todo y calcula margen ponderado solo con viajes calculables', () => {
    const a = computeTripProfitability(trip({ id: 'a' }), [entry('toll', 1000, false, { tripId: 'a' })]);
    const b = computeTripProfitability(trip({ id: 'b', freightAmount: 10000, driverCommission: 1000 }), [
      entry('diesel', 7000, true, { tripId: 'b' }),
    ]);
    const c = computeTripProfitability(trip({ id: 'c', freightAmount: null, tons: null }), [
      entry('toll', 200, true, { tripId: 'c' }),
    ]);
    const t = summarizeProfitability([a, b, c]);
    expect(t.trips).toBe(3);
    expect(t.tripsComputed).toBe(2);
    expect(t.tripsWithIssues).toBe(1);
    expect(t.revenue).toBe(40000);
    expect(t.tolls).toBe(1200);
    expect(t.diesel).toBe(7000);
    expect(t.operatingExpenses).toBe(8200);
    expect(t.driverCommission).toBe(7000); // c sí trae comisión aunque falte el ingreso
    // a: 30000 − 1000 − 3000 = 26000 ; b: 10000 − 7000 − 1000 = 2000
    expect(t.profit).toBe(28000);
    expect(t.marginPct).toBe(70);
    expect(t.expensesWithoutReceipt).toBe(1000);
    expect(t.tripsDeviated).toBe(1); // b: diesel 7000 vs 5000
    expect(t.estimatedTolls).toBe(3000);
  });

  test('sin viajes: ceros y margen null', () => {
    const t = summarizeProfitability([]);
    expect(t.trips).toBe(0);
    expect(t.marginPct).toBeNull();
    expect(t.marginBand).toBe('unknown');
  });
});

// ── Servicio ──────────────────────────────────────────────────────────────

const ctx = (over: Partial<RequestCtx> = {}): RequestCtx => ({
  companyId: 'cmp_1', tier: 'starter', userId: 'usr_owner', role: 'owner', ...over,
});

async function seeded() {
  const repo = new InMemoryTripRepo();
  const logbook = new InMemoryLogbookRepo();
  const svc = new TripsService(repo, new RecordingEventBus(), {
    logbook,
    evidences: new InMemoryEvidenceRepo(),
    policies: new InMemoryExpensePolicyRepo(),
    storage: new StubEvidenceStorage(),
  });
  await repo.create(trip({ id: 'sep', scheduledAt: '2026-09-10T08:00:00.000Z', driverId: 'drv_1', tractorId: 'trc_1' }));
  await repo.create(trip({ id: 'sep_end', scheduledAt: '2026-09-30T22:00:00.000Z', driverId: 'drv_2', tractorId: 'trc_2', status: 'in_transit' }));
  await repo.create(trip({ id: 'aug', scheduledAt: '2026-08-20T08:00:00.000Z', driverId: 'drv_1', tractorId: 'trc_2' }));
  await repo.create(trip({ id: 'canc', scheduledAt: '2026-09-12T08:00:00.000Z', status: 'cancelled' }));
  await repo.create(trip({ id: 'otra', companyId: 'cmp_2', scheduledAt: '2026-09-12T08:00:00.000Z' }));
  await logbook.create(entry('toll', 1500, false, { tripId: 'sep' }));
  await logbook.create(entry('diesel', 5200, true, { tripId: 'sep' }));
  await logbook.create(entry('toll', 999, true, { tripId: 'otra', companyId: 'cmp_2' }));
  return { svc };
}

describe('TripsService.tripProfitability — GET /trips/:id/profitability', () => {
  test('el dueño ve el desglose del viaje con la bitácora real', async () => {
    const { svc } = await seeded();
    const r = await svc.tripProfitability(ctx(), 'sep');
    expect(r.tripId).toBe('sep');
    expect(r.tolls).toMatchObject({ actual: 1500, deviated: true });
    expect(r.diesel.actual).toBe(5200);
    expect(r.expensesWithoutReceipt).toBe(1500);
    expect(r.profit).toBe(30000 - 1500 - 5200 - 3000);
  });

  test.each(['admin', 'dispatcher'])('%s también puede verla', async (role) => {
    const { svc } = await seeded();
    await expect(svc.tripProfitability(ctx({ role }), 'sep')).resolves.toMatchObject({ tripId: 'sep' });
  });

  test('un chofer no ve la rentabilidad (ni de su propio viaje)', async () => {
    const { svc } = await seeded();
    await expect(
      svc.tripProfitability(ctx({ role: 'driver', driverId: 'drv_1' }), 'sep'),
    ).rejects.toThrow('Sin permiso');
  });

  test('viewer tampoco', async () => {
    const { svc } = await seeded();
    await expect(svc.tripProfitability(ctx({ role: 'viewer' }), 'sep')).rejects.toThrow('Sin permiso');
  });

  test('plan Free → UpgradeRequired con EarningsDashboard', async () => {
    const { svc } = await seeded();
    const err = await svc.tripProfitability(ctx({ tier: 'free' }), 'sep').catch((e) => e);
    expect(err).toBeInstanceOf(UpgradeRequiredError);
    expect((err as UpgradeRequiredError).toJSON().missingFeatures).toEqual([Feature.EarningsDashboard]);
  });

  test('viaje de otra compañía no existe', async () => {
    const { svc } = await seeded();
    await expect(svc.tripProfitability(ctx(), 'otra')).rejects.toThrow('Viaje no encontrado');
  });
});

describe('TripsService.profitabilityReport — GET /trips/profitability', () => {
  test('por defecto: todos los viajes de la compañía menos draft/cancelados, más recientes primero', async () => {
    const { svc } = await seeded();
    const r = await svc.profitabilityReport(ctx(), {});
    expect(r.rows.map((x) => x.tripId)).toEqual(['sep_end', 'sep', 'aug']);
    expect(r.totals.trips).toBe(3);
    expect(r.totals.tolls).toBe(1500);
    expect(r.totals.expensesWithoutReceipt).toBe(1500);
    expect(r.generatedAt).toBeTruthy();
  });

  test('periodo: from/to inclusivos; una fecha sola cubre el día completo', async () => {
    const { svc } = await seeded();
    const r = await svc.profitabilityReport(ctx(), { from: '2026-09-01', to: '2026-09-30' });
    expect(r.rows.map((x) => x.tripId).sort()).toEqual(['sep', 'sep_end']);
    expect(r.filters).toMatchObject({ from: '2026-09-01', to: '2026-09-30' });
  });

  test('filtra por chofer y por unidad', async () => {
    const { svc } = await seeded();
    expect((await svc.profitabilityReport(ctx(), { driverId: 'drv_1' })).rows.map((x) => x.tripId).sort()).toEqual(['aug', 'sep']);
    expect((await svc.profitabilityReport(ctx(), { tractorId: 'trc_2' })).rows.map((x) => x.tripId).sort()).toEqual(['aug', 'sep_end']);
  });

  test('filtra por estado (uno o varios separados por coma), incluso cancelados', async () => {
    const { svc } = await seeded();
    expect((await svc.profitabilityReport(ctx(), { status: 'in_transit' })).rows.map((x) => x.tripId)).toEqual(['sep_end']);
    expect((await svc.profitabilityReport(ctx(), { status: 'closed,cancelled' })).rows.map((x) => x.tripId).sort()).toEqual(['aug', 'canc', 'sep']);
  });

  test('rechaza fechas o estados inválidos', async () => {
    const { svc } = await seeded();
    await expect(svc.profitabilityReport(ctx(), { from: 'ayer' })).rejects.toThrow('Fecha inválida');
    await expect(svc.profitabilityReport(ctx(), { status: 'finished' })).rejects.toThrow('Estado de viaje desconocido');
  });

  test('solo managers y desde Starter', async () => {
    const { svc } = await seeded();
    await expect(svc.profitabilityReport(ctx({ role: 'driver', driverId: 'drv_1' }), {})).rejects.toThrow('Sin permiso');
    await expect(svc.profitabilityReport(ctx({ tier: 'free' }), {})).rejects.toBeInstanceOf(UpgradeRequiredError);
  });
});
