import type { INestApplication } from '@nestjs/common';
import { createFleetApp } from '../src/main';
import { RecordingEventBus } from '../src/event.bus';

/**
 * Prueba HTTP de punta a punta del webhook: body parsers (JSON y text/plain),
 * códigos de estado del filtro de errores y aislamiento por compañía.
 */
const IMEI = '860599001234567';
const FRI = (time: string) =>
  `+RESP:GTFRI,300400,${IMEI},GV300,,10,1,1,72.5,184,2240.3,-99.133209,19.432608,${time},0334,0020,3C1F,0402ED4C,00,12345.6,,,,,,20240518143212,0A1B$`;

const user = (companyId: string, tier = 'business', role = 'owner') => ({
  'x-company-id': companyId,
  'x-tier': tier,
  'x-user-role': role,
  'content-type': 'application/json',
});

describe('fleet HTTP: ingesta de telemetría', () => {
  let app: INestApplication;
  let base: string;
  const bus = new RecordingEventBus();

  beforeAll(async () => {
    app = await createFleetApp({ bus, logger: false });
    await app.listen(0, '127.0.0.1');
    base = `${await app.getUrl()}/api`;
  });
  afterAll(async () => {
    await app.close();
  });

  const call = async (method: string, path: string, headers: Record<string, string>, body?: unknown) => {
    const r = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const text = await r.text();
    return { status: r.status, body: text ? JSON.parse(text) : null };
  };

  test('flujo completo: tracto → device → token → webhook text/plain → live → track', async () => {
    const tractor = await call('POST', '/tractors', user('cmp_A'), { unitNumber: 'T-1', plates: 'AAA' });
    expect(tractor.status).toBe(201);

    const dev = await call('POST', '/devices', user('cmp_A'), { provider: 'queclink', externalId: IMEI });
    expect(dev.status).toBe(201);
    const linked = await call('POST', `/devices/${dev.body.id}/link`, user('cmp_A'), {
      vehicleId: tractor.body.id,
      vehicleKind: 'tractor',
    });
    expect(linked.status).toBe(200);

    const tok = await call('POST', '/telemetry/ingest-tokens', user('cmp_A'), { label: 'Queclink' });
    expect(tok.status).toBe(201);
    const token: string = tok.body.token;

    // Webhook ASCII crudo (text/plain), sin JWT.
    const ing = await call(
      'POST',
      '/telemetry/ingest/queclink',
      { 'content-type': 'text/plain', 'x-g3-ingest-token': token },
      FRI('20240518143210') + '\r\n' + FRI('20240518143310'),
    );
    expect(ing.status).toBe(202);
    expect(ing.body).toMatchObject({ received: 2, accepted: 2, duplicates: 0 });
    expect(bus.events.filter((e) => e.type === 'telemetry.position_received')).toHaveLength(2);

    // Mismo payload por JSON { messages } → idempotente.
    const again = await call(
      'POST',
      '/telemetry/ingest/queclink',
      { 'content-type': 'application/json', 'x-g3-ingest-token': token },
      { messages: [FRI('20240518143210')] },
    );
    expect(again.body).toMatchObject({ accepted: 0, duplicates: 1 });

    const live = await call('GET', '/tractors/live/positions', user('cmp_A', 'pro'));
    expect(live.status).toBe(200);
    expect(live.body[0]).toMatchObject({ tractorId: tractor.body.id, lastSeenAt: '2024-05-18T14:33:10.000Z' });

    const track = await call(
      'GET',
      `/vehicles/${tractor.body.id}/track?from=2024-05-18T14:00:00Z&to=2024-05-18T15:00:00Z`,
      user('cmp_A', 'pro'),
    );
    expect(track.status).toBe(200);
    expect(track.body.points).toHaveLength(2);

    // Otra compañía no ve nada.
    expect((await call('GET', '/devices', user('cmp_B'))).body).toEqual([]);
    expect((await call('GET', `/vehicles/${tractor.body.id}/track`, user('cmp_B', 'pro'))).status).toBe(404);
  });

  test('token inválido → 401; proveedor desconocido → 400', async () => {
    const r = await call('POST', '/telemetry/ingest/queclink', { 'content-type': 'text/plain', 'x-g3-ingest-token': 'x' }, FRI('20240518143210'));
    expect(r.status).toBe(401);
    const p = await call('POST', '/telemetry/ingest/garmin', { 'content-type': 'application/json', 'x-g3-ingest-token': 'x' }, {});
    expect(p.status).toBe(400);
  });

  test('IMEI duplicado entre compañías → 409; gating Free → 402', async () => {
    await call('POST', '/devices', user('cmp_C'), { provider: 'suntech', externalId: '205027329' });
    const dup = await call('POST', '/devices', user('cmp_D'), { provider: 'suntech', externalId: '205027329' });
    expect(dup.status).toBe(409);
    const gated = await call('GET', '/tractors/live/positions', user('cmp_C', 'free'));
    expect(gated.status).toBe(402);
    expect(gated.body).toMatchObject({ missingFeatures: ['fleet_map'] });
  });

  test('driver no puede crear tokens → 403', async () => {
    const r = await call('POST', '/telemetry/ingest-tokens', user('cmp_A', 'business', 'driver'), {});
    expect(r.status).toBe(403);
  });
});
