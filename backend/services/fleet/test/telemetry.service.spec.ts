import { UpgradeRequiredError, type TierValue } from '@g3/contracts';
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
import { RecordingEventBus } from '../src/event.bus';
import {
  ConflictError,
  ForbiddenError,
  InvalidIngestTokenError,
  NotFoundError,
  UnsupportedProviderError,
  ValidationError,
} from '../src/errors';

const A = { companyId: 'cmp_A', tier: 'business' as TierValue, role: 'owner' as const };
const B = { companyId: 'cmp_B', tier: 'business' as TierValue, role: 'owner' as const };
const NOW = new Date('2024-05-18T15:00:00.000Z');

const IMEI_A = '860599001234567';
const IMEI_B = '352093081234567';

const queclinkFri = (imei: string, time = '20240518143210', lat = '19.432608', lon = '-99.133209') =>
  `+RESP:GTFRI,300400,${imei},GV300,,10,1,1,72.5,184,2240.3,${lon},${lat},${time},0334,0020,3C1F,0402ED4C,00,12345.6,,,,,,20240518143212,0A1B$`;

const teltonika = (imei: string, ts: string, lat = 19.4, lng = -99.1) => ({
  imei,
  records: [{ timestamp: ts, gps: { lat, lng, speed: 60, angle: 90, satellites: 10 }, io: { '239': 1 } }],
});

function build() {
  const tractors = new InMemoryTractorRepo();
  const trailers = new InMemoryTrailerRepo();
  const devices = new InMemoryDeviceRepo();
  const telemetry = new InMemoryTelemetryRepo();
  const tokens = new InMemoryIngestTokenRepo();
  const bus = new RecordingEventBus();
  const clock = () => NOW;
  const fleet = new FleetService(tractors, trailers, telemetry);
  const devicesSvc = new DevicesService(devices, tractors, trailers, clock);
  const telemetrySvc = new TelemetryService({ devices, telemetry, tokens, tractors, trailers, bus, clock });
  return { fleet, devicesSvc, telemetrySvc, devices, telemetry, tractors, bus };
}

async function setup() {
  const b = build();
  const tA = await b.fleet.createTractor(A, { unitNumber: 'T-100', plates: 'AAA' });
  const rA = await b.fleet.createTrailer(A, { unitNumber: 'R-100', plates: 'RRR', type: 'caja_53' });
  const tB = await b.fleet.createTractor(B, { unitNumber: 'T-900', plates: 'BBB' });
  const devA = await b.devicesSvc.create(A, { provider: 'queclink', externalId: IMEI_A, label: 'GV300 tracto' });
  const devB = await b.devicesSvc.create(B, { provider: 'teltonika', externalId: IMEI_B });
  await b.devicesSvc.link(A, devA.id, { vehicleId: tA.id, vehicleKind: 'tractor' });
  await b.devicesSvc.link(B, devB.id, { vehicleId: tB.id, vehicleKind: 'tractor' });
  const tokA = await b.telemetrySvc.createIngestToken(A, { label: 'Queclink server' });
  const tokB = await b.telemetrySvc.createIngestToken(B, {});
  return { ...b, tA, rA, tB, devA, devB, tokA, tokB };
}

// ---------------------------------------------------------------------------
describe('DevicesService', () => {
  test('crear dispositivo: status pending, sin vehículo, IMEI normalizado', async () => {
    const { devicesSvc } = build();
    const d = await devicesSvc.create(A, { provider: 'suntech', externalId: ' 205027329 ' });
    expect(d).toMatchObject({
      companyId: 'cmp_A',
      provider: 'suntech',
      externalId: '205027329',
      status: 'pending',
      vehicleId: null,
      vehicleKind: null,
      lastSeenAt: null,
      createdAt: NOW.toISOString(),
    });
  });

  test('un IMEI no puede pertenecer a dos compañías (409)', async () => {
    const { devicesSvc } = build();
    await devicesSvc.create(A, { provider: 'queclink', externalId: IMEI_A });
    await expect(devicesSvc.create(B, { provider: 'queclink', externalId: IMEI_A })).rejects.toBeInstanceOf(
      ConflictError,
    );
    // ni duplicarse en la misma compañía
    await expect(devicesSvc.create(A, { provider: 'queclink', externalId: IMEI_A })).rejects.toMatchObject({
      status: 409,
    });
  });

  test('valida provider y externalId', async () => {
    const { devicesSvc } = build();
    await expect(
      devicesSvc.create(A, { provider: 'garmin' as never, externalId: '123' }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(devicesSvc.create(A, { provider: 'suntech', externalId: '  ' })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  test('multi-tenant: A no ve ni modifica dispositivos de B', async () => {
    const { devicesSvc, devB } = await setup();
    const listA = await devicesSvc.list(A);
    expect(listA.map((d) => d.externalId)).toEqual([IMEI_A]);
    await expect(devicesSvc.get(A, devB.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(devicesSvc.update(A, devB.id, { label: 'hack' })).rejects.toBeInstanceOf(NotFoundError);
    await expect(devicesSvc.remove(A, devB.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  test('vincular a remolque y desvincular', async () => {
    const { devicesSvc, devA, rA } = await setup();
    const linked = await devicesSvc.link(A, devA.id, { vehicleId: rA.id, vehicleKind: 'trailer' });
    expect(linked).toMatchObject({ vehicleId: rA.id, vehicleKind: 'trailer' });
    const unlinked = await devicesSvc.unlink(A, devA.id);
    expect(unlinked).toMatchObject({ vehicleId: null, vehicleKind: null });
  });

  test('no se puede vincular a un vehículo de otra compañía ni con kind incorrecto', async () => {
    const { devicesSvc, devA, tB, rA } = await setup();
    await expect(devicesSvc.link(A, devA.id, { vehicleId: tB.id, vehicleKind: 'tractor' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(devicesSvc.link(A, devA.id, { vehicleId: rA.id, vehicleKind: 'tractor' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(
      devicesSvc.link(A, devA.id, { vehicleId: rA.id, vehicleKind: 'barco' as never }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test('update: label y status inactive', async () => {
    const { devicesSvc, devA } = await setup();
    const d = await devicesSvc.update(A, devA.id, { label: 'Nuevo', status: 'inactive' });
    expect(d).toMatchObject({ label: 'Nuevo', status: 'inactive' });
    await expect(devicesSvc.update(A, devA.id, { status: 'pending' as never })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  test('remove libera el IMEI', async () => {
    const { devicesSvc, devA } = await setup();
    await devicesSvc.remove(A, devA.id);
    await expect(devicesSvc.create(B, { provider: 'queclink', externalId: IMEI_A })).resolves.toMatchObject({
      companyId: 'cmp_B',
    });
  });
});

// ---------------------------------------------------------------------------
describe('TelemetryService: tokens de ingesta', () => {
  test('el token sólo se muestra al crearlo; list no expone el secreto', async () => {
    const { telemetrySvc, tokA } = await setup();
    expect(tokA.token).toMatch(/^g3it_[A-Za-z0-9_-]{40,}$/);
    expect(tokA.prefix).toBe(tokA.token.slice(0, 12));
    const list = await telemetrySvc.listIngestTokens(A);
    expect(list).toHaveLength(1);
    expect(JSON.stringify(list)).not.toContain(tokA.token);
    expect(list[0]).not.toHaveProperty('token');
  });

  test('sólo owner/admin gestionan tokens', async () => {
    const { telemetrySvc } = build();
    await expect(telemetrySvc.createIngestToken({ ...A, role: 'driver' }, {})).rejects.toBeInstanceOf(ForbiddenError);
  });

  test('token inválido / ausente → 401', async () => {
    const { telemetrySvc } = await setup();
    await expect(telemetrySvc.ingest('queclink', 'g3it_falso', queclinkFri(IMEI_A))).rejects.toBeInstanceOf(
      InvalidIngestTokenError,
    );
    await expect(telemetrySvc.ingest('queclink', undefined, queclinkFri(IMEI_A))).rejects.toMatchObject({
      status: 401,
    });
  });

  test('token revocado → 401', async () => {
    const { telemetrySvc, tokA } = await setup();
    await telemetrySvc.revokeIngestToken(A, tokA.id);
    await expect(telemetrySvc.ingest('queclink', tokA.token, queclinkFri(IMEI_A))).rejects.toBeInstanceOf(
      InvalidIngestTokenError,
    );
  });

  test('B no puede revocar el token de A', async () => {
    const { telemetrySvc, tokA } = await setup();
    await expect(telemetrySvc.revokeIngestToken(B, tokA.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  test('provider desconocido → 400', async () => {
    const { telemetrySvc, tokA } = await setup();
    await expect(telemetrySvc.ingest('garmin', tokA.token, '')).rejects.toBeInstanceOf(UnsupportedProviderError);
  });
});

// ---------------------------------------------------------------------------
describe('TelemetryService.ingest', () => {
  test('Queclink → punto normalizado ligado a compañía, dispositivo y tracto', async () => {
    const { telemetrySvc, telemetry, tokA, devA, tA } = await setup();
    const res = await telemetrySvc.ingest('queclink', tokA.token, queclinkFri(IMEI_A));
    expect(res).toMatchObject({ provider: 'queclink', received: 1, accepted: 1, duplicates: 0, unknownDevices: 0, rejected: [] });

    const last = await telemetry.lastByVehicle('cmp_A', tA.id);
    expect(last).toMatchObject({
      companyId: 'cmp_A',
      deviceId: devA.id,
      vehicleId: tA.id,
      vehicleKind: 'tractor',
      provider: 'queclink',
      lat: 19.432608,
      lng: -99.133209,
      speedKph: 72.5,
      recordedAt: '2024-05-18T14:32:10.000Z',
      receivedAt: NOW.toISOString(),
    });
  });

  test('actualiza device (active + lastSeenAt) y la última posición del tracto', async () => {
    const { telemetrySvc, devicesSvc, fleet, tokA, devA, tA } = await setup();
    await telemetrySvc.ingest('queclink', tokA.token, queclinkFri(IMEI_A));
    const d = await devicesSvc.get(A, devA.id);
    expect(d).toMatchObject({ status: 'active', lastSeenAt: '2024-05-18T14:32:10.000Z' });
    const t = await fleet.getTractor(A, tA.id);
    expect(t).toMatchObject({ lastLat: 19.432608, lastLng: -99.133209, lastSeenAt: '2024-05-18T14:32:10.000Z' });
  });

  test('publica telemetry.position_received por punto aceptado', async () => {
    const { telemetrySvc, bus, tokA, tA } = await setup();
    await telemetrySvc.ingest('queclink', tokA.token, queclinkFri(IMEI_A));
    expect(bus.events).toHaveLength(1);
    expect(bus.events[0]).toMatchObject({
      type: 'telemetry.position_received',
      companyId: 'cmp_A',
      data: { vehicleId: tA.id, vehicleKind: 'tractor', lat: 19.432608, provider: 'queclink' },
    });
  });

  test('idempotencia: mismo device+recordedAt no duplica (ni en reintento ni dentro del batch)', async () => {
    const { telemetrySvc, telemetry, bus, tokA, tA } = await setup();
    await telemetrySvc.ingest('queclink', tokA.token, queclinkFri(IMEI_A));
    const again = await telemetrySvc.ingest('queclink', tokA.token, queclinkFri(IMEI_A) + queclinkFri(IMEI_A));
    expect(again).toMatchObject({ received: 2, accepted: 0, duplicates: 2 });
    expect(await telemetry.countByVehicle('cmp_A', tA.id)).toBe(1);
    expect(bus.events).toHaveLength(1);
  });

  test('IMEI desconocido se rechaza y se cuenta (visible para onboarding)', async () => {
    const { telemetrySvc, tokA } = await setup();
    const res = await telemetrySvc.ingest('queclink', tokA.token, queclinkFri('869999999999999') + queclinkFri('869999999999999', '20240518143300'));
    expect(res).toMatchObject({ received: 2, accepted: 0, unknownDevices: 2 });
    expect(res.rejected[0]).toMatchObject({ code: 'unknown_device', externalId: '869999999999999' });
    const unknown = await telemetrySvc.listUnknownDevices(A);
    expect(unknown).toEqual([
      { provider: 'queclink', externalId: '869999999999999', hits: 2, lastSeenAt: NOW.toISOString() },
    ]);
  });

  test('multi-tenant: con el token de A no se puede inyectar posición a un IMEI de B', async () => {
    const { telemetrySvc, telemetry, tokA, tB } = await setup();
    const res = await telemetrySvc.ingest('teltonika', tokA.token, teltonika(IMEI_B, '2024-05-18T14:00:00Z'));
    expect(res).toMatchObject({ accepted: 0, unknownDevices: 1 });
    expect(await telemetry.countByVehicle('cmp_B', tB.id)).toBe(0);
    // y el hit desconocido queda registrado sólo para A, B no ve nada
    expect(await telemetrySvc.listUnknownDevices(B)).toEqual([]);
  });

  test('provider del endpoint distinto al del dispositivo → provider_mismatch (generic acepta cualquiera)', async () => {
    const { telemetrySvc, tokB } = await setup();
    const res = await telemetrySvc.ingest('queclink', tokB.token, queclinkFri(IMEI_B));
    expect(res.rejected[0].code).toBe('provider_mismatch');
    const g = await telemetrySvc.ingest('generic', tokB.token, {
      points: [{ externalId: IMEI_B, recordedAt: '2024-05-18T14:10:00Z', lat: 20.5, lng: -100.4 }],
    });
    expect(g.accepted).toBe(1);
  });

  test('dispositivo inactive → device_inactive', async () => {
    const { telemetrySvc, devicesSvc, tokA, devA } = await setup();
    await devicesSvc.update(A, devA.id, { status: 'inactive' });
    const res = await telemetrySvc.ingest('queclink', tokA.token, queclinkFri(IMEI_A));
    expect(res.rejected[0].code).toBe('device_inactive');
  });

  test('errores de parseo se reportan junto con los aceptados', async () => {
    const { telemetrySvc, tokA } = await setup();
    const res = await telemetrySvc.ingest(
      'queclink',
      tokA.token,
      { messages: [queclinkFri(IMEI_A), queclinkFri(IMEI_A, '20240518143300', '0', '0'), '+ACK:GTHBD,300400,x,,1$'] },
    );
    expect(res.accepted).toBe(1);
    expect(res.rejected.map((r) => r.code).sort()).toEqual(['invalid_coordinates', 'unsupported_message']);
  });

  test('dispositivo sin vehículo: guarda el punto pero sin vehicleId', async () => {
    const { telemetrySvc, devicesSvc, telemetry, tokA, devA } = await setup();
    await devicesSvc.unlink(A, devA.id);
    const res = await telemetrySvc.ingest('queclink', tokA.token, queclinkFri(IMEI_A));
    expect(res.accepted).toBe(1);
    const pts = await telemetry.listByDevice('cmp_A', devA.id);
    expect(pts[0].vehicleId).toBeNull();
  });

  test('punto viejo no pisa la última posición del tracto', async () => {
    const { telemetrySvc, fleet, tokA, tA } = await setup();
    await telemetrySvc.ingest('queclink', tokA.token, queclinkFri(IMEI_A, '20240518143210', '19.5', '-99.2'));
    await telemetrySvc.ingest('queclink', tokA.token, queclinkFri(IMEI_A, '20240518120000', '19.1', '-99.0'));
    const t = await fleet.getTractor(A, tA.id);
    expect(t.lastLat).toBe(19.5);
  });
});

// ---------------------------------------------------------------------------
describe('livePositions desde telemetría', () => {
  test('usa la última telemetría del tracto (speed/heading incluidos)', async () => {
    const { telemetrySvc, fleet, tokA, tA } = await setup();
    await telemetrySvc.ingest('queclink', tokA.token, queclinkFri(IMEI_A, '20240518140000', '19.0', '-99.0'));
    await telemetrySvc.ingest('queclink', tokA.token, queclinkFri(IMEI_A, '20240518143210'));
    const live = await fleet.livePositions(A);
    expect(live).toEqual([
      {
        tractorId: tA.id,
        unitNumber: 'T-100',
        lat: 19.432608,
        lng: -99.133209,
        speedKph: 72.5,
        headingDeg: 184,
        lastSeenAt: '2024-05-18T14:32:10.000Z',
      },
    ]);
  });

  test('multi-tenant: B no ve posiciones de A', async () => {
    const { telemetrySvc, fleet, tokA } = await setup();
    await telemetrySvc.ingest('queclink', tokA.token, queclinkFri(IMEI_A));
    expect(await fleet.livePositions(B)).toEqual([]);
  });

  test('sigue gated por FleetMap', async () => {
    const { fleet } = await setup();
    await expect(fleet.livePositions({ companyId: 'cmp_A', tier: 'starter' })).rejects.toBeInstanceOf(
      UpgradeRequiredError,
    );
  });
});

// ---------------------------------------------------------------------------
describe('vehicleTrack (GET /vehicles/:id/track)', () => {
  async function withTrack() {
    const s = await setup();
    const msgs = ['20240518140000', '20240518141000', '20240518142000', '20240518143000'].map((t, i) =>
      queclinkFri(IMEI_A, t, String(19.4 + i / 100), '-99.1'),
    );
    await s.telemetrySvc.ingest('queclink', s.tokA.token, msgs.reverse().join(''));
    return s;
  }

  test('devuelve puntos ordenados dentro del rango', async () => {
    const { telemetrySvc, tA } = await withTrack();
    const track = await telemetrySvc.vehicleTrack(A, tA.id, '2024-05-18T14:05:00Z', '2024-05-18T14:25:00Z');
    expect(track).toMatchObject({ vehicleId: tA.id, vehicleKind: 'tractor', truncated: false });
    expect(track.points.map((p) => p.recordedAt)).toEqual(['2024-05-18T14:10:00.000Z', '2024-05-18T14:20:00.000Z']);
  });

  test('sin rango: últimas 24h desde ahora', async () => {
    const { telemetrySvc, tA } = await withTrack();
    const track = await telemetrySvc.vehicleTrack(A, tA.id);
    expect(track.points).toHaveLength(4);
    expect(track.to).toBe(NOW.toISOString());
  });

  test('rango inválido o mayor a 7 días → 400', async () => {
    const { telemetrySvc, tA } = await withTrack();
    await expect(telemetrySvc.vehicleTrack(A, tA.id, 'ayer', undefined)).rejects.toBeInstanceOf(ValidationError);
    await expect(
      telemetrySvc.vehicleTrack(A, tA.id, '2024-05-18T15:00:00Z', '2024-05-18T14:00:00Z'),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      telemetrySvc.vehicleTrack(A, tA.id, '2024-05-01T00:00:00Z', '2024-05-18T00:00:00Z'),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test('vehículo de otra compañía → 404', async () => {
    const { telemetrySvc, tA } = await withTrack();
    await expect(telemetrySvc.vehicleTrack(B, tA.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  test('gated por FleetMap (Starter → 402)', async () => {
    const { telemetrySvc, tA } = await withTrack();
    await expect(telemetrySvc.vehicleTrack({ ...A, tier: 'starter' }, tA.id)).rejects.toMatchObject({ status: 402 });
  });

  test('remolque con dispositivo propio también tiene recorrido', async () => {
    const s = await setup();
    const dev = await s.devicesSvc.create(A, { provider: 'generic', externalId: 'TRL-GPS-1' });
    await s.devicesSvc.link(A, dev.id, { vehicleId: s.rA.id, vehicleKind: 'trailer' });
    await s.telemetrySvc.ingest('generic', s.tokA.token, {
      points: [{ externalId: 'TRL-GPS-1', recordedAt: '2024-05-18T14:50:00Z', lat: 20.1, lng: -100.2 }],
    });
    const track = await s.telemetrySvc.vehicleTrack(A, s.rA.id);
    expect(track.vehicleKind).toBe('trailer');
    expect(track.points).toHaveLength(1);
  });
});
