/**
 * E2E del flujo completo del despachador desde el admin web:
 * login → catalog → onboard driver → create tractor + trailer → asignar viaje
 * → ver live position (Pro+) → liberar pago → ver IA insights del chofer.
 */
import { useAppStore } from '../../lib/store';
import {
  authApi,
  subscriptionsApi,
  driversApi,
  tractorsApi,
  trailersApi,
  tripsApi,
  aiApi,
} from '../../lib/api/modules';
import { tokenStore } from '../../lib/api/client';
import { fixtures } from '../helpers/fixtures';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';

describe('E2E — flujo completo del despachador (Pro)', () => {
  let teardown: () => void;

  beforeEach(() => {
    tokenStore.setInMemory(null);
    window.localStorage.clear();
    useAppStore.setState({
      authed: false,
      tier: 'pro',
      subscription: null,
      userEmail: null,
    });
  });
  afterEach(() => teardown?.());

  test('login → catálogo → CRUD flota → asignar viaje → live → release → insights IA', async () => {
    const m = makeFetchMock()
      // login + tier sync
      .on('POST /api/auth/login', { status: 200, body: fixtures.session('pro') })
      .on('GET /api/subscriptions/me', { status: 200, body: fixtures.subscription('pro') })
      // catálogo público
      .on('GET /api/subscriptions/catalog', { status: 200, body: fixtures.catalog() })
      // crear chofer
      .on('POST /api/drivers', {
        status: 201,
        body: fixtures.driver({ id: 'drv_e2e', fullName: 'Carlos Ramírez' }),
      })
      // crear tracto
      .on('POST /api/tractors', {
        status: 201,
        body: fixtures.tractor({ id: 'trc_e2e', unitNumber: 'T-100' }),
      })
      // crear remolque
      .on('POST /api/trailers', {
        status: 201,
        body: fixtures.trailer({ id: 'trl_e2e', unitNumber: 'R-100', type: 'refrigerado' }),
      })
      // crear viaje
      .on('POST /api/trips', {
        status: 201,
        body: fixtures.trip({
          id: 'trp_e2e',
          driverId: 'drv_e2e',
          tractorId: 'trc_e2e',
          trailerId: 'trl_e2e',
        }),
      })
      // mover a in_transit
      .on('PATCH /api/trips/trp_e2e/status', {
        status: 200,
        body: fixtures.trip({
          id: 'trp_e2e',
          status: 'in_transit',
          startedAt: '2026-05-19T09:00:00Z',
        }),
      })
      // live positions (Pro+ requerido — tier pro sí lo tiene)
      .on('GET /api/tractors/live/positions', {
        status: 200,
        body: [
          {
            tractorId: 'trc_e2e',
            unitNumber: 'T-100',
            lat: 19.5,
            lng: -99.0,
            speedKph: 78,
            headingDeg: 45,
            lastSeenAt: '2026-05-19T11:00:00Z',
          },
        ],
      })
      // entregar
      .on('PATCH /api/trips/trp_e2e/status', {
        status: 200,
        body: fixtures.trip({
          id: 'trp_e2e',
          status: 'delivered',
          completedAt: '2026-05-19T18:00:00Z',
        }),
      })
      // liberar pago (Starter+ — pro lo tiene)
      .on('POST /api/trips/trp_e2e/release-payment', {
        status: 200,
        body: fixtures.trip({
          id: 'trp_e2e',
          status: 'paid',
          paymentReleasedAt: '2026-05-19T18:30:00Z',
        }),
      })
      // insights del chofer
      .on('POST /api/ai/driver-insights', {
        status: 200,
        body: {
          insights: [
            { kind: 'praise', text: '0 incidencias en 30 días' },
            { kind: 'info', text: 'Consumo promedio 3.1 km/l' },
          ],
        },
      });
    teardown = installGlobalFetchMock(m);

    // 1) Login y sync
    await useAppStore.getState().signInG3('admin@acme.mx', 'x');
    expect(useAppStore.getState().authed).toBe(true);
    expect(useAppStore.getState().tier).toBe('pro');
    expect(useAppStore.getState().subscription?.status).toBe('active');

    // 2) Catálogo (vista de Plans / billing)
    const catalog = await subscriptionsApi.catalog();
    expect(catalog).toHaveLength(3);

    // 3) Onboarding de chofer
    const driver = await driversApi.create({
      fullName: 'Carlos Ramírez',
      phone: '+525555550010',
    });
    expect(driver.id).toBe('drv_e2e');

    // 4) Alta de tracto + remolque
    const tractor = await tractorsApi.create({ unitNumber: 'T-100', plates: 'ABC-12-34' });
    expect(tractor.id).toBe('trc_e2e');
    const trailer = await trailersApi.create({
      unitNumber: 'R-100',
      plates: 'DEF-12-34',
      type: 'refrigerado',
    });
    expect(trailer.type).toBe('refrigerado');

    // 5) Crear y asignar viaje
    const trip = await tripsApi.create({
      origin: 'CDMX',
      destination: 'Tampico',
      driverId: driver.id,
      tractorId: tractor.id,
      trailerId: trailer.id,
      freightAmount: 22000,
    });
    expect(trip.id).toBe('trp_e2e');

    // 6) Mover a tránsito
    const transit = await tripsApi.setStatus(trip.id, 'in_transit');
    expect(transit.status).toBe('in_transit');

    // 7) Monitor en vivo (FleetMap — Pro+)
    const live = await tractorsApi.livePositions();
    expect(live[0].lat).toBe(19.5);

    // 8) Entregado y pago liberado
    const delivered = await tripsApi.setStatus(trip.id, 'delivered');
    expect(delivered.status).toBe('delivered');
    const paid = await tripsApi.releasePayment(trip.id);
    expect(paid.paymentReleasedAt).toBeTruthy();

    // 9) IA: insights del chofer (Pro+)
    const insights = await aiApi.driverInsights({ driverId: driver.id, rangeDays: 30 });
    expect(insights.insights).toHaveLength(2);
    expect(insights.insights[0].kind).toBe('praise');
  });
});
