import { TelemetryEventType, type OperationalSignalDto } from '@g3/contracts';
import type { DomainEvent } from '../src/event.bus';
import { NoopEventBus, RecordingEventBus } from '../src/event.bus';
import {
  HttpActiveTripResolver,
  IncidentSignalBus,
  eventBusFromEnv,
  type ActiveTripResolver,
} from '../src/incident-signals';
import { FleetService } from '../src/fleet.service';
import { DevicesService } from '../src/devices.service';
import { TelemetryService } from '../src/telemetry/telemetry.service';
import {
  InMemoryDeviceRepo,
  InMemoryIngestTokenRepo,
  InMemoryTelemetryRepo,
  InMemoryTractorRepo,
  InMemoryTrailerRepo,
} from '../src/in-memory.repos';

const TOKEN = 'k'.repeat(40);

interface Call {
  url: string;
  init: RequestInit;
}

/** fetch falso: responde según la URL y registra cada llamada. */
function fakeFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fn = (async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    return handler(url, init);
  }) as unknown as typeof fetch;
  return { fn, calls };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function positionEvent(over: Partial<Record<string, unknown>> = {}, companyId = 'cmp_1'): DomainEvent {
  return {
    type: TelemetryEventType.PositionReceived,
    occurredAt: '2026-10-02T10:00:05.000Z',
    companyId,
    data: {
      pointId: 'pt_1',
      deviceId: 'dev_1',
      provider: 'queclink',
      vehicleId: 'trc_1',
      vehicleKind: 'tractor',
      recordedAt: '2026-10-02T10:00:00.000Z',
      lat: 19.43,
      lng: -99.13,
      speedKph: 112,
      headingDeg: 90,
      ignition: true,
      eventCode: null,
      ...over,
    },
  };
}

describe('HttpActiveTripResolver', () => {
  test('consulta trips con x-internal-token y devuelve tripId/driverId', async () => {
    const f = fakeFetch(() => json({ id: 'trp_1', driverId: 'drv_1', tractorId: 'trc_1' }));
    const r = new HttpActiveTripResolver({ tripsUrl: 'http://trips:8085/', internalToken: TOKEN, fetch: f.fn });
    expect(await r.resolve('cmp 1', 'trc/1')).toEqual({ tripId: 'trp_1', driverId: 'drv_1' });
    expect(f.calls[0].url).toBe('http://trips:8085/api/trips/internal/active-by-vehicle/trc%2F1?companyId=cmp%201');
    expect((f.calls[0].init.headers as Record<string, string>)['x-internal-token']).toBe(TOKEN);
  });

  test('cachea 60 s (también el 404 = sin viaje) y comparte la consulta en vuelo', async () => {
    let now = 0;
    let status = 404;
    const f = fakeFetch(() => (status === 404 ? json({ message: 'no' }, 404) : json({ id: 'trp_2', driverId: null })));
    const r = new HttpActiveTripResolver({ tripsUrl: 'http://trips', internalToken: TOKEN, fetch: f.fn, now: () => now });

    const [a, b] = await Promise.all([r.resolve('cmp_1', 'trc_1'), r.resolve('cmp_1', 'trc_1')]);
    expect(a).toBeNull();
    expect(b).toBeNull();
    expect(f.calls).toHaveLength(1);

    status = 200;
    now = 59_000;
    expect(await r.resolve('cmp_1', 'trc_1')).toBeNull();
    expect(f.calls).toHaveLength(1);

    now = 60_001;
    expect(await r.resolve('cmp_1', 'trc_1')).toEqual({ tripId: 'trp_2', driverId: null });
    expect(f.calls).toHaveLength(2);
    // Llave por compañía + vehículo.
    await r.resolve('cmp_2', 'trc_1');
    expect(f.calls).toHaveLength(3);
  });

  test('errores (5xx, red) lanzan y no se cachean', async () => {
    let fail = true;
    const f = fakeFetch(() => {
      if (fail) throw new Error('ECONNREFUSED');
      return json({ id: 'trp_3', driverId: 'drv_3' });
    });
    const r = new HttpActiveTripResolver({ tripsUrl: 'http://trips', internalToken: TOKEN, fetch: f.fn });
    await expect(r.resolve('cmp_1', 'trc_1')).rejects.toThrow('ECONNREFUSED');
    fail = false;
    expect(await r.resolve('cmp_1', 'trc_1')).toEqual({ tripId: 'trp_3', driverId: 'drv_3' });

    const f5 = fakeFetch(() => json({}, 503));
    const r5 = new HttpActiveTripResolver({ tripsUrl: 'http://trips', internalToken: TOKEN, fetch: f5.fn });
    await expect(r5.resolve('cmp_1', 'trc_1')).rejects.toThrow(/503/);
  });
});

describe('IncidentSignalBus: telemetry.position_received → POST /api/incidents/signals', () => {
  const resolver = (trip: { tripId: string; driverId: string | null } | null): ActiveTripResolver => ({
    resolve: async () => trip,
  });

  test('manda {companyId, signal} con x-internal-token y el viaje activo del vehículo', async () => {
    const f = fakeFetch(() => new Response(null, { status: 202 }));
    const inner = new RecordingEventBus();
    const bus = new IncidentSignalBus({
      alertsUrl: 'http://alerts:8086/',
      internalToken: TOKEN,
      resolver: resolver({ tripId: 'trp_1', driverId: 'drv_1' }),
      fetch: f.fn,
      inner,
    });
    await bus.publish(positionEvent());
    await bus.drain();

    expect(inner.events).toHaveLength(1); // el bus de dominio sigue recibiendo el evento
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0].url).toBe('http://alerts:8086/api/incidents/signals');
    expect(f.calls[0].init.method).toBe('POST');
    expect((f.calls[0].init.headers as Record<string, string>)['x-internal-token']).toBe(TOKEN);
    const signal: OperationalSignalDto = {
      kind: 'position',
      vehicleId: 'trc_1',
      tripId: 'trp_1',
      driverId: 'drv_1',
      speedKph: 112,
      lat: 19.43,
      lng: -99.13,
      recordedAt: '2026-10-02T10:00:00.000Z',
    };
    expect(JSON.parse(String(f.calls[0].init.body))).toEqual({ companyId: 'cmp_1', signal });
  });

  test('no bloquea la ingesta: publish resuelve aunque alerts no conteste', async () => {
    const f = fakeFetch(() => new Promise<Response>(() => undefined));
    const bus = new IncidentSignalBus({
      alertsUrl: 'http://alerts',
      internalToken: TOKEN,
      resolver: resolver(null),
      fetch: f.fn,
      timeoutMs: 30,
      log: () => undefined,
    });
    const t0 = Date.now();
    await bus.publish(positionEvent());
    expect(Date.now() - t0).toBeLessThan(25);
    await bus.drain(); // el timeout aborta y termina
  });

  test('timeout: aborta la petición a alerts y solo loguea', async () => {
    const logs: string[] = [];
    const f = fakeFetch(
      (_u, init) =>
        new Promise<Response>((_r, reject) => init.signal?.addEventListener('abort', () => reject(new Error('aborted')))),
    );
    const bus = new IncidentSignalBus({
      alertsUrl: 'http://alerts',
      internalToken: TOKEN,
      resolver: resolver(null),
      fetch: f.fn,
      timeoutMs: 20,
      log: (m) => logs.push(m),
    });
    await bus.publish(positionEvent());
    await bus.drain();
    expect(logs.join('\n')).toMatch(/aborted/);
  });

  test('si trips falla, la señal sale igual sin viaje; si alerts responde 4xx/5xx, solo log', async () => {
    const logs: string[] = [];
    const f = fakeFetch(() => new Response('x', { status: 500 }));
    const bus = new IncidentSignalBus({
      alertsUrl: 'http://alerts',
      internalToken: TOKEN,
      resolver: { resolve: async () => { throw new Error('trips caído'); } },
      fetch: f.fn,
      log: (m) => logs.push(m),
    });
    await expect(bus.publish(positionEvent())).resolves.toBeUndefined();
    await bus.drain();
    const sent = JSON.parse(String(f.calls[0].init.body));
    expect(sent.signal).toMatchObject({ tripId: null, driverId: null });
    expect(logs.join('\n')).toContain('trips caído');
    expect(logs.join('\n')).toContain('500');
  });

  test('ignora otros eventos y posiciones sin vehículo ligado', async () => {
    const f = fakeFetch(() => new Response(null, { status: 202 }));
    const bus = new IncidentSignalBus({ alertsUrl: 'http://alerts', internalToken: TOKEN, resolver: resolver(null), fetch: f.fn });
    await bus.publish({ type: 'tractor.created', occurredAt: '', companyId: 'cmp_1', data: {} });
    await bus.publish(positionEvent({ vehicleId: null }));
    await bus.drain();
    expect(f.calls).toHaveLength(0);
  });

  test('acota las señales en vuelo: descarta (y loguea) en vez de acumular memoria', async () => {
    const logs: string[] = [];
    const pending: Array<() => void> = [];
    const f = fakeFetch(
      () => new Promise<Response>((resolve) => pending.push(() => resolve(new Response(null, { status: 202 })))),
    );
    const bus = new IncidentSignalBus({
      alertsUrl: 'http://alerts',
      internalToken: TOKEN,
      resolver: resolver(null),
      fetch: f.fn,
      maxInFlight: 2,
      log: (m) => logs.push(m),
    });
    for (let i = 0; i < 5; i++) await bus.publish(positionEvent({ pointId: `pt_${i}` }));
    await new Promise((r) => setImmediate(r));
    expect(f.calls).toHaveLength(2);
    expect(logs.join('\n')).toMatch(/descart/);
    pending.forEach((p) => p());
    await bus.drain();
  });
});

describe('eventBusFromEnv', () => {
  test('con ALERTS_URL + INTERNAL_TOKEN reenvía señales; sin ellos, Noop', () => {
    expect(eventBusFromEnv({ ALERTS_URL: 'http://alerts', INTERNAL_TOKEN: TOKEN, TRIPS_URL: 'http://trips' })).toBeInstanceOf(
      IncidentSignalBus,
    );
    expect(eventBusFromEnv({ ALERTS_URL: 'http://alerts' })).toBeInstanceOf(NoopEventBus);
    expect(eventBusFromEnv({})).toBeInstanceOf(NoopEventBus);
  });
});

describe('integración: ingesta de telemetría → señal a alerts con viaje de trips', () => {
  test('una posición aceptada del webhook llega a alerts con tripId/driverId resueltos en trips', async () => {
    const tractors = new InMemoryTractorRepo();
    const trailers = new InMemoryTrailerRepo();
    const devices = new InMemoryDeviceRepo();
    const telemetry = new InMemoryTelemetryRepo();
    const tokens = new InMemoryIngestTokenRepo();

    const f = fakeFetch((url) =>
      url.startsWith('http://trips') ? json({ id: 'trp_77', driverId: 'drv_77' }) : new Response(null, { status: 202 }),
    );
    const bus = new IncidentSignalBus({
      alertsUrl: 'http://alerts',
      internalToken: TOKEN,
      resolver: new HttpActiveTripResolver({ tripsUrl: 'http://trips', internalToken: TOKEN, fetch: f.fn }),
      fetch: f.fn,
    });
    const A = { companyId: 'cmp_A', tier: 'business' as const, role: 'owner' as const };
    const clock = () => new Date('2024-05-18T15:00:00.000Z');
    const fleet = new FleetService(tractors, trailers, telemetry);
    const devicesSvc = new DevicesService(devices, tractors, trailers, clock);
    const svc = new TelemetryService({ devices, telemetry, tokens, tractors, trailers, bus, clock });

    const tractor = await fleet.createTractor(A, { unitNumber: 'T-1', plates: 'AAA' });
    const dev = await devicesSvc.create(A, { provider: 'teltonika', externalId: '352093081234567' });
    await devicesSvc.link(A, dev.id, { vehicleId: tractor.id, vehicleKind: 'tractor' });
    const tok = await svc.createIngestToken(A, {});

    const res = await svc.ingest('teltonika', tok.token, {
      imei: '352093081234567',
      records: [
        { timestamp: '2024-05-18T14:30:00.000Z', gps: { lat: 19.4, lng: -99.1, speed: 95, angle: 90, satellites: 10 }, io: {} },
        { timestamp: '2024-05-18T14:31:00.000Z', gps: { lat: 19.5, lng: -99.2, speed: 101, angle: 90, satellites: 10 }, io: {} },
      ],
    });
    expect(res).toMatchObject({ accepted: 2 });
    await bus.drain();

    const toTrips = f.calls.filter((c) => c.url.startsWith('http://trips'));
    const toAlerts = f.calls.filter((c) => c.url === 'http://alerts/api/incidents/signals');
    expect(toTrips).toHaveLength(1); // caché + consulta en vuelo compartida
    expect(toAlerts).toHaveLength(2);
    expect(JSON.parse(String(toAlerts[1].init.body))).toMatchObject({
      companyId: 'cmp_A',
      signal: { kind: 'position', vehicleId: tractor.id, tripId: 'trp_77', driverId: 'drv_77', speedKph: 101 },
    });
  });
});
