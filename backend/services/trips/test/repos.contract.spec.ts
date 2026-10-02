import * as path from 'path';
import { randomUUID } from 'crypto';
import type { CreateLogbookEntryDto, EvidenceDto, LogbookEntryDto, TierValue, TripDto } from '@g3/contracts';
import { createTestDb, describeIfDb } from '@g3/platform/testing';
import { buildRepos, type TripsRepos } from '../src/main';
import { TripsService, type RequestCtx } from '../src/trips.service';
import { RecordingEventBus } from '../src/event.bus';
import { StubEvidenceStorage } from '../src/in-memory.ops.repo';

/**
 * Contrato de persistencia de trips: los mismos casos contra los repos en
 * memoria (siempre) y contra Postgres (con TEST_DATABASE_URL). Cada caso usa
 * compañías nuevas, así los de Postgres comparten schema sin pisarse.
 */

const MIGRATIONS = path.join(__dirname, '../migrations');

const newCompany = () => `cmp_${randomUUID().slice(0, 8)}`;
const owner = (companyId: string, tier: TierValue = 'business'): RequestCtx => ({
  companyId,
  tier,
  userId: 'usr_owner',
  role: 'owner',
});

function serviceFor(repos: TripsRepos) {
  return new TripsService(repos.trips, new RecordingEventBus(), { ...repos.ops, storage: new StubEvidenceStorage() }, {
    log: () => undefined,
  });
}

function trip(companyId: string, over: Partial<TripDto> = {}): TripDto {
  const id = over.id ?? randomUUID();
  return {
    id,
    companyId,
    folio: `F-${id}`,
    status: 'scheduled',
    driverId: null,
    tractorId: null,
    trailerId: null,
    clientName: null,
    cargo: null,
    origin: 'Tula',
    destination: 'Tampico',
    scheduledAt: '2026-09-10T08:00:00.000Z',
    estimatedUnloadAt: null,
    tons: null,
    pricePerTon: null,
    freightAmount: null,
    driverCommission: null,
    estimatedTolls: null,
    estimatedDiesel: null,
    notes: null,
    startedAt: null,
    preClosedAt: null,
    closedAt: null,
    cancelledAt: null,
    paymentStatus: 'pending',
    paymentReleasedAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...over,
  };
}

function logEntry(companyId: string, tripId: string, over: Partial<LogbookEntryDto> = {}): LogbookEntryDto {
  return {
    id: randomUUID(),
    companyId,
    clientUuid: randomUUID(),
    tripId,
    driverId: 'drv_1',
    eventType: 'toll',
    occurredAt: '2026-09-10T10:00:00.000Z',
    locationText: null,
    lat: 19.4326,
    lng: -99.1332,
    odometerKm: 1234.5,
    fuel: null,
    expenseAmount: 1234.56,
    expenseConcept: 'Caseta Palmillas',
    expenseHasReceipt: false,
    comments: null,
    createdAt: '2026-09-10T10:00:05.000Z',
    ...over,
  };
}

function evidence(companyId: string, tripId: string, over: Partial<EvidenceDto> = {}): EvidenceDto {
  return {
    id: randomUUID(),
    companyId,
    clientUuid: randomUUID(),
    tripId,
    logbookId: null,
    incidentId: null,
    driverId: 'drv_1',
    type: 'toll_ticket',
    storagePath: `${companyId}/${tripId}/x.jpg`,
    mimeType: 'image/jpeg',
    sizeBytes: 123456,
    lat: null,
    lng: null,
    takenAt: '2026-09-10T10:00:00.000Z',
    createdAt: '2026-09-10T10:00:06.000Z',
    ...over,
  };
}

/** Datos del reporte de rentabilidad: idénticos en ambas implementaciones. */
async function seedReport(repos: TripsRepos, companyId: string, other: string) {
  const base = { driverCommission: 3000, estimatedTolls: 1000, estimatedDiesel: 6000 };
  await repos.trips.create(
    trip(companyId, { id: `${companyId}-sep`, freightAmount: 30000, driverId: 'drv_1', tractorId: 'trc_1', status: 'closed', ...base }),
  );
  await repos.trips.create(
    trip(companyId, {
      id: `${companyId}-sep-end`,
      scheduledAt: '2026-09-30T22:00:00.000Z',
      tons: 30.5,
      pricePerTon: 850.25,
      driverId: 'drv_2',
      tractorId: 'trc_2',
      status: 'in_transit',
      ...base,
    }),
  );
  await repos.trips.create(
    trip(companyId, { id: `${companyId}-aug`, scheduledAt: '2026-08-20T08:00:00.000Z', freightAmount: 18000.5, tractorId: 'trc_2' }),
  );
  // Misma fecha de referencia que `sep`: el desempate por id debe coincidir.
  await repos.trips.create(trip(companyId, { id: `${companyId}-sep-b`, freightAmount: 1000, status: 'pre_closed' }));
  await repos.trips.create(trip(companyId, { id: `${companyId}-canc`, status: 'cancelled', freightAmount: 999 }));
  await repos.trips.create(
    trip(companyId, { id: `${companyId}-nodate`, scheduledAt: null, startedAt: '2026-09-15T12:00:00.000Z', freightAmount: 500 }),
  );
  await repos.trips.create(trip(other, { id: `${other}-x`, freightAmount: 77777 }));
  const sep = `${companyId}-sep`;
  await repos.ops.logbook.create(logEntry(companyId, sep, { clientUuid: `${companyId}-l1`, expenseAmount: 1500.1 }));
  await repos.ops.logbook.create(
    logEntry(companyId, sep, { clientUuid: `${companyId}-l2`, eventType: 'diesel', expenseAmount: 5200, expenseHasReceipt: true, occurredAt: '2026-09-10T11:00:00.000Z' }),
  );
  await repos.ops.logbook.create(
    logEntry(companyId, sep, { clientUuid: `${companyId}-l3`, eventType: 'diesel', expenseAmount: null, occurredAt: '2026-09-10T12:00:00.000Z' }),
  );
  await repos.ops.logbook.create(
    logEntry(companyId, `${companyId}-sep-end`, { clientUuid: `${companyId}-l4`, eventType: 'stop', expenseAmount: 250.75 }),
  );
  await repos.ops.logbook.create(logEntry(other, `${other}-x`, { clientUuid: `${other}-l1`, expenseAmount: 99 }));
}

function contract(getRepos: () => TripsRepos) {
  test('aislamiento por compañía en viajes, filtros y conteos', async () => {
    const repos = getRepos();
    const [a, b] = [newCompany(), newCompany()];
    const t1 = await repos.trips.create(trip(a, { driverId: 'drv_1', freightAmount: 12345.67, tons: 30.125 }));
    await repos.trips.create(trip(a, { status: 'closed', driverId: 'drv_2' }));
    await repos.trips.create(trip(b, { driverId: 'drv_1' }));

    expect(t1.freightAmount).toBe(12345.67);
    expect(await repos.trips.findById(a, t1.id)).toEqual(t1);
    expect(await repos.trips.findById(b, t1.id)).toBeNull();
    expect(await repos.trips.list(a)).toHaveLength(2);
    expect(await repos.trips.list(a, { status: 'closed' })).toHaveLength(1);
    expect((await repos.trips.list(a, { driverId: 'drv_1' })).map((t) => t.id)).toEqual([t1.id]);
    expect(await repos.trips.countTotalForCompany(a)).toBe(2);
    expect(await repos.trips.countTotalForCompany(b)).toBe(1);
    expect(await repos.trips.update(b, t1.id, { notes: 'intruso' })).toBeNull();
    expect((await repos.trips.update(a, t1.id, { notes: 'ok', freightAmount: 1 }))?.notes).toBe('ok');
  });

  test('countInCurrentMonth usa scheduledAt ?? startedAt ?? ahora (mes UTC)', async () => {
    const repos = getRepos();
    const a = newCompany();
    const now = new Date();
    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 12)).toISOString();
    const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15)).toISOString();
    await repos.trips.create(trip(a, { scheduledAt: thisMonth }));
    await repos.trips.create(trip(a, { scheduledAt: null, startedAt: thisMonth }));
    await repos.trips.create(trip(a, { scheduledAt: null }));
    await repos.trips.create(trip(a, { scheduledAt: lastMonth }));
    expect(await repos.trips.countInCurrentMonth(a)).toBe(3);
  });

  test('folios únicos y consecutivos con 30 altas concurrentes; cada compañía y año con su contador', async () => {
    const repos = getRepos();
    const svc = serviceFor(repos);
    const [a, b] = [newCompany(), newCompany()];
    const created = await Promise.all(
      Array.from({ length: 30 }, (_, i) => svc.create(owner(a), { origin: 'A', destination: `B${i}` })),
    );
    const year = new Date().getUTCFullYear();
    const folios = created.map((t) => t.folio).sort();
    expect(new Set(folios).size).toBe(30);
    expect(folios).toEqual(Array.from({ length: 30 }, (_, i) => `G3-${year}-${String(i + 1).padStart(5, '0')}`));
    expect((await svc.create(owner(b), { origin: 'A', destination: 'B' })).folio).toBe(`G3-${year}-00001`);
    expect(await repos.trips.nextFolioSeq(a, year + 1)).toBe(1);
  });

  test('transición compare-and-set: dos avances simultáneos → uno gana, el otro error de transición', async () => {
    const repos = getRepos();
    const svc = serviceFor(repos);
    const a = newCompany();
    const t = await svc.create(owner(a), { origin: 'A', destination: 'B' });
    const results = await Promise.allSettled([
      svc.setStatus(owner(a), t.id, 'loading'),
      svc.setStatus(owner(a), t.id, 'loading'),
    ]);
    const ok = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(String(failed[0].reason)).toMatch(/Transición inválida: loading → loading/);
    const after = await repos.trips.findById(a, t.id);
    expect(after?.status).toBe('loading');
    expect(after?.startedAt).toBeTruthy();

    // El repo no mueve un viaje cuyo estado ya no es el esperado (ni de otra compañía).
    expect(await repos.trips.transition(a, t.id, 'scheduled', 'cancelled', { updatedAt: new Date().toISOString() })).toBeNull();
    expect(await repos.trips.transition(newCompany(), t.id, 'loading', 'in_transit', { updatedAt: new Date().toISOString() })).toBeNull();
  });

  test('liberar pago dos veces a la vez → solo una vez', async () => {
    const repos = getRepos();
    const svc = serviceFor(repos);
    const a = newCompany();
    const t = await repos.trips.create(trip(a, { status: 'pre_closed' }));
    const results = await Promise.allSettled([svc.releasePayment(owner(a), t.id), svc.releasePayment(owner(a), t.id)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await repos.trips.findById(a, t.id))?.paymentStatus).toBe('released');
    const draft = await repos.trips.create(trip(a, { status: 'in_transit' }));
    expect(await repos.trips.releasePayment(a, draft.id, ['pre_closed', 'closed'], new Date().toISOString())).toBeNull();
  });

  test('viajes por vehículo (tracto o remolque) y estados', async () => {
    const repos = getRepos();
    const a = newCompany();
    const t1 = await repos.trips.create(trip(a, { tractorId: 'trc_1', status: 'in_transit' }));
    const t2 = await repos.trips.create(trip(a, { trailerId: 'trc_1', status: 'scheduled' }));
    await repos.trips.create(trip(a, { tractorId: 'trc_1', status: 'closed' }));
    await repos.trips.create(trip(newCompany(), { tractorId: 'trc_1', status: 'in_transit' }));
    const active = await repos.trips.listByVehicle(a, 'trc_1', ['scheduled', 'in_transit']);
    expect(active.map((t) => t.id).sort()).toEqual([t1.id, t2.id].sort());
  });

  test('bitácora idempotente por clientUuid (por compañía) y listByTrips en una consulta', async () => {
    const repos = getRepos();
    const [a, b] = [newCompany(), newCompany()];
    const ta = await repos.trips.create(trip(a));
    const ta2 = await repos.trips.create(trip(a));
    const tb = await repos.trips.create(trip(b));
    const first = await repos.ops.logbook.create(logEntry(a, ta.id, { clientUuid: 'cu-1' }));
    const again = await repos.ops.logbook.create(logEntry(a, ta.id, { clientUuid: 'cu-1', expenseAmount: 1 }));
    expect(again).toEqual(first);
    expect(first.expenseAmount).toBe(1234.56);
    expect(first.odometerKm).toBe(1234.5);
    // El mismo clientUuid en otra compañía es otro asiento.
    const other = await repos.ops.logbook.create(logEntry(b, tb.id, { clientUuid: 'cu-1' }));
    expect(other.id).not.toBe(first.id);

    await repos.ops.logbook.create(logEntry(a, ta2.id, { occurredAt: '2026-09-11T00:00:00.000Z' }));
    expect(await repos.ops.logbook.listByTrip(a, ta.id)).toEqual([first]);
    expect(await repos.ops.logbook.listByTrip(b, ta.id)).toEqual([]);
    expect(await repos.ops.logbook.findByClientUuid(a, 'cu-1')).toEqual(first);
    const many = await repos.ops.logbook.listByTrips(a, [ta.id, ta2.id, tb.id]);
    expect(many).toHaveLength(2);
    expect(await repos.ops.logbook.listByTrips(a, [])).toEqual([]);
  });

  test('alta concurrente de bitácora desde la cola offline: 5 reintentos → 1 asiento', async () => {
    const repos = getRepos();
    const svc = serviceFor(repos);
    const a = newCompany();
    const t = await svc.create(owner(a), { origin: 'A', destination: 'B' });
    const input: CreateLogbookEntryDto = {
      clientUuid: randomUUID(),
      driverId: 'drv_1',
      eventType: 'toll',
      occurredAt: '2026-09-10T10:00:00.000Z',
      locationText: null,
      lat: null,
      lng: null,
      odometerKm: null,
      fuel: null,
      expenseAmount: 150,
      expenseConcept: null,
      expenseHasReceipt: true,
      comments: null,
    };
    const saved = await Promise.all(Array.from({ length: 5 }, () => svc.addLogbookEntry(owner(a), t.id, input)));
    expect(new Set(saved.map((e) => e.id)).size).toBe(1);
    expect(await repos.ops.logbook.listByTrip(a, t.id)).toHaveLength(1);
  });

  test('evidencias idempotentes por clientUuid', async () => {
    const repos = getRepos();
    const a = newCompany();
    const t = await repos.trips.create(trip(a));
    const e1 = await repos.ops.evidences.create(evidence(a, t.id, { clientUuid: 'ev-1' }));
    const e2 = await repos.ops.evidences.create(evidence(a, t.id, { clientUuid: 'ev-1', storagePath: 'otra' }));
    expect(e2).toEqual(e1);
    const e3 = await repos.ops.evidences.create(evidence(a, t.id, { createdAt: '2026-09-10T11:00:00.000Z' }));
    expect((await repos.ops.evidences.listByTrip(a, t.id)).map((e) => e.id)).toEqual([e3.id, e1.id]);
    expect(await repos.ops.evidences.findByClientUuid(newCompany(), 'ev-1')).toBeNull();
  });

  test('política de gastos: upsert por compañía', async () => {
    const repos = getRepos();
    const [a, b] = [newCompany(), newCompany()];
    expect(await repos.ops.policies.get(a)).toBeNull();
    const p = { companyId: a, allowManualExpense: true, manualMaxAmount: 500.5, requireReceipt: false, updatedAt: '2026-09-01T00:00:00.000Z' };
    expect(await repos.ops.policies.put(p)).toEqual(p);
    const p2 = { ...p, manualMaxAmount: null, requireReceipt: true, updatedAt: '2026-09-02T00:00:00.000Z' };
    expect(await repos.ops.policies.put(p2)).toEqual(p2);
    expect(await repos.ops.policies.get(a)).toEqual(p2);
    expect(await repos.ops.policies.get(b)).toBeNull();
  });

  test('reporte de rentabilidad: filtros, orden y aislamiento', async () => {
    const repos = getRepos();
    const svc = serviceFor(repos);
    const [a, b] = [newCompany(), newCompany()];
    await seedReport(repos, a, b);
    const all = await svc.profitabilityReport(owner(a), {});
    expect(all.rows.map((r) => r.tripId)).toEqual([`${a}-sep-end`, `${a}-nodate`, `${a}-sep`, `${a}-sep-b`, `${a}-aug`]);
    const sep = all.rows.find((r) => r.tripId === `${a}-sep`)!;
    expect(sep.tolls.actual).toBe(1500.1);
    expect(sep.dataIssues).toContain('expense_without_amount');
    const filtered = await svc.profitabilityReport(owner(a), { from: '2026-09-01', to: '2026-09-30', tractorId: 'trc_2' });
    expect(filtered.rows.map((r) => r.tripId)).toEqual([`${a}-sep-end`]);
    const byStatus = await svc.profitabilityReport(owner(a), { status: 'cancelled,closed' });
    expect(byStatus.rows.map((r) => r.tripId).sort()).toEqual([`${a}-canc`, `${a}-sep`].sort());
  });
}

describe('repos de trips · memoria', () => {
  let repos: TripsRepos;
  beforeEach(() => {
    repos = buildRepos(null);
  });
  contract(() => repos);
});

describeIfDb('repos de trips · Postgres', () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;
  beforeAll(async () => {
    db = await createTestDb(MIGRATIONS, 'trips');
  });
  afterAll(async () => {
    await db?.drop();
  });
  contract(() => buildRepos(db!.pool));

  test('folio y clientUuid son únicos por compañía en la base (no solo en el servicio)', async () => {
    const repos = buildRepos(db!.pool);
    const a = newCompany();
    await repos.trips.create(trip(a, { folio: 'G3-2026-99999' }));
    await expect(repos.trips.create(trip(a, { folio: 'G3-2026-99999' }))).rejects.toMatchObject({ code: '23505' });
    await expect(repos.trips.create(trip(a, { status: 'paid' as never }))).rejects.toMatchObject({ code: '23514' });
    await repos.trips.create(trip(newCompany(), { folio: 'G3-2026-99999' }));
  });

  test('el reporte de rentabilidad es idéntico en memoria y en Postgres', async () => {
    const mem = buildRepos(null);
    const pg = buildRepos(db!.pool);
    const [a, b] = [newCompany(), newCompany()];
    await seedReport(mem, a, b);
    await seedReport(pg, a, b);
    const strip = <T extends { generatedAt: string }>(r: T) => ({ ...r, generatedAt: '' });
    for (const q of [{}, { from: '2026-09-01', to: '2026-09-30' }, { driverId: 'drv_1' }, { status: 'in_transit,closed' }]) {
      const m = await serviceFor(mem).profitabilityReport(owner(a), q);
      const p = await serviceFor(pg).profitabilityReport(owner(a), q);
      expect(strip(p)).toEqual(strip(m));
    }
    expect(await serviceFor(pg).tripProfitability(owner(a), `${a}-sep`)).toEqual(
      await serviceFor(mem).tripProfitability(owner(a), `${a}-sep`),
    );
  });
});
