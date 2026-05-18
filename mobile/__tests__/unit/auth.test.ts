import { authApi } from '@/api/g3/auth';
import { tokenStore } from '@/api/g3/client';
import { G3ApiError } from '@/api/g3/types';
import { fixtures } from '../helpers/fixtures';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';

describe('authApi', () => {
  let teardown: () => void;

  beforeEach(() => {
    tokenStore.setInMemory(null);
  });
  afterEach(() => {
    teardown?.();
  });

  test('login persiste el JWT y devuelve la sesión', async () => {
    const m = makeFetchMock().on('POST /api/auth/login', { status: 200, body: fixtures.session('starter') });
    teardown = installGlobalFetchMock(m);

    const res = await authApi.login({ email: 'owner@acme.mx', password: 'secret' });

    expect(res.user.companyId).toBe('cmp_test_1');
    expect(res.user.tier).toBe('starter');
    expect(m.calls[0].url).toBe('https://api.g3.test/api/auth/login');
    expect((m.calls[0].body as { email: string }).email).toBe('owner@acme.mx');

    const stored = await tokenStore.load();
    expect(stored?.accessToken).toBe('jwt.starter.access');
  });

  test('login con credenciales inválidas tira G3ApiError 401', async () => {
    const m = makeFetchMock().on('POST /api/auth/login', {
      status: 401,
      body: { statusCode: 401, error: 'Unauthorized', message: 'Credenciales incorrectas' },
    });
    teardown = installGlobalFetchMock(m);

    await expect(authApi.login({ email: 'x@y.z', password: 'wrong' })).rejects.toBeInstanceOf(
      G3ApiError,
    );
  });

  test('registerCompany crea compañía y guarda tokens', async () => {
    const m = makeFetchMock().on('POST /api/auth/register-company', {
      status: 201,
      body: fixtures.session('free'),
    });
    teardown = installGlobalFetchMock(m);

    const res = await authApi.registerCompany({
      companyName: 'Acme',
      contactEmail: 'owner@acme.mx',
      ownerName: 'Pedro',
      password: 'super-secret-32-chars-min-aaaaaaaa',
    });

    expect(res.user.role).toBe('owner');
    expect((await tokenStore.load())?.accessToken).toBe('jwt.free.access');
  });

  test('logout limpia los tokens', async () => {
    await tokenStore.save({ accessToken: 'a', refreshToken: 'r' });
    await authApi.logout();
    expect(await tokenStore.load()).toBeNull();
  });
});
