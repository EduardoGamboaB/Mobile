import {
  authApi,
  subscriptionsApi,
  driversApi,
  tractorsApi,
  trailersApi,
  tripsApi,
  alertsApi,
  aiApi,
} from '../../lib/api/modules';
import { tokenStore } from '../../lib/api/client';
import { fixtures } from '../helpers/fixtures';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';

describe('admin api modules — happy paths', () => {
  let teardown: () => void;
  beforeEach(() => {
    tokenStore.setInMemory({ accessToken: 'tok', refreshToken: 'rfr' });
    window.localStorage.clear();
  });
  afterEach(() => teardown?.());

  test('authApi.login persiste tokens', async () => {
    const m = makeFetchMock().on('POST /api/auth/login', {
      status: 200,
      body: fixtures.session('pro'),
    });
    teardown = installGlobalFetchMock(m);

    const r = await authApi.login({ email: 'admin@acme.mx', password: 'x' });
    expect(r.user.tier).toBe('pro');
    expect(tokenStore.load()?.accessToken).toBe('jwt.pro.access');
  });

  test('subscriptionsApi.catalog', async () => {
    const m = makeFetchMock().on('GET /api/subscriptions/catalog', {
      status: 200,
      body: fixtures.catalog(),
    });
    teardown = installGlobalFetchMock(m);

    const c = await subscriptionsApi.catalog();
    expect(c.find((t) => t.tier === 'pro')?.priceMxn).toBe(899);
  });

  test('driversApi CRUD', async () => {
    const m = makeFetchMock()
      .on('GET /api/drivers', { status: 200, body: [fixtures.driver()] })
      .on('POST /api/drivers', { status: 201, body: fixtures.driver({ id: 'drv_2' }) })
      .on('PATCH /api/drivers/drv_2', {
        status: 200,
        body: fixtures.driver({ id: 'drv_2', status: 'inactive' }),
      })
      .on('DELETE /api/drivers/drv_2', { status: 204 });
    teardown = installGlobalFetchMock(m);

    expect((await driversApi.list())[0].fullName).toBe('Pedro Pérez');
    expect((await driversApi.create({ fullName: 'Otro', phone: '+52' })).id).toBe('drv_2');
    expect((await driversApi.update('drv_2', { status: 'inactive' })).status).toBe('inactive');
    await expect(driversApi.remove('drv_2')).resolves.toBeUndefined();
  });

  test('tractorsApi.livePositions Pro+ ok / Free 402', async () => {
    const m = makeFetchMock()
      .on('GET /api/tractors/live/positions', {
        status: 200,
        body: [
          {
            tractorId: 't1',
            unitNumber: 'T-001',
            lat: 19.4,
            lng: -99.1,
            speedKph: 90,
            headingDeg: 0,
            lastSeenAt: '2026-05-18T08:00:00Z',
          },
        ],
      })
      .on('GET /api/tractors/live/positions', {
        status: 402,
        body: fixtures.upgradeRequired('fleet_map', 'pro'),
      });
    teardown = installGlobalFetchMock(m);

    const ok = await tractorsApi.livePositions();
    expect(ok[0].speedKph).toBe(90);

    await expect(tractorsApi.livePositions()).rejects.toMatchObject({ status: 402 });
  });

  test('trailersApi.create con tipo refrigerado', async () => {
    const m = makeFetchMock().on('POST /api/trailers', {
      status: 201,
      body: fixtures.trailer({ type: 'refrigerado', capacityTons: 25 }),
    });
    teardown = installGlobalFetchMock(m);

    const r = await trailersApi.create({
      unitNumber: 'R-2',
      plates: 'P',
      type: 'refrigerado',
      capacityTons: 25,
    });
    expect(r.type).toBe('refrigerado');
  });

  test('tripsApi.releasePayment ok con tier suficiente', async () => {
    const m = makeFetchMock().on('POST /api/trips/trp_1/release-payment', {
      status: 200,
      body: fixtures.trip({ status: 'paid', paymentReleasedAt: '2026-05-18T10:00:00Z' }),
    });
    teardown = installGlobalFetchMock(m);

    const r = await tripsApi.releasePayment('trp_1');
    expect(r.paymentReleasedAt).toBeTruthy();
  });

  test('tripsApi.list manda query string', async () => {
    const m = makeFetchMock().onAny(
      (req) => req.url.startsWith('https://api.g3.test/api/trips?'),
      { status: 200, body: [fixtures.trip()] },
    );
    teardown = installGlobalFetchMock(m);

    await tripsApi.list({ status: 'in_transit' });
    expect(m.calls[0].url).toContain('status=in_transit');
  });

  test('alertsApi.resolve marca resuelta', async () => {
    const m = makeFetchMock().on('PATCH /api/alerts/alt_1', {
      status: 200,
      body: fixtures.alert({ resolved: true }),
    });
    teardown = installGlobalFetchMock(m);

    const r = await alertsApi.resolve('alt_1');
    expect(r.resolved).toBe(true);
  });

  test('aiApi.driverInsights con tier Pro+', async () => {
    const m = makeFetchMock().on('POST /api/ai/driver-insights', {
      status: 200,
      body: {
        insights: [{ kind: 'praise', text: '0 incidencias en 30 días' }],
      },
    });
    teardown = installGlobalFetchMock(m);

    const r = await aiApi.driverInsights({ driverId: 'drv_1', rangeDays: 30 });
    expect(r.insights).toHaveLength(1);
  });

  test('aiApi.assistantReply con tier Free → 402', async () => {
    const m = makeFetchMock().on('POST /api/ai/assistant-reply', {
      status: 402,
      body: fixtures.upgradeRequired('ai_insights', 'pro'),
    });
    teardown = installGlobalFetchMock(m);

    await expect(
      aiApi.assistantReply({
        history: [{ id: '1', role: 'user', content: 'hi', createdAt: '2026-01-01' }],
      }),
    ).rejects.toMatchObject({ status: 402 });
  });
});
