import { createDemoTelemetry, ingestUrl, telemetryHttp } from '../../lib/telemetry';
import {
  createDemoDriverAccess,
  driverAccessErrorMessage,
  driverAccessHttp,
  phoneError,
} from '../../lib/driverAccess';
import { tokenStore } from '../../lib/api/client';
import { G3ApiError } from '../../lib/api/types';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';

const API = 'https://api.g3.test/api';

describe('telemetría GPS — tokens de ingesta', () => {
  let teardown: () => void;
  beforeEach(() => tokenStore.setInMemory({ accessToken: 'tok', refreshToken: 'rfr' }));
  afterEach(() => teardown?.());

  test('cliente HTTP: listar, crear (con etiqueta), revocar y desconocidos', async () => {
    const tokenDto = { id: 'itk1', companyId: 'c', prefix: 'g3it_abcdefg', label: 'Suntech', createdAt: 'x', revokedAt: null };
    const m = makeFetchMock()
      .on('GET /api/telemetry/ingest-tokens', { body: [tokenDto] })
      .on('POST /api/telemetry/ingest-tokens', { status: 201, body: { ...tokenDto, token: 'g3it_secreto' } })
      .on('DELETE /api/telemetry/ingest-tokens/itk1', { body: { ...tokenDto, revokedAt: 'y' } })
      .on('GET /api/telemetry/unknown-devices', {
        body: [{ provider: 'queclink', externalId: '8605', hits: 2, lastSeenAt: 'z' }],
      });
    teardown = installGlobalFetchMock(m);

    expect(await telemetryHttp.listTokens()).toHaveLength(1);
    const created = await telemetryHttp.createToken('  Suntech  ');
    expect(created.token).toBe('g3it_secreto');
    expect((await telemetryHttp.revokeToken('itk1')).revokedAt).toBe('y');
    expect((await telemetryHttp.unknownDevices())[0].externalId).toBe('8605');

    expect(m.calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      `GET ${API}/telemetry/ingest-tokens`,
      `POST ${API}/telemetry/ingest-tokens`,
      `DELETE ${API}/telemetry/ingest-tokens/itk1`,
      `GET ${API}/telemetry/unknown-devices`,
    ]);
    expect(m.calls[1].body).toEqual({ label: 'Suntech' });
  });

  test('sin etiqueta manda cuerpo vacío', async () => {
    const m = makeFetchMock().on('POST /api/telemetry/ingest-tokens', { status: 201, body: {} });
    teardown = installGlobalFetchMock(m);
    await telemetryHttp.createToken('   ');
    expect(m.calls[0].body).toEqual({});
  });

  test('URL del webhook por proveedor vía gateway', () => {
    expect(ingestUrl('suntech')).toBe(`${API}/telemetry/ingest/suntech`);
    expect(ingestUrl('generic', 'https://gw.g3.mx/')).toBe('https://gw.g3.mx/api/telemetry/ingest/generic');
  });

  test('demo: el token completo solo sale al crearlo; la lista guarda el prefijo', async () => {
    const b = createDemoTelemetry();
    const t = await b.createToken('Middleware flespi');
    expect(t.token).toMatch(/^g3it_[A-Za-z0-9_-]{32}$/);
    expect(t.prefix).toBe(t.token.slice(0, 12));
    const list = await b.listTokens();
    expect(list[0]).not.toHaveProperty('token');
    expect(JSON.stringify(list)).not.toContain(t.token);
    const r = await b.revokeToken(t.id);
    expect(r.revokedAt).not.toBeNull();
    await expect(b.revokeToken('nope')).rejects.toMatchObject({ status: 404 });
    expect((await b.unknownDevices()).length).toBeGreaterThan(0);
  });
});

describe('acceso de choferes a G3 Drive', () => {
  let teardown: () => void;
  beforeEach(() => {
    tokenStore.setInMemory({ accessToken: 'tok', refreshToken: 'rfr' });
    driverAccessHttp.reset();
  });
  afterEach(() => teardown?.());

  test('POST /users/drivers con teléfono normalizado; recuerda el acceso', async () => {
    const m = makeFetchMock().on('POST /api/users/drivers', (req) => ({
      status: 201,
      body: { userId: 'usr_9', driverId: (req.body as { driverId: string }).driverId, phone: '+525512345678' },
    }));
    teardown = installGlobalFetchMock(m);

    const g = await driverAccessHttp.grant({ driverId: 'drv_1', phone: '+52 55 1234-5678', fullName: ' Pedro Pérez ', email: '' });
    expect(m.calls[0].url).toBe(`${API}/users/drivers`);
    expect(m.calls[0].body).toEqual({ driverId: 'drv_1', phone: '+525512345678', fullName: 'Pedro Pérez' });
    expect(g.userId).toBe('usr_9');
    expect(driverAccessHttp.grantedFor('drv_1')).toEqual(g);
  });

  test('estado real desde GET /users/drivers en una sola petición compartida', async () => {
    const m = makeFetchMock().on('GET /api/users/drivers', {
      status: 200,
      body: [{ userId: 'usr_3', driverId: 'drv_3', phoneSuffix: '5678' }],
    });
    teardown = installGlobalFetchMock(m);
    await Promise.all([driverAccessHttp.load!(), driverAccessHttp.load!()]);
    expect(m.calls).toHaveLength(1);
    expect(driverAccessHttp.grantedFor('drv_3')).toEqual({ userId: 'usr_3', driverId: 'drv_3', phone: '••••5678' });
    expect(driverAccessHttp.grantedFor('drv_x')).toBeNull();
  });

  test('409 y 403 con mensajes claros', async () => {
    const m = makeFetchMock()
      .on('POST /api/users/drivers', { status: 409, body: { statusCode: 409, error: 'Conflict', message: 'Ese teléfono ya tiene acceso a G3' } })
      .on('POST /api/users/drivers', { status: 403, body: { statusCode: 403, error: 'Forbidden', message: 'Requiere owner/admin' } });
    teardown = installGlobalFetchMock(m);
    const input = { driverId: 'drv_1', phone: '+525512345678', fullName: 'Pedro' };
    const e409 = await driverAccessHttp.grant(input).catch((e) => e);
    expect(e409).toBeInstanceOf(G3ApiError);
    expect(driverAccessErrorMessage(e409)).toMatch(/ya tiene acceso/);
    const e403 = await driverAccessHttp.grant(input).catch((e) => e);
    expect(driverAccessErrorMessage(e403)).toMatch(/owner.*admin/);
    expect(driverAccessHttp.grantedFor('drv_1')).toBeNull();
  });

  test('validación E.164', () => {
    expect(phoneError('')).toMatch(/Captura/);
    expect(phoneError('5512345678')).toMatch(/E\.164/);
    expect(phoneError('+52 1 55 1234 5678')).toBeNull();
  });

  test('demo: 409 por teléfono repetido y 403 sin rol', async () => {
    const b = createDemoDriverAccess();
    const g = await b.grant({ driverId: 'd1', phone: '+525512345678', fullName: 'Juan' });
    expect(b.grantedFor('d1')).toEqual(g);
    await expect(b.grant({ driverId: 'd2', phone: '+525512345678', fullName: 'Otro' })).rejects.toMatchObject({ status: 409 });
    await expect(b.grant({ driverId: 'd3', phone: '123', fullName: 'X' })).rejects.toMatchObject({ status: 400 });
    const noAdmin = createDemoDriverAccess({ isAdmin: false });
    await expect(noAdmin.grant({ driverId: 'd1', phone: '+525500000009', fullName: 'J' })).rejects.toMatchObject({ status: 403 });
  });
});
