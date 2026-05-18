/**
 * Flujo end-to-end de un viaje completo:
 *   create → setStatus(assigned) → setStatus(in_transit) → setStatus(arrived)
 *   → AI extract evidence → setStatus(delivered) → releasePayment (gated)
 */
import { tripsApi } from '@/api/g3/trips';
import { aiHttp } from '@/api/g3/ai';
import { alertsApi } from '@/api/g3/alerts';
import { tokenStore } from '@/api/g3/client';
import { fixtures } from '../helpers/fixtures';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';

describe('E2E — ciclo completo de un viaje con un usuario Starter', () => {
  let teardown: () => void;

  beforeEach(() => {
    tokenStore.setInMemory({ accessToken: 'tok-starter', refreshToken: 'rfr' });
  });
  afterEach(() => teardown?.());

  test('Starter: crear viaje → transitar → entregar → liberar pago, con OCR de evidencia', async () => {
    const tripId = 'trp_lifecycle_1';
    let currentStatus: string = 'assigned';

    const m = makeFetchMock();

    // create
    m.on('POST /api/trips', {
      status: 201,
      body: fixtures.trip({ id: tripId, status: 'assigned' }),
    });
    // status transitions dinámicos
    m.onAny(
      (req) => req.method === 'PATCH' && req.url.endsWith(`/api/trips/${tripId}/status`),
      (req) => {
        const next = (req.body as { status: string }).status;
        currentStatus = next;
        return {
          status: 200,
          body: fixtures.trip({
            id: tripId,
            status: next as 'in_transit' | 'arrived' | 'delivered',
            startedAt: next === 'in_transit' ? '2026-05-18T08:00:00Z' : null,
            completedAt: next === 'delivered' ? '2026-05-18T16:00:00Z' : null,
          }),
        };
      },
    );
    // AI evidence
    m.on('POST /api/ai/extract-evidence', {
      status: 200,
      body: {
        detectedType: 'waybill',
        fields: { folio: 'CP-987', counterpartyName: 'Pemex', amount: 18500 },
        confidence: 0.94,
      },
    });
    // releasePayment (Starter+ ok)
    m.on('POST /api/trips/' + tripId + '/release-payment', {
      status: 200,
      body: fixtures.trip({
        id: tripId,
        status: 'paid',
        paymentReleasedAt: '2026-05-18T16:30:00Z',
      }),
    });
    // late arrival alert
    m.on('POST /api/alerts', {
      status: 201,
      body: fixtures.alert({ type: 'late_arrival', level: 'warning' }),
    });

    teardown = installGlobalFetchMock(m);

    const trip = await tripsApi.create({
      origin: 'CDMX',
      destination: 'Tampico',
      freightAmount: 18500,
    });
    expect(trip.id).toBe(tripId);
    expect(trip.status).toBe('assigned');

    const inTransit = await tripsApi.setStatus(tripId, 'in_transit');
    expect(inTransit.status).toBe('in_transit');
    expect(inTransit.startedAt).toBeTruthy();

    // En el camino, levanta una alerta
    const alert = await alertsApi.create({
      level: 'warning',
      type: 'late_arrival',
      message: 'Probable retraso: tráfico en autopista',
    });
    expect(alert.type).toBe('late_arrival');

    const arrived = await tripsApi.setStatus(tripId, 'arrived');
    expect(arrived.status).toBe('arrived');

    // OCR de la carta porte firmada
    const ocr = await aiHttp.extractEvidence({ photoUri: 'file://cp_signed.jpg' });
    expect(ocr.fields.folio).toBe('CP-987');

    const delivered = await tripsApi.setStatus(tripId, 'delivered');
    expect(delivered.status).toBe('delivered');
    expect(delivered.completedAt).toBeTruthy();

    // Liberar pago — Starter ya tiene la feature
    const paid = await tripsApi.releasePayment(tripId);
    expect(paid.paymentReleasedAt).toBeTruthy();
    expect(paid.status).toBe('paid');

    // Asegúrate que el lifecycle pasó por todos los estados
    expect(currentStatus).toBe('delivered');
  });
});
