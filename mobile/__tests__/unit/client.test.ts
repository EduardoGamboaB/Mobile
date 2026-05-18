import { api, tokenStore, onUpgradeRequired, onUnauthorized } from '@/api/g3/client';
import { G3ApiError } from '@/api/g3/types';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';
import { fixtures } from '../helpers/fixtures';

describe('G3 HTTP client', () => {
  let teardown: () => void;

  beforeEach(() => {
    tokenStore.setInMemory({ accessToken: 'token-a', refreshToken: 'token-r' });
  });
  afterEach(() => {
    teardown?.();
  });

  test('inyecta Authorization Bearer en cada request', async () => {
    const m = makeFetchMock().on('GET /api/companies/me', { status: 200, body: fixtures.company() });
    teardown = installGlobalFetchMock(m);

    await api.get('/companies/me');

    expect(m.calls[0].headers.authorization).toBe('Bearer token-a');
  });

  test('serializa query string omitiendo undefined', async () => {
    const m = makeFetchMock().onAny(
      () => true,
      { status: 200, body: [] },
    );
    teardown = installGlobalFetchMock(m);

    await api.get('/trips', { query: { status: 'in_transit', driverId: undefined } });

    expect(m.calls[0].url).toBe('https://api.g3.test/api/trips?status=in_transit');
  });

  test('serializa body JSON en POST', async () => {
    const m = makeFetchMock().on('POST /api/drivers', { status: 201, body: fixtures.driver() });
    teardown = installGlobalFetchMock(m);

    await api.post('/drivers', { fullName: 'Pedro', phone: '+52555' });

    expect(m.calls[0].headers['content-type']).toBe('application/json');
    expect((m.calls[0].body as { fullName: string }).fullName).toBe('Pedro');
  });

  test('204 No Content devuelve undefined sin parsear', async () => {
    const m = makeFetchMock().on('DELETE /api/drivers/drv_1', { status: 204 });
    teardown = installGlobalFetchMock(m);

    const r = await api.delete('/drivers/drv_1');
    expect(r).toBeUndefined();
  });

  test('respuesta 4xx tira G3ApiError con el body completo', async () => {
    const m = makeFetchMock().on('GET /api/trips/x', {
      status: 404,
      body: { statusCode: 404, error: 'Not Found', message: 'trip x no existe' },
    });
    teardown = installGlobalFetchMock(m);

    await expect(api.get('/trips/x')).rejects.toMatchObject({
      status: 404,
      body: { statusCode: 404 },
    });
  });

  test('402 dispara onUpgradeRequired con el payload', async () => {
    const m = makeFetchMock().on('POST /api/trips/t1/release-payment', {
      status: 402,
      body: fixtures.upgradeRequired('payment_authorization', 'starter'),
    });
    teardown = installGlobalFetchMock(m);

    const handler = jest.fn();
    onUpgradeRequired(handler);

    await expect(api.post('/trips/t1/release-payment')).rejects.toBeInstanceOf(G3ApiError);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({
      statusCode: 402,
      suggestedUpgrade: 'starter',
    });
  });

  test('401 intenta refresh y reintenta una vez', async () => {
    const m = makeFetchMock();
    m.on('GET /api/companies/me', {
      status: 401,
      body: { statusCode: 401, error: 'Unauthorized', message: 'expired' },
    });
    m.on('POST /api/auth/refresh', {
      status: 200,
      body: { accessToken: 'token-a2', refreshToken: 'token-r2' },
    });
    m.on('GET /api/companies/me', { status: 200, body: fixtures.company() });
    teardown = installGlobalFetchMock(m);

    const company = await api.get<{ id: string }>('/companies/me');

    expect(company.id).toBe('cmp_test_1');
    const refreshed = await tokenStore.load();
    expect(refreshed?.accessToken).toBe('token-a2');
    // 3 llamadas: 401 original → refresh → 200 reintento
    expect(m.calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'GET https://api.g3.test/api/companies/me',
      'POST https://api.g3.test/api/auth/refresh',
      'GET https://api.g3.test/api/companies/me',
    ]);
  });

  test('401 sin refresh exitoso dispara onUnauthorized', async () => {
    const m = makeFetchMock();
    m.on('GET /api/companies/me', {
      status: 401,
      body: { statusCode: 401, error: 'Unauthorized', message: 'expired' },
    });
    m.on('POST /api/auth/refresh', { status: 401, body: { message: 'invalid refresh' } });
    teardown = installGlobalFetchMock(m);

    const handler = jest.fn();
    onUnauthorized(handler);

    await expect(api.get('/companies/me')).rejects.toBeInstanceOf(G3ApiError);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
