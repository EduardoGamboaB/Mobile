import { api, tokenStore, onUpgradeRequired, onUnauthorized } from '../../lib/api/client';
import { G3ApiError } from '../../lib/api/types';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';
import { fixtures } from '../helpers/fixtures';

describe('G3 HTTP client (admin)', () => {
  let teardown: () => void;
  beforeEach(() => {
    tokenStore.setInMemory({ accessToken: 'token-a', refreshToken: 'token-r' });
    window.localStorage.clear();
  });
  afterEach(() => teardown?.());

  test('inyecta Authorization Bearer', async () => {
    const m = makeFetchMock().on('GET /api/companies/me', { status: 200, body: fixtures.company() });
    teardown = installGlobalFetchMock(m);

    await api.get('/companies/me');
    expect(m.calls[0].headers.authorization).toBe('Bearer token-a');
  });

  test('persiste tokens en localStorage al guardar', () => {
    tokenStore.setInMemory(null);
    tokenStore.save({ accessToken: 'a1', refreshToken: 'r1' });
    expect(window.localStorage.getItem('g3admin.tokens.v1')).toContain('a1');
  });

  test('402 dispara onUpgradeRequired', async () => {
    const m = makeFetchMock().on('GET /api/tractors/live/positions', {
      status: 402,
      body: fixtures.upgradeRequired('fleet_map', 'pro'),
    });
    teardown = installGlobalFetchMock(m);

    const handler = jest.fn();
    onUpgradeRequired(handler);

    await expect(api.get('/tractors/live/positions')).rejects.toBeInstanceOf(G3ApiError);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 402, suggestedUpgrade: 'pro' }),
    );
  });

  test('refresca el token en 401 y reintenta', async () => {
    const m = makeFetchMock();
    m.on('GET /api/companies/me', {
      status: 401,
      body: { statusCode: 401, error: 'Unauthorized', message: 'expired' },
    });
    m.on('POST /api/auth/refresh', {
      status: 200,
      body: { accessToken: 'a2', refreshToken: 'r2' },
    });
    m.on('GET /api/companies/me', { status: 200, body: fixtures.company() });
    teardown = installGlobalFetchMock(m);

    const c = await api.get<{ id: string }>('/companies/me');
    expect(c.id).toBe('cmp_test_1');
    expect(tokenStore.load()?.accessToken).toBe('a2');
  });

  test('401 sin refresh viable dispara onUnauthorized', async () => {
    const m = makeFetchMock();
    m.on('GET /api/companies/me', {
      status: 401,
      body: { statusCode: 401, error: 'Unauthorized', message: 'expired' },
    });
    m.on('POST /api/auth/refresh', {
      status: 401,
      body: { statusCode: 401, message: 'refresh invalid' },
    });
    teardown = installGlobalFetchMock(m);

    const handler = jest.fn();
    onUnauthorized(handler);

    await expect(api.get('/companies/me')).rejects.toBeInstanceOf(G3ApiError);
    expect(handler).toHaveBeenCalled();
  });
});
