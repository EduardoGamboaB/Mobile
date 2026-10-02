import * as path from 'path';
import { randomUUID } from 'crypto';
import type { DeviceDto, TelemetryPoint, TierValue, TractorDto, TrailerDto } from '@g3/contracts';
import { createTestDb, describeIfDb } from '@g3/platform/testing';
import { buildRepos, type FleetRepos } from '../src/main';
import { PgTelemetryRepo } from '../src/pg.repos';
import { FleetService } from '../src/fleet.service';
import { DevicesService } from '../src/devices.service';
import { TelemetryService } from '../src/telemetry/telemetry.service';
import { RecordingEventBus } from '../src/event.bus';

/**
 * Contrato de persistencia de fleet: los mismos casos contra los repos en
 * memoria (siempre) y contra Postgres (con TEST_DATABASE_URL). Compañías e
 * IMEIs nuevos en cada caso: los de Postgres comparten schema sin pisarse.
 */

const MIGRATIONS = path.join(__dirname, '../migrations');

const newCompany = () => `cmp_${randomUUID().slice(0, 8)}`;
const newImei = () => `IMEI-${randomUUID()}`;

function tractor(companyId: string, over: Partial<TractorDto> = {}): TractorDto {
  return {
    id: randomUUID(),
    companyId,
    unitNumber: 'T-100',
    plates: 'AAA-000',
    brand: 'Kenworth',
    model: 'T680',
    year: 2022,
    status: 'available',
    lastLat: null,
    lastLng: null,
    lastSeenAt: null,
    ...over,
  };
}

function trailer(companyId: string, over: Partial<TrailerDto> = {}): TrailerDto {
  return {
    id: randomUUID(),
    companyId,
    unitNumber: 'R-100',
    plates: 'RRR-000',
    type: 'caja_53',
    capacityTons: 30.5,
    status: 'available',
    ...over,
  };
}

function device(companyId: string, over: Partial<DeviceDto> = {}): DeviceDto {
  return {
    id: randomUUID(),
    companyId,
    provider: 'queclink',
    externalId: newImei(),
    label: null,
    vehicleId: null,
    vehicleKind: null,
    status: 'pending',
    lastSeenAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    ...over,
  };
}

function point(companyId: string, deviceId: string, recordedAt: string, over: Partial<TelemetryPoint> = {}): TelemetryPoint {
  return {
    id: randomUUID(),
    deviceId,
    vehicleId: null,
    vehicleKind: null,
    companyId,
    provider: 'generic',
    recordedAt,
    receivedAt: '2026-10-01T00:00:00.000Z',
    lat: 19.432608,
    lng: -99.133209,
    speedKph: 72.5,
    headingDeg: 184,
    ignition: true,
    odometerKm: 12345.678,
    fuelLevelPct: 40.5,
    eventCode: null,
    raw: { line: 'x' },
    ...over,
  };
}

const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

function contract(getRepos: () => FleetRepos) {
  test('tractos y remolques: CRUD aislado por compañía', async () => {
    const r = getRepos();
    const [a, b] = [newCompany(), newCompany()];
    const t1 = await r.tractors.create(tractor(a));
    const t2 = await r.tractors.create(tractor(a, { unitNumber: 'T-200' }));
    await r.tractors.create(tractor(b));
    const tr = await r.trailers.create(trailer(a));
    expect(tr.capacityTons).toBe(30.5);

    expect(ids(await r.tractors.list(a))).toEqual([t1.id, t2.id]);
    expect(await r.tractors.findById(b, t1.id)).toBeNull();
    expect(await r.tractors.update(b, t1.id, { plates: 'X' })).toBeNull();
    expect(await r.tractors.update(a, t1.id, { plates: 'NEW-1', status: 'maintenance' })).toMatchObject({
      plates: 'NEW-1',
      status: 'maintenance',
      companyId: a,
    });
    expect(await r.tractors.countByCompany(a)).toBe(2);
    expect(await r.trailers.countByCompany(a)).toBe(1);
    expect(await r.trailers.countByCompany(b)).toBe(0);
    expect(await r.trailers.findById(a, tr.id)).toEqual(tr);
    expect(await r.trailers.update(a, tr.id, { status: 'in_trip' })).toMatchObject({ status: 'in_trip' });
    expect(await r.tractors.remove(b, t1.id)).toBe(false);
    expect(await r.tractors.remove(a, t1.id)).toBe(true);
    expect(await r.trailers.remove(a, tr.id)).toBe(true);
    expect(ids(await r.tractors.list(a))).toEqual([t2.id]);
  });

  test('posición del tracto: un punto viejo no pisa uno nuevo', async () => {
    const r = getRepos();
    const a = newCompany();
    const t = await r.tractors.create(tractor(a));
    expect(await r.tractors.livePositions(a)).toEqual([]);
    await r.tractors.touchPosition(a, t.id, 19.1, -99.1, '2026-09-10T10:00:00.000Z');
    await r.tractors.touchPosition(a, t.id, 18.0, -98.0, '2026-09-10T09:00:00.000Z');
    await r.tractors.touchPosition(newCompany(), t.id, 0, 0, '2026-09-11T00:00:00.000Z');
    expect(await r.tractors.livePositions(a)).toEqual([
      { tractorId: t.id, unitNumber: 'T-100', lat: 19.1, lng: -99.1, speedKph: null, headingDeg: null, lastSeenAt: '2026-09-10T10:00:00.000Z' },
    ]);
  });

  test('dispositivos: IMEI único global, externalId inmutable, markSeen monotónico', async () => {
    const r = getRepos();
    const [a, b] = [newCompany(), newCompany()];
    const d = await r.devices.create(device(a));
    await expect(r.devices.create(device(b, { externalId: d.externalId }))).rejects.toThrow(/externalId duplicado/);
    expect((await r.devices.findByExternalId(d.externalId))?.id).toBe(d.id);
    expect(await r.devices.findById(b, d.id)).toBeNull();
    expect(await r.devices.list(b)).toEqual([]);

    const updated = await r.devices.update(a, d.id, { label: 'GV300', externalId: 'otro' } as Partial<DeviceDto>);
    expect(updated).toMatchObject({ label: 'GV300', externalId: d.externalId });
    expect(await r.devices.update(a, d.id, { vehicleId: 'trc_1', vehicleKind: 'tractor' })).toMatchObject({
      vehicleId: 'trc_1',
      vehicleKind: 'tractor',
    });

    expect(await r.devices.markSeen(a, d.id, '2026-09-10T10:00:00.000Z')).toMatchObject({
      status: 'active',
      lastSeenAt: '2026-09-10T10:00:00.000Z',
    });
    expect(await r.devices.markSeen(a, d.id, '2026-09-10T09:00:00.000Z')).toMatchObject({
      lastSeenAt: '2026-09-10T10:00:00.000Z',
    });
    await r.devices.update(a, d.id, { status: 'inactive' });
    expect((await r.devices.markSeen(a, d.id, '2026-09-11T00:00:00.000Z'))?.status).toBe('inactive');
    expect(await r.devices.markSeen(b, d.id, '2026-09-12T00:00:00.000Z')).toBeNull();

    expect(await r.devices.remove(b, d.id)).toBe(false);
    expect(await r.devices.remove(a, d.id)).toBe(true);
    // Al borrarlo, el IMEI queda libre.
    await r.devices.create(device(b, { externalId: d.externalId }));
  });

  test('telemetría: dedupe por (deviceId, recordedAt) dentro del lote y entre lotes', async () => {
    const r = getRepos();
    const a = newCompany();
    const dev = randomUUID();
    const p1 = point(a, dev, '2026-09-10T10:00:00.000Z');
    const p2 = point(a, dev, '2026-09-10T10:00:30.000Z');
    const p1dup = point(a, dev, '2026-09-10T10:00:00.000Z', { lat: 1 });
    expect(await r.telemetry.insertMany([p1, p2, p1dup])).toEqual([true, true, false]);
    expect(await r.telemetry.insertMany([point(a, dev, '2026-09-10T10:00:30.000Z'), point(a, dev, '2026-09-10T10:01:00.000Z')])).toEqual([
      false,
      true,
    ]);
    expect(await r.telemetry.insert(point(a, dev, '2026-09-10T10:00:00.000Z'))).toBe(false);
    // Otro equipo, mismo instante: no es duplicado.
    expect(await r.telemetry.insert(point(a, randomUUID(), '2026-09-10T10:00:00.000Z'))).toBe(true);
    expect(await r.telemetry.insertMany([])).toEqual([]);

    const stored = await r.telemetry.listByDevice(a, dev);
    expect(stored.map((p) => p.recordedAt)).toEqual([
      '2026-09-10T10:00:00.000Z',
      '2026-09-10T10:00:30.000Z',
      '2026-09-10T10:01:00.000Z',
    ]);
    expect(stored[0]).toMatchObject({ id: p1.id, lat: p1.lat, speedKph: 72.5, odometerKm: 12345.678, ignition: true, raw: { line: 'x' } });
    expect(await r.telemetry.listByDevice(newCompany(), dev)).toEqual([]);
  });

  test('dos webhooks simultáneos con el mismo lote: cada punto se guarda una vez', async () => {
    const r = getRepos();
    const a = newCompany();
    const dev = randomUUID();
    const v = { vehicleId: 'trc_c', vehicleKind: 'tractor' as const };
    const times = Array.from({ length: 20 }, (_, i) => new Date(Date.UTC(2026, 8, 10, 10, i)).toISOString());
    const [x, y] = await Promise.all([
      r.telemetry.insertMany(times.map((t) => point(a, dev, t, v))),
      r.telemetry.insertMany(times.map((t) => point(a, dev, t, v))),
    ]);
    expect(x.filter(Boolean).length + y.filter(Boolean).length).toBe(20);
    expect(await r.telemetry.countByVehicle(a, 'trc_c')).toBe(20);
    expect((await r.telemetry.lastByVehicle(a, 'trc_c'))?.recordedAt).toBe(times[19]);
  });

  test('recorrido por vehículo: rango, orden, límite y aislamiento', async () => {
    const r = getRepos();
    const [a, b] = [newCompany(), newCompany()];
    const dev = randomUUID();
    const v = { vehicleId: 'trc_1', vehicleKind: 'tractor' as const };
    const times = ['2026-08-31T23:59:59.000Z', '2026-09-01T00:00:00.000Z', '2026-09-15T12:00:00.000Z', '2026-10-01T00:00:00.000Z'];
    await r.telemetry.insertMany(times.reverse().map((t) => point(a, dev, t, v)));
    await r.telemetry.insert(point(b, randomUUID(), '2026-09-15T12:00:00.000Z', v));

    const sep = await r.telemetry.listByVehicle(a, 'trc_1', '2026-09-01T00:00:00.000Z', '2026-09-30T23:59:59.999Z', 100);
    expect(sep.map((p) => p.recordedAt)).toEqual(['2026-09-01T00:00:00.000Z', '2026-09-15T12:00:00.000Z']);
    const limited = await r.telemetry.listByVehicle(a, 'trc_1', '2026-01-01T00:00:00.000Z', '2026-12-31T00:00:00.000Z', 2);
    expect(limited.map((p) => p.recordedAt)).toEqual(['2026-08-31T23:59:59.000Z', '2026-09-01T00:00:00.000Z']);
    expect(await r.telemetry.countByVehicle(a, 'trc_1')).toBe(4);
    expect(await r.telemetry.countByVehicle(b, 'trc_1')).toBe(1);
  });

  test('última posición por vehículo: no retrocede con puntos viejos ni dentro del lote', async () => {
    const r = getRepos();
    const a = newCompany();
    const dev = randomUUID();
    const v = { vehicleId: 'trc_9', vehicleKind: 'tractor' as const };
    await r.telemetry.insertMany([
      point(a, dev, '2026-09-10T10:00:00.000Z', { ...v, lat: 1 }),
      point(a, dev, '2026-09-10T12:00:00.000Z', { ...v, lat: 3 }),
      point(a, dev, '2026-09-10T11:00:00.000Z', { ...v, lat: 2 }),
    ]);
    expect((await r.telemetry.lastByVehicle(a, 'trc_9'))?.lat).toBe(3);
    // Punto viejo (buffer del equipo) en otro lote: se guarda, pero no mueve la última posición.
    expect(await r.telemetry.insert(point(a, dev, '2026-09-09T00:00:00.000Z', { ...v, lat: 0 }))).toBe(true);
    // Otro equipo del mismo vehículo con un punto más nuevo sí la mueve.
    const dev2 = randomUUID();
    await r.telemetry.insert(point(a, dev2, '2026-09-10T13:00:00.000Z', { ...v, lat: 4 }));
    const last = await r.telemetry.lastByVehicle(a, 'trc_9');
    expect(last).toMatchObject({ lat: 4, deviceId: dev2, recordedAt: '2026-09-10T13:00:00.000Z', vehicleKind: 'tractor' });
    expect(await r.telemetry.lastByVehicle(newCompany(), 'trc_9')).toBeNull();
    // Sin vehículo: no hay última posición.
    await r.telemetry.insert(point(a, randomUUID(), '2026-09-10T14:00:00.000Z'));

    await r.telemetry.insert(point(a, randomUUID(), '2026-09-10T15:00:00.000Z', { vehicleId: 'trc_8', vehicleKind: 'tractor', lat: 8 }));
    const many = await r.telemetry.lastByVehicles(a, ['trc_9', 'trc_8', 'nada']);
    expect([...many.keys()].sort()).toEqual(['trc_8', 'trc_9']);
    expect(many.get('trc_8')?.lat).toBe(8);
    expect((await r.telemetry.lastByVehicles(a, [])).size).toBe(0);
  });

  test('tokens de ingesta: vigentes, revocación idempotente y aislamiento', async () => {
    const r = getRepos();
    const [a, b] = [newCompany(), newCompany()];
    const hash = () => randomUUID().replace(/-/g, '').padEnd(64, '0');
    const t1 = await r.tokens.create({ id: randomUUID(), companyId: a, prefix: 'g3it_abc', hash: hash(), label: 'Queclink', createdAt: '2026-09-01T00:00:00.000Z', revokedAt: null });
    const t2 = await r.tokens.create({ id: randomUUID(), companyId: a, prefix: 'g3it_def', hash: hash(), label: null, createdAt: '2026-09-02T00:00:00.000Z', revokedAt: null });
    expect(ids(await r.tokens.list(a))).toEqual([t1.id, t2.id]);
    expect(await r.tokens.list(b)).toEqual([]);
    expect(await r.tokens.revoke(b, t1.id, '2026-09-03T00:00:00.000Z')).toBeNull();
    expect((await r.tokens.revoke(a, t1.id, '2026-09-03T00:00:00.000Z'))?.revokedAt).toBe('2026-09-03T00:00:00.000Z');
    expect((await r.tokens.revoke(a, t1.id, '2026-09-04T00:00:00.000Z'))?.revokedAt).toBe('2026-09-03T00:00:00.000Z');
    const active = (await r.tokens.listActive()).filter((t) => t.companyId === a);
    expect(active).toEqual([t2]);
  });

  test('IMEIs desconocidos: contador por compañía y proveedor', async () => {
    const r = getRepos();
    const [a, b] = [newCompany(), newCompany()];
    await r.tokens.recordUnknown(a, 'queclink', '111', '2026-09-01T00:00:00.000Z');
    await r.tokens.recordUnknown(a, 'queclink', '111', '2026-09-02T00:00:00.000Z');
    await r.tokens.recordUnknown(a, 'suntech', '111', '2026-09-02T00:00:00.000Z');
    await r.tokens.recordUnknown(b, 'queclink', '111', '2026-09-02T00:00:00.000Z');
    expect(await r.tokens.listUnknown(a)).toEqual([
      { provider: 'queclink', externalId: '111', hits: 2, lastSeenAt: '2026-09-02T00:00:00.000Z' },
      { provider: 'suntech', externalId: '111', hits: 1, lastSeenAt: '2026-09-02T00:00:00.000Z' },
    ]);
    expect(await r.tokens.listUnknown(b)).toHaveLength(1);
  });

  test('ingesta de punta a punta: lote, duplicados, last position y mapa en vivo', async () => {
    const r = getRepos();
    const a = { companyId: newCompany(), tier: 'business' as TierValue, role: 'owner' as const };
    const clock = () => new Date('2026-09-10T15:00:00.000Z');
    const bus = new RecordingEventBus();
    const fleet = new FleetService(r.tractors, r.trailers, r.telemetry);
    const devices = new DevicesService(r.devices, r.tractors, r.trailers, clock);
    const svc = new TelemetryService({ ...r, bus, clock });
    const t = await fleet.createTractor(a, { unitNumber: 'T-1', plates: 'P' });
    const imei = newImei();
    const d = await devices.create(a, { provider: 'generic', externalId: imei });
    await devices.link(a, d.id, { vehicleId: t.id, vehicleKind: 'tractor' });
    const { token } = await svc.createIngestToken(a, {});

    const body = {
      points: [
        { externalId: imei, recordedAt: '2026-09-10T14:00:00Z', lat: 19.4, lng: -99.1, speedKph: 50 },
        { externalId: imei, recordedAt: '2026-09-10T14:01:00Z', lat: 19.5, lng: -99.2, speedKph: 60 },
        { externalId: imei, recordedAt: '2026-09-10T14:00:00Z', lat: 19.4, lng: -99.1 },
        { externalId: newImei(), recordedAt: '2026-09-10T14:00:00Z', lat: 19.4, lng: -99.1 },
      ],
    };
    const first = await svc.ingest('generic', token, body);
    expect(first).toMatchObject({ received: 4, accepted: 2, duplicates: 1, unknownDevices: 1 });
    expect(bus.events).toHaveLength(2);
    const again = await svc.ingest('generic', token, body);
    expect(again).toMatchObject({ accepted: 0, duplicates: 3, unknownDevices: 1 });

    expect(await devices.get(a, d.id)).toMatchObject({ status: 'active', lastSeenAt: '2026-09-10T14:01:00.000Z' });
    expect(await fleet.getTractor(a, t.id)).toMatchObject({ lastLat: 19.5, lastSeenAt: '2026-09-10T14:01:00.000Z' });
    expect(await fleet.livePositions(a)).toEqual([
      { tractorId: t.id, unitNumber: 'T-1', lat: 19.5, lng: -99.2, speedKph: 60, headingDeg: null, lastSeenAt: '2026-09-10T14:01:00.000Z' },
    ]);
    const track = await svc.vehicleTrack(a, t.id);
    expect(track.points.map((p) => p.recordedAt)).toEqual(['2026-09-10T14:00:00.000Z', '2026-09-10T14:01:00.000Z']);
    expect((await svc.listUnknownDevices(a))[0]).toMatchObject({ hits: 2 });
  });
}

describe('repos de fleet · memoria', () => {
  let repos: FleetRepos;
  beforeEach(() => {
    repos = buildRepos(null);
  });
  contract(() => repos);
});

describeIfDb('repos de fleet · Postgres', () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;
  beforeAll(async () => {
    db = await createTestDb(MIGRATIONS, 'fleet');
  });
  afterAll(async () => {
    await db?.drop();
  });
  contract(() => buildRepos(db!.pool));

  const partitions = async () => {
    const { rows } = await db!.pool.query<{ relname: string }>(
      `SELECT c.relname FROM pg_inherits i JOIN pg_class c ON c.oid = i.inhrelid
        WHERE i.inhparent = 'telemetry_points'::regclass ORDER BY c.relname`,
    );
    return rows.map((r) => r.relname);
  };
  const monthName = (d: Date) => `telemetry_points_p${d.toISOString().slice(0, 7).replace('-', '')}`;
  const addMonths = (n: number) => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + n, 1));
  };

  test('la migración deja particiones del mes anterior, el actual y los 3 siguientes', async () => {
    const names = await partitions();
    for (const n of [-1, 0, 1, 2, 3]) expect(names).toContain(monthName(addMonths(n)));
  });

  test('un punto de un mes sin partición la crea al vuelo y queda en ella (límites en UTC)', async () => {
    const repo = new PgTelemetryRepo(db!.pool);
    const a = newCompany();
    const dev = randomUUID();
    expect(await partitions()).not.toContain('telemetry_points_p201903');
    // 23:30 del 31 de marzo en CDMX = 1 de abril UTC → partición de abril.
    const inserted = await repo.insertMany([
      point(a, dev, '2019-03-15T10:00:00.000Z'),
      point(a, dev, '2019-04-01T05:30:00.000Z'),
      point(a, dev, '2031-07-04T00:00:00.000Z'),
    ]);
    expect(inserted).toEqual([true, true, true]);
    const names = await partitions();
    expect(names).toEqual(expect.arrayContaining(['telemetry_points_p201903', 'telemetry_points_p201904', 'telemetry_points_p203107']));
    const { rows } = await db!.pool.query<{ part: string; recorded_at: Date }>(
      `SELECT tableoid::regclass::text AS part, recorded_at FROM telemetry_points WHERE device_id = $1 ORDER BY recorded_at`,
      [dev],
    );
    expect(rows.map((r) => r.part.split('.').pop())).toEqual([
      'telemetry_points_p201903',
      'telemetry_points_p201904',
      'telemetry_points_p203107',
    ]);
  });

  test('ensureWindow es idempotente y seguro con varias instancias a la vez', async () => {
    const far = new Date(Date.UTC(2040, 0, 15));
    await Promise.all(Array.from({ length: 4 }, () => new PgTelemetryRepo(db!.pool).ensureWindow(far)));
    const names = await partitions();
    for (const m of ['203912', '204001', '204002', '204003', '204004']) expect(names).toContain(`telemetry_points_p${m}`);
  });

  test('retención: DROP de particiones anteriores al corte; las demás siguen', async () => {
    const repo = new PgTelemetryRepo(db!.pool);
    const a = newCompany();
    const dev = randomUUID();
    await repo.insertMany([point(a, dev, '2018-01-10T00:00:00.000Z'), point(a, dev, '2018-02-10T00:00:00.000Z')]);
    // Corte = 13 meses antes de marzo 2019 → borra lo anterior a feb 2018.
    const dropped = await repo.dropPartitionsOlderThan(13, new Date('2019-03-20T00:00:00.000Z'));
    expect(dropped).toEqual(['telemetry_points_p201801']);
    const names = await partitions();
    expect(names).not.toContain('telemetry_points_p201801');
    expect(names).toContain('telemetry_points_p201802');
    expect((await repo.listByDevice(a, dev)).map((p) => p.recordedAt)).toEqual(['2018-02-10T00:00:00.000Z']);
    // La caché de meses se olvidó del mes borrado: reinsertar recrea la partición.
    expect(await repo.insert(point(a, dev, '2018-01-10T00:00:00.000Z'))).toBe(true);
  });
});
