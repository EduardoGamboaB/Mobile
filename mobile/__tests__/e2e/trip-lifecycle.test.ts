/**
 * Flujo end-to-end de un viaje completo con el vocabulario único:
 *   create (scheduled) → loading → in_transit → unloading
 *   → AI extract evidence → pre_closed (precierre) → releasePayment (gated)
 */
import { tripsApi } from '@/api/g3/trips';
import { aiHttp } from '@/api/g3/ai';
import { alertsApi } from '@/api/g3/alerts';
import { tokenStore } from '@/api/g3/client';
import type { TripStatus } from '@/contracts/tripStatus';
import { fixtures } from '../helpers/fixtures';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';

describe('E2E — ciclo completo de un viaje con un usuario Starter', () => {
  let teardown: () => void;

  beforeEach(() => {
    tokenStore.setInMemory({ accessToken: 'tok-starter', refreshToken: 'rfr' });
  });
  afterEach(() => teardown?.());

  test('Starter: crear viaje → cargar → transitar → descargar → precerrar → liberar pago, con OCR', async () => {
    const tripId = 'trp_lifecycle_1';
    const visited: string[] = [];

    const m = makeFetchMock();

    m.on('POST /api/trips', {
      status: 201,
      body: fixtures.trip({ id: tripId, status: 'scheduled' }),
    });
    m.onAny(
      (req) => req.method === 'PATCH' && req.url.endsWith(`/api/trips/${tripId}/status`),
      (req) => {
        const next = (req.body as { status: TripStatus }).status;
        visited.push(next);
        return {
          status: 200,
          body: fixtures.trip({
            id: tripId,
            status: next,
            startedAt: '2026-05-18T08:00:00Z',
            preClosedAt: next === 'pre_closed' ? '2026-05-18T16:00:00Z' : null,
          }),
        };
      },
    );
    m.on('POST /api/ai/extract-evidence', {
      status: 200,
      body: {
        detectedType: 'waybill',
        fields: { folio: 'CP-987', counterpartyName: 'Pemex', amount: 18500 },
        confidence: 0.94,
      },
    });
    m.on('POST /api/trips/' + tripId + '/release-payment', {
      status: 200,
      body: fixtures.trip({
        id: tripId,
        status: 'pre_closed',
        paymentStatus: 'released',
        paymentReleasedAt: '2026-05-18T16:30:00Z',
      }),
    });
    m.on('POST /api/alerts', {
      status: 201,
      body: fixtures.alert({ type: 'late_arrival', level: 'warning' }),
    });

    teardown = installGlobalFetchMock(m);

    const trip = await tripsApi.create({ origin: 'CDMX', destination: 'Tampico', freightAmount: 18500 });
    expect(trip.id).toBe(tripId);
    expect(trip.status).toBe('scheduled');

    const loading = await tripsApi.setStatus(tripId, 'loading');
    expect(loading.startedAt).toBeTruthy();
    await tripsApi.setStatus(tripId, 'in_transit');

    const alert = await alertsApi.create({
      level: 'warning',
      type: 'late_arrival',
      message: 'Probable retraso: tráfico en autopista',
    });
    expect(alert.type).toBe('late_arrival');

    const unloading = await tripsApi.setStatus(tripId, 'unloading');
    expect(unloading.status).toBe('unloading');

    const ocr = await aiHttp.extractEvidence({ photoUri: 'file://cp_signed.jpg' });
    expect(ocr.fields.folio).toBe('CP-987');

    const pre = await tripsApi.setStatus(tripId, 'pre_closed');
    expect(pre.preClosedAt).toBeTruthy();

    // El pago es independiente del estado: el viaje sigue en precierre.
    const paid = await tripsApi.releasePayment(tripId);
    expect(paid.paymentStatus).toBe('released');
    expect(paid.status).toBe('pre_closed');

    expect(visited).toEqual(['loading', 'in_transit', 'unloading', 'pre_closed']);
  });
});
