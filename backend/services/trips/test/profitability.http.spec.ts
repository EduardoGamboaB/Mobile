import type { INestApplication } from '@nestjs/common';
import { createTripsApp } from '../src/main';

/**
 * HTTP: `/trips/profitability` no debe confundirse con `/trips/:id`
 * (la ruta se declara antes en el controller).
 */
const owner = {
  'x-company-id': 'cmp_http',
  'x-tier': 'starter',
  'x-user-role': 'owner',
  'content-type': 'application/json',
};

describe('trips HTTP: rentabilidad', () => {
  let app: INestApplication;
  let base: string;

  beforeAll(async () => {
    app = await createTripsApp({ logger: false });
    await app.listen(0, '127.0.0.1');
    base = `${await app.getUrl()}/api`;
  });
  afterAll(async () => {
    await app.close();
  });

  const call = async (method: string, path: string, body?: unknown) => {
    const r = await fetch(`${base}${path}`, {
      method,
      headers: owner,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await r.text();
    return { status: r.status, body: text ? JSON.parse(text) : null };
  };

  test('GET /trips/profitability devuelve el reporte (no busca un viaje "profitability")', async () => {
    const created = await call('POST', '/trips', {
      origin: 'Tula', destination: 'Tampico', scheduledAt: '2026-09-10T08:00:00.000Z',
      freightAmount: 40000, driverCommission: 4000, estimatedTolls: 1800, estimatedDiesel: 6000,
    });
    expect(created.status).toBe(201);
    const lb = await call('POST', `/trips/${created.body.id}/logbook`, {
      clientUuid: 'cu_http_1', driverId: 'drv_1', eventType: 'toll', occurredAt: '2026-09-10T10:00:00.000Z',
      locationText: null, lat: null, lng: null, odometerKm: null, fuel: null,
      expenseAmount: 250, expenseConcept: 'Caseta', expenseHasReceipt: true, comments: null,
    });
    expect(lb.status).toBe(201);

    const report = await call('GET', '/trips/profitability?from=2026-09-01&to=2026-09-30');
    expect(report.status).toBe(200);
    expect(report.body.totals).toMatchObject({ trips: 1, revenue: 40000, tolls: 250 });
    expect(report.body.rows[0].tripId).toBe(created.body.id);

    const one = await call('GET', `/trips/${created.body.id}/profitability`);
    expect(one.status).toBe(200);
    expect(one.body).toMatchObject({ tripId: created.body.id, profit: 40000 - 250 - 4000 });
  });
});
