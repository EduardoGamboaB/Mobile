import type { INestApplication } from '@nestjs/common';
import type { TripDto } from '@g3/contracts';
import { TripsService } from '../src/trips.service';
import { InMemoryTripRepo } from '../src/in-memory.trip.repo';
import {
  InMemoryEvidenceRepo,
  InMemoryExpensePolicyRepo,
  InMemoryLogbookRepo,
  StubEvidenceStorage,
} from '../src/in-memory.ops.repo';
import { RecordingEventBus } from '../src/event.bus';
import { createTripsApp } from '../src/main';

function trip(over: Partial<TripDto>): TripDto {
  const now = '2026-09-10T08:00:00.000Z';
  return {
    id: 't_x', companyId: 'cmp_1', folio: 'G3-2026-00000', status: 'scheduled',
    driverId: null, tractorId: null, trailerId: null, clientName: null, cargo: null,
    origin: 'A', destination: 'B', scheduledAt: now, estimatedUnloadAt: null,
    tons: null, pricePerTon: null, freightAmount: null, driverCommission: null,
    estimatedTolls: null, estimatedDiesel: null, notes: null,
    startedAt: null, preClosedAt: null, closedAt: null, cancelledAt: null,
    paymentStatus: 'pending', paymentReleasedAt: null, createdAt: now, updatedAt: now,
    ...over,
  };
}

function build() {
  const repo = new InMemoryTripRepo();
  const svc = new TripsService(repo, new RecordingEventBus(), {
    logbook: new InMemoryLogbookRepo(),
    evidences: new InMemoryEvidenceRepo(),
    policies: new InMemoryExpensePolicyRepo(),
    storage: new StubEvidenceStorage(),
  });
  return { svc, repo };
}

describe('activeTripByVehicle (interno, para fleet → alerts)', () => {
  test('encuentra el viaje activo por tracto o por remolque, aislado por compañía', async () => {
    const { svc, repo } = build();
    await repo.create(trip({ id: 't1', status: 'in_transit', tractorId: 'trc_1', trailerId: 'trl_1', driverId: 'drv_1' }));
    await repo.create(trip({ id: 't2', companyId: 'cmp_2', status: 'in_transit', tractorId: 'trc_9' }));

    expect((await svc.activeTripByVehicle('cmp_1', 'trc_1'))?.id).toBe('t1');
    expect((await svc.activeTripByVehicle('cmp_1', 'trl_1'))?.driverId).toBe('drv_1');
    expect(await svc.activeTripByVehicle('cmp_1', 'trc_9')).toBeNull();
    expect(await svc.activeTripByVehicle('cmp_2', 'trc_1')).toBeNull();
  });

  test('ignora viajes cerrados, cancelados o en borrador', async () => {
    const { svc, repo } = build();
    await repo.create(trip({ id: 'c', status: 'closed', tractorId: 'trc_1' }));
    await repo.create(trip({ id: 'x', status: 'cancelled', tractorId: 'trc_1' }));
    await repo.create(trip({ id: 'd', status: 'draft', tractorId: 'trc_1' }));
    expect(await svc.activeTripByVehicle('cmp_1', 'trc_1')).toBeNull();
  });

  test('con varios activos prefiere el que está en movimiento sobre el programado o precerrado', async () => {
    const { svc, repo } = build();
    await repo.create(trip({ id: 'sched', status: 'scheduled', tractorId: 'trc_1', updatedAt: '2026-09-12T00:00:00.000Z' }));
    await repo.create(trip({ id: 'pre', status: 'pre_closed', tractorId: 'trc_1', updatedAt: '2026-09-11T00:00:00.000Z' }));
    await repo.create(trip({ id: 'moving', status: 'loading', tractorId: 'trc_1', updatedAt: '2026-09-09T00:00:00.000Z' }));
    expect((await svc.activeTripByVehicle('cmp_1', 'trc_1'))?.id).toBe('moving');
  });
});

describe('HTTP GET /trips/internal/active-by-vehicle/:vehicleId', () => {
  const TOKEN = 'i'.repeat(40);
  let app: INestApplication;
  let base: string;
  const prev = process.env.INTERNAL_TOKEN;

  beforeAll(async () => {
    process.env.INTERNAL_TOKEN = TOKEN;
    app = await createTripsApp({ logger: false });
    await app.listen(0, '127.0.0.1');
    base = `${await app.getUrl()}/api`;
  });
  afterAll(async () => {
    await app.close();
    if (prev === undefined) delete process.env.INTERNAL_TOKEN;
    else process.env.INTERNAL_TOKEN = prev;
  });

  const owner = { 'x-company-id': 'cmp_http', 'x-tier': 'starter', 'x-user-role': 'owner', 'content-type': 'application/json' };

  test('con token devuelve el viaje activo; 404 si no hay; 401 sin token o con token malo', async () => {
    const created = await fetch(`${base}/trips`, {
      method: 'POST',
      headers: owner,
      body: JSON.stringify({ origin: 'Tula', destination: 'Tampico', tractorId: 'trc_h', driverId: 'drv_h' }),
    });
    expect(created.status).toBe(201);
    const t = (await created.json()) as TripDto;

    const ok = await fetch(`${base}/trips/internal/active-by-vehicle/trc_h?companyId=cmp_http`, {
      headers: { 'x-internal-token': TOKEN },
    });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ id: t.id, driverId: 'drv_h', tractorId: 'trc_h' });

    const none = await fetch(`${base}/trips/internal/active-by-vehicle/trc_zz?companyId=cmp_http`, {
      headers: { 'x-internal-token': TOKEN },
    });
    expect(none.status).toBe(404);

    const otherCompany = await fetch(`${base}/trips/internal/active-by-vehicle/trc_h?companyId=cmp_otro`, {
      headers: { 'x-internal-token': TOKEN },
    });
    expect(otherCompany.status).toBe(404);

    const noToken = await fetch(`${base}/trips/internal/active-by-vehicle/trc_h?companyId=cmp_http`);
    expect(noToken.status).toBe(401);
    const badToken = await fetch(`${base}/trips/internal/active-by-vehicle/trc_h?companyId=cmp_http`, {
      headers: { 'x-internal-token': 'i'.repeat(39) + 'x' },
    });
    expect(badToken.status).toBe(401);
  });

  test('companyId es obligatorio (400)', async () => {
    const r = await fetch(`${base}/trips/internal/active-by-vehicle/trc_h`, { headers: { 'x-internal-token': TOKEN } });
    expect(r.status).toBe(400);
  });
});
