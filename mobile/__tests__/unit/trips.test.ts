import { tripsApi } from '@/api/g3/trips';
import { tokenStore } from '@/api/g3/client';
import { fixtures } from '../helpers/fixtures';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';

describe('tripsApi', () => {
  let teardown: () => void;
  beforeEach(() => tokenStore.setInMemory({ accessToken: 'tok', refreshToken: 'rfr' }));
  afterEach(() => teardown?.());

  test('list con filtros agrega query string', async () => {
    const m = makeFetchMock().onAny(
      (req) => req.url.startsWith('https://api.g3.test/api/trips?'),
      { status: 200, body: [fixtures.trip()] },
    );
    teardown = installGlobalFetchMock(m);

    await tripsApi.list({ status: 'in_transit', driverId: 'drv_1' });
    expect(m.calls[0].url).toContain('status=in_transit');
    expect(m.calls[0].url).toContain('driverId=drv_1');
  });

  test('create envía origin + destination', async () => {
    const m = makeFetchMock().on('POST /api/trips', {
      status: 201,
      body: fixtures.trip({ folio: 'G3-2026-00002' }),
    });
    teardown = installGlobalFetchMock(m);

    const r = await tripsApi.create({ origin: 'CDMX', destination: 'Monterrey' });
    expect(r.folio).toMatch(/^G3-2026-/);
  });

  test('setStatus parchea sólo el status', async () => {
    const m = makeFetchMock().on('PATCH /api/trips/trp_test_1/status', {
      status: 200,
      body: fixtures.trip({ status: 'in_transit' }),
    });
    teardown = installGlobalFetchMock(m);

    const r = await tripsApi.setStatus('trp_test_1', 'in_transit');
    expect(r.status).toBe('in_transit');
    expect(m.calls[0].body).toEqual({ status: 'in_transit' });
  });

  test('releasePayment con tier Starter+ marca paymentReleasedAt', async () => {
    const m = makeFetchMock().on('POST /api/trips/trp_test_1/release-payment', {
      status: 200,
      body: fixtures.trip({
        status: 'pre_closed',
        paymentStatus: 'released',
        paymentReleasedAt: '2026-05-18T10:00:00Z',
      }),
    });
    teardown = installGlobalFetchMock(m);

    const r = await tripsApi.releasePayment('trp_test_1');
    expect(r.paymentReleasedAt).toBeTruthy();
  });

  test('releasePayment con tier Free → 402 con missingFeatures', async () => {
    const m = makeFetchMock().on('POST /api/trips/trp_test_1/release-payment', {
      status: 402,
      body: fixtures.upgradeRequired('payment_authorization', 'starter'),
    });
    teardown = installGlobalFetchMock(m);

    await expect(tripsApi.releasePayment('trp_test_1')).rejects.toMatchObject({
      status: 402,
      body: { missingFeatures: ['payment_authorization'] },
    });
  });
});
