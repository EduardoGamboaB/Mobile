import { trailersApi } from '@/api/g3/trailers';
import { alertsApi } from '@/api/g3/alerts';
import { tokenStore } from '@/api/g3/client';
import { fixtures } from '../helpers/fixtures';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';

describe('trailersApi', () => {
  let teardown: () => void;
  beforeEach(() => tokenStore.setInMemory({ accessToken: 'tok', refreshToken: 'rfr' }));
  afterEach(() => teardown?.());

  test('list devuelve remolques', async () => {
    const m = makeFetchMock().on('GET /api/trailers', {
      status: 200,
      body: [fixtures.trailer()],
    });
    teardown = installGlobalFetchMock(m);

    const r = await trailersApi.list();
    expect(r[0].type).toBe('caja_53');
  });

  test('create con tipo refrigerado', async () => {
    const m = makeFetchMock().on('POST /api/trailers', {
      status: 201,
      body: fixtures.trailer({ type: 'refrigerado', capacityTons: 28 }),
    });
    teardown = installGlobalFetchMock(m);

    const r = await trailersApi.create({
      unitNumber: 'R-002',
      plates: 'BBB-12-34',
      type: 'refrigerado',
      capacityTons: 28,
    });
    expect(r.type).toBe('refrigerado');
  });
});

describe('alertsApi', () => {
  let teardown: () => void;
  beforeEach(() => tokenStore.setInMemory({ accessToken: 'tok', refreshToken: 'rfr' }));
  afterEach(() => teardown?.());

  test('list con resolved=false filtra abiertas', async () => {
    const m = makeFetchMock().onAny(
      (req) => req.url.startsWith('https://api.g3.test/api/alerts?'),
      { status: 200, body: [fixtures.alert()] },
    );
    teardown = installGlobalFetchMock(m);

    const r = await alertsApi.list({ resolved: false });
    expect(r[0].resolved).toBe(false);
    expect(m.calls[0].url).toContain('resolved=false');
  });

  test('create envía alerta SOS', async () => {
    const m = makeFetchMock().on('POST /api/alerts', {
      status: 201,
      body: fixtures.alert({ type: 'sos', level: 'critical' }),
    });
    teardown = installGlobalFetchMock(m);

    const r = await alertsApi.create({
      level: 'critical',
      type: 'sos',
      message: 'SOS — falla mecánica',
    });
    expect(r.type).toBe('sos');
    expect(r.level).toBe('critical');
  });

  test('resolve marca la alerta como resuelta', async () => {
    const m = makeFetchMock().on('PATCH /api/alerts/alt_test_1', {
      status: 200,
      body: fixtures.alert({ resolved: true }),
    });
    teardown = installGlobalFetchMock(m);

    const r = await alertsApi.resolve('alt_test_1');
    expect(r.resolved).toBe(true);
    expect(m.calls[0].body).toEqual({ resolved: true });
  });
});
