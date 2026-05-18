import { driversApi } from '@/api/g3/drivers';
import { tokenStore } from '@/api/g3/client';
import { fixtures } from '../helpers/fixtures';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';

describe('driversApi', () => {
  let teardown: () => void;
  beforeEach(() => tokenStore.setInMemory({ accessToken: 'tok', refreshToken: 'rfr' }));
  afterEach(() => teardown?.());

  test('list devuelve el array de drivers', async () => {
    const m = makeFetchMock().on('GET /api/drivers', {
      status: 200,
      body: [fixtures.driver(), fixtures.driver({ id: 'drv_2', fullName: 'Juan' })],
    });
    teardown = installGlobalFetchMock(m);

    const list = await driversApi.list();
    expect(list).toHaveLength(2);
    expect(list[1].fullName).toBe('Juan');
  });

  test('create envía el payload y devuelve el driver creado', async () => {
    const m = makeFetchMock().on('POST /api/drivers', {
      status: 201,
      body: fixtures.driver({ id: 'drv_new', fullName: 'Nuevo' }),
    });
    teardown = installGlobalFetchMock(m);

    const r = await driversApi.create({ fullName: 'Nuevo', phone: '+52555' });
    expect(r.id).toBe('drv_new');
  });

  test('create con tier en el límite devuelve 400 con mensaje de upgrade', async () => {
    const m = makeFetchMock().on('POST /api/drivers', {
      status: 400,
      body: {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Tu plan Free permite máximo 1 usuario. Sube a Starter para invitar más.',
      },
    });
    teardown = installGlobalFetchMock(m);

    await expect(driversApi.create({ fullName: 'Tope', phone: '+52' })).rejects.toMatchObject({
      status: 400,
    });
  });

  test('update parchea sólo los campos enviados', async () => {
    const m = makeFetchMock().on('PATCH /api/drivers/drv_1', {
      status: 200,
      body: fixtures.driver({ status: 'inactive' }),
    });
    teardown = installGlobalFetchMock(m);

    const r = await driversApi.update('drv_1', { status: 'inactive' });
    expect(r.status).toBe('inactive');
    expect(m.calls[0].body).toEqual({ status: 'inactive' });
  });

  test('remove envía DELETE y no espera body', async () => {
    const m = makeFetchMock().on('DELETE /api/drivers/drv_1', { status: 204 });
    teardown = installGlobalFetchMock(m);

    await expect(driversApi.remove('drv_1')).resolves.toBeUndefined();
  });
});
