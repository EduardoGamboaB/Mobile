/**
 * Listado y detalle de viajes con backend (isLive): la pantalla usa la API
 * (viajes, bitácora, evidencias, chofer, tracto) y no demoData.
 */
import {
  demoTripDetail,
  demoTripList,
  getTripDetail,
  getTripList,
  loadTripDetail,
  tripHref,
} from '../../lib/trips';
import { profitabilityApi } from '../../lib/api/modules';
import { tokenStore } from '../../lib/api/client';
import type { EvidenceDTO } from '../../lib/api/types';
import { fixtures } from '../helpers/fixtures';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';

const API = 'https://api.g3.test/api';

const evidence = (over: Partial<EvidenceDTO> = {}): EvidenceDTO => ({
  id: 'ev_1',
  companyId: 'cmp_test_1',
  clientUuid: 'cu_ev_1',
  tripId: 'trp_test_1',
  logbookId: null,
  incidentId: null,
  driverId: 'drv_test_1',
  type: 'scale_ticket',
  storagePath: 'cmp_test_1/trp_test_1/ev_1.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1000,
  lat: null,
  lng: null,
  takenAt: '2026-05-19T09:00:00Z',
  createdAt: '2026-05-19T09:00:01Z',
  ...over,
});

describe('viajes con backend', () => {
  let teardown: () => void;
  beforeEach(() => tokenStore.setInMemory({ accessToken: 'tok', refreshToken: 'rfr' }));
  afterEach(() => teardown?.());

  test('listado: GET /trips + nombres de chofer y tracto', async () => {
    const m = makeFetchMock()
      .on('GET /api/trips', { body: [fixtures.trip(), fixtures.trip({ id: 'trp_2', driverId: null, tractorId: null, clientName: null })] })
      .on('GET /api/drivers', { body: [fixtures.driver()] })
      .on('GET /api/tractors', { body: [fixtures.tractor()] });
    teardown = installGlobalFetchMock(m);

    const list = await getTripList();
    expect(m.calls.map((c) => c.url).sort()).toEqual([`${API}/drivers`, `${API}/tractors`, `${API}/trips`]);
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({
      id: 'trp_test_1',
      folio: 'G3-2026-00001',
      client: 'Cementos Mexicanos',
      loadDate: '2026-05-19T08:00:00Z',
      driver: { name: 'Pedro Pérez', initials: 'PP', score: null },
      unit: { number: 'T-001', plates: 'XXX-12-34', health: null },
      inspectionPct: null,
    });
    expect(list[1]).toMatchObject({ client: 'Sin cliente', driver: null, unit: null });
  });

  test('listado: si choferes/tractos fallan, los viajes igual se muestran', async () => {
    const m = makeFetchMock()
      .on('GET /api/trips', { body: [fixtures.trip()] })
      .on('GET /api/drivers', { status: 500, body: { message: 'boom' } })
      .on('GET /api/tractors', { status: 500, body: { message: 'boom' } });
    teardown = installGlobalFetchMock(m);
    const list = await getTripList();
    expect(list[0].driver).toBeNull();
  });

  test('listado: error de /trips se propaga (la pantalla muestra Reintentar)', async () => {
    const m = makeFetchMock()
      .on('GET /api/trips', { status: 503, body: { statusCode: 503, error: 'Unavailable', message: 'trips caído' } })
      .on('GET /api/drivers', { body: [] })
      .on('GET /api/tractors', { body: [] });
    teardown = installGlobalFetchMock(m);
    await expect(getTripList()).rejects.toMatchObject({ status: 503 });
  });

  test('detalle: viaje + bitácora ordenada + evidencias + chofer + tracto', async () => {
    const m = makeFetchMock()
      .on('GET /api/trips/trp_test_1', { body: fixtures.trip({ status: 'in_transit' }) })
      .on('GET /api/trips/trp_test_1/logbook', {
        body: [
          fixtures.logbookEntry({ id: 'lb_2', occurredAt: '2026-05-19T12:00:00Z', eventType: 'diesel', locationText: null, expenseHasReceipt: false }),
          fixtures.logbookEntry({ id: 'lb_1', occurredAt: '2026-05-19T10:00:00Z' }),
        ],
      })
      .on('GET /api/trips/trp_test_1/evidences', { body: [evidence(), evidence({ id: 'ev_2', type: 'toll_ticket', takenAt: null })] })
      .on('GET /api/drivers/drv_test_1', { body: fixtures.driver() })
      .on('GET /api/tractors/trc_test_1', { body: fixtures.tractor() });
    teardown = installGlobalFetchMock(m);

    const d = await getTripDetail('trp_test_1');
    expect(d).not.toBeNull();
    expect(d!.trip).toMatchObject({ status: 'in_transit', evidenceCount: 2, driver: { phone: '+525555550001' } });
    expect(d!.trip.unit?.description).toBe('Kenworth T680 2022');
    expect(d!.logbook.map((e) => e.id)).toEqual(['lb_1', 'lb_2']);
    expect(d!.logbook[1]).toMatchObject({ locationText: 'Sin ubicación', expenseHasReceipt: false });
    expect(d!.evidences!.map((e) => e.type)).toEqual(['scale_ticket', 'toll_ticket']);
    expect(d!.evidences![1].takenAt).toBe('2026-05-19T09:00:01Z');
    expect(d!.warnings).toEqual([]);
  });

  test('detalle: 404 → null (Viaje no encontrado)', async () => {
    const m = makeFetchMock().on('GET /api/trips/nope', {
      status: 404,
      body: { statusCode: 404, error: 'Not Found', message: 'Viaje no encontrado' },
    });
    teardown = installGlobalFetchMock(m);
    expect(await getTripDetail('nope')).toBeNull();
  });

  test('detalle: bitácora/evidencias caídas no tumban el viaje (avisos)', async () => {
    const m = makeFetchMock()
      .on('GET /api/trips/trp_test_1', { body: fixtures.trip({ driverId: null, tractorId: null }) })
      .on('GET /api/trips/trp_test_1/logbook', { status: 500, body: { message: 'x' } })
      .on('GET /api/trips/trp_test_1/evidences', { status: 500, body: { message: 'x' } });
    teardown = installGlobalFetchMock(m);
    const d = await loadTripDetail('trp_test_1');
    expect(d!.logbook).toEqual([]);
    expect(d!.evidences).toBeNull();
    expect(d!.trip.evidenceCount).toBeNull();
    expect(d!.warnings).toHaveLength(2);
    // Sin chofer ni tracto no se piden.
    expect(m.calls.some((c) => c.url.includes('/drivers/') || c.url.includes('/tractors/'))).toBe(false);
  });

  test('detalle: error del viaje (no 404) se propaga', async () => {
    const m = makeFetchMock().on('GET /api/trips/trp_test_1', { status: 500, body: { message: 'x' } });
    teardown = installGlobalFetchMock(m);
    await expect(loadTripDetail('trp_test_1')).rejects.toMatchObject({ status: 500 });
  });

  test('la rentabilidad del detalle sigue usando /trips/:id/profitability', async () => {
    const m = makeFetchMock().on('GET /api/trips/trp_test_1/profitability', { body: fixtures.tripProfitability() });
    teardown = installGlobalFetchMock(m);
    expect((await profitabilityApi.trip('trp_test_1')).profit).toBe(11400);
  });

  test('enlaces: con backend usan /trips/view/?id= (export estático)', () => {
    expect(tripHref('a b', true)).toBe('/trips/view/?id=a%20b');
    expect(tripHref('t1', false)).toBe('/trips/t1/');
  });

  test('demo intacto: mismos viajes de demoData con chofer/tracto e inspección', () => {
    const list = demoTripList();
    expect(list.length).toBeGreaterThan(5);
    expect(list[0].driver?.score).not.toBeNull();
    const d = demoTripDetail('t1')!;
    expect(d.trip.inspectionPct).toBe(100);
    expect(d.logbook.length).toBeGreaterThan(0);
    expect(demoTripDetail('zzz')).toBeNull();
  });
});
