import type {
  DeviceDto,
  LivePosition,
  TelemetryPoint,
  TelemetryProvider,
  TractorDto,
  TrailerDto,
  UnknownDeviceHitDto,
} from '@g3/contracts';
import { iso, num, type Queryable } from '@g3/platform';
import type {
  DeviceRepo,
  IngestTokenRepo,
  StoredIngestToken,
  TelemetryRepo,
  TractorRepo,
  TrailerRepo,
} from './repos';

/**
 * Repos Postgres de fleet (schema `fleet`, ver migrations/ y
 * docs/data-model/fleet.md). Misma semántica que los repos en memoria; los
 * tests de contrato corren contra ambos. Toda consulta de negocio filtra por
 * company_id; la única búsqueda global es la del IMEI en la ingesta.
 */

type Row = Record<string, unknown>;

const s = (v: unknown) => (v == null ? null : String(v));
const f = (v: unknown) => (v == null ? null : Number(v));
const isoReq = (v: unknown) => iso(v as Date)!;

/** UPDATE con columnas permitidas (camelCase → columna); ignora `undefined` e inmutables. */
async function updateRow(
  db: Queryable,
  table: string,
  columns: Record<string, string>,
  companyId: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<Row | null> {
  const keys = Object.keys(patch).filter((k) => k in columns && patch[k] !== undefined);
  const sql =
    keys.length === 0
      ? `SELECT * FROM ${table} WHERE company_id = $1 AND id = $2`
      : `UPDATE ${table} SET ${keys.map((k, i) => `${columns[k]} = $${i + 3}`).join(', ')}
          WHERE company_id = $1 AND id = $2 RETURNING *`;
  const { rows } = await db.query(sql, [companyId, id, ...keys.map((k) => patch[k])]);
  return rows[0] ?? null;
}

async function deleteRow(db: Queryable, table: string, companyId: string, id: string) {
  const { rowCount } = await db.query(`DELETE FROM ${table} WHERE company_id = $1 AND id = $2`, [companyId, id]);
  return (rowCount ?? 0) > 0;
}

async function countRows(db: Queryable, table: string, companyId: string) {
  const { rows } = await db.query<{ n: string }>(`SELECT count(*) AS n FROM ${table} WHERE company_id = $1`, [companyId]);
  return Number(rows[0].n);
}

// ── Tractos ───────────────────────────────────────────────────────────────

const TRACTOR_MUTABLE: Record<string, string> = {
  unitNumber: 'unit_number',
  plates: 'plates',
  brand: 'brand',
  model: 'model',
  year: 'year',
  status: 'status',
  lastLat: 'last_lat',
  lastLng: 'last_lng',
  lastSeenAt: 'last_seen_at',
};

function toTractor(r: Row): TractorDto {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    unitNumber: String(r.unit_number),
    plates: String(r.plates),
    brand: s(r.brand),
    model: s(r.model),
    year: f(r.year),
    status: r.status as TractorDto['status'],
    lastLat: f(r.last_lat),
    lastLng: f(r.last_lng),
    lastSeenAt: iso(r.last_seen_at as Date | null),
  };
}

export class PgTractorRepo implements TractorRepo {
  constructor(private readonly db: Queryable) {}

  async list(companyId: string) {
    const { rows } = await this.db.query(
      'SELECT * FROM tractors WHERE company_id = $1 ORDER BY created_at, id COLLATE "C"',
      [companyId],
    );
    return rows.map(toTractor);
  }
  async findById(companyId: string, id: string) {
    const { rows } = await this.db.query('SELECT * FROM tractors WHERE company_id = $1 AND id = $2', [companyId, id]);
    return rows[0] ? toTractor(rows[0]) : null;
  }
  async create(t: TractorDto) {
    const { rows } = await this.db.query(
      `INSERT INTO tractors (id, company_id, unit_number, plates, brand, model, year, status, last_lat, last_lng, last_seen_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [t.id, t.companyId, t.unitNumber, t.plates, t.brand, t.model, t.year, t.status, t.lastLat, t.lastLng, t.lastSeenAt],
    );
    return toTractor(rows[0]);
  }
  async update(companyId: string, id: string, patch: Partial<TractorDto>) {
    const r = await updateRow(this.db, 'tractors', TRACTOR_MUTABLE, companyId, id, patch);
    return r ? toTractor(r) : null;
  }
  remove(companyId: string, id: string) {
    return deleteRow(this.db, 'tractors', companyId, id);
  }
  countByCompany(companyId: string) {
    return countRows(this.db, 'tractors', companyId);
  }
  async livePositions(companyId: string): Promise<LivePosition[]> {
    const { rows } = await this.db.query(
      `SELECT id, unit_number, last_lat, last_lng, last_seen_at FROM tractors
        WHERE company_id = $1 AND last_lat IS NOT NULL AND last_lng IS NOT NULL
        ORDER BY created_at, id COLLATE "C"`,
      [companyId],
    );
    return rows.map((r) => ({
      tractorId: String(r.id),
      unitNumber: String(r.unit_number),
      lat: Number(r.last_lat),
      lng: Number(r.last_lng),
      speedKph: null,
      headingDeg: null,
      lastSeenAt: isoReq(r.last_seen_at),
    }));
  }
  async touchPosition(companyId: string, id: string, lat: number, lng: number, seenAt: string) {
    await this.db.query(
      `UPDATE tractors SET last_lat = $3, last_lng = $4, last_seen_at = $5
        WHERE company_id = $1 AND id = $2 AND (last_seen_at IS NULL OR last_seen_at < $5)`,
      [companyId, id, lat, lng, seenAt],
    );
  }
}

// ── Remolques ─────────────────────────────────────────────────────────────

const TRAILER_MUTABLE: Record<string, string> = {
  unitNumber: 'unit_number',
  plates: 'plates',
  type: 'type',
  capacityTons: 'capacity_tons',
  status: 'status',
};

function toTrailer(r: Row): TrailerDto {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    unitNumber: String(r.unit_number),
    plates: String(r.plates),
    type: r.type as TrailerDto['type'],
    capacityTons: num(r.capacity_tons as string | null),
    status: r.status as TrailerDto['status'],
  };
}

export class PgTrailerRepo implements TrailerRepo {
  constructor(private readonly db: Queryable) {}

  async list(companyId: string) {
    const { rows } = await this.db.query(
      'SELECT * FROM trailers WHERE company_id = $1 ORDER BY created_at, id COLLATE "C"',
      [companyId],
    );
    return rows.map(toTrailer);
  }
  async findById(companyId: string, id: string) {
    const { rows } = await this.db.query('SELECT * FROM trailers WHERE company_id = $1 AND id = $2', [companyId, id]);
    return rows[0] ? toTrailer(rows[0]) : null;
  }
  async create(t: TrailerDto) {
    const { rows } = await this.db.query(
      `INSERT INTO trailers (id, company_id, unit_number, plates, type, capacity_tons, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [t.id, t.companyId, t.unitNumber, t.plates, t.type, t.capacityTons, t.status],
    );
    return toTrailer(rows[0]);
  }
  async update(companyId: string, id: string, patch: Partial<TrailerDto>) {
    const r = await updateRow(this.db, 'trailers', TRAILER_MUTABLE, companyId, id, patch);
    return r ? toTrailer(r) : null;
  }
  remove(companyId: string, id: string) {
    return deleteRow(this.db, 'trailers', companyId, id);
  }
  countByCompany(companyId: string) {
    return countRows(this.db, 'trailers', companyId);
  }
}

// ── Dispositivos ──────────────────────────────────────────────────────────

const DEVICE_MUTABLE: Record<string, string> = {
  provider: 'provider',
  label: 'label',
  vehicleId: 'vehicle_id',
  vehicleKind: 'vehicle_kind',
  status: 'status',
  lastSeenAt: 'last_seen_at',
};

function toDevice(r: Row): DeviceDto {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    provider: r.provider as TelemetryProvider,
    externalId: String(r.external_id),
    label: s(r.label),
    vehicleId: s(r.vehicle_id),
    vehicleKind: (r.vehicle_kind ?? null) as DeviceDto['vehicleKind'],
    status: r.status as DeviceDto['status'],
    lastSeenAt: iso(r.last_seen_at as Date | null),
    createdAt: isoReq(r.created_at),
  };
}

export class PgDeviceRepo implements DeviceRepo {
  constructor(private readonly db: Queryable) {}

  async list(companyId: string) {
    const { rows } = await this.db.query(
      'SELECT * FROM devices WHERE company_id = $1 ORDER BY created_at, id COLLATE "C"',
      [companyId],
    );
    return rows.map(toDevice);
  }
  async findById(companyId: string, id: string) {
    const { rows } = await this.db.query('SELECT * FROM devices WHERE company_id = $1 AND id = $2', [companyId, id]);
    return rows[0] ? toDevice(rows[0]) : null;
  }
  async findByExternalId(externalId: string) {
    const { rows } = await this.db.query('SELECT * FROM devices WHERE external_id = $1', [externalId]);
    return rows[0] ? toDevice(rows[0]) : null;
  }
  async create(d: DeviceDto) {
    try {
      const { rows } = await this.db.query(
        `INSERT INTO devices (id, company_id, provider, external_id, label, vehicle_id, vehicle_kind, status, last_seen_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [d.id, d.companyId, d.provider, d.externalId, d.label, d.vehicleId, d.vehicleKind, d.status, d.lastSeenAt, d.createdAt],
      );
      return toDevice(rows[0]);
    } catch (e) {
      const err = e as { code?: string; constraint?: string };
      if (err.code === '23505' && err.constraint === 'devices_external_id_uq') {
        throw new Error(`externalId duplicado: ${d.externalId}`);
      }
      throw e;
    }
  }
  async update(companyId: string, id: string, patch: Partial<DeviceDto>) {
    const r = await updateRow(this.db, 'devices', DEVICE_MUTABLE, companyId, id, patch);
    return r ? toDevice(r) : null;
  }
  remove(companyId: string, id: string) {
    return deleteRow(this.db, 'devices', companyId, id);
  }
  async markSeen(companyId: string, id: string, seenAt: string) {
    const { rows } = await this.db.query(
      `UPDATE devices
          SET status = CASE WHEN status = 'pending' THEN 'active' ELSE status END,
              last_seen_at = GREATEST(last_seen_at, $3::timestamptz)
        WHERE company_id = $1 AND id = $2
        RETURNING *`,
      [companyId, id, seenAt],
    );
    return rows[0] ? toDevice(rows[0]) : null;
  }
}

// ── Telemetría ────────────────────────────────────────────────────────────

/** Filas por INSERT: 17 parámetros por punto (17 000 por sentencia), lejos del límite de 65 535 de Postgres. */
export const TELEMETRY_INSERT_CHUNK = 1000;

const POINT_COLUMNS = [
  'device_id',
  'recorded_at',
  'id',
  'company_id',
  'vehicle_id',
  'vehicle_kind',
  'provider',
  'received_at',
  'lat',
  'lng',
  'speed_kph',
  'heading_deg',
  'ignition',
  'odometer_km',
  'fuel_level_pct',
  'event_code',
  'raw',
] as const;

const pointValues = (p: TelemetryPoint): unknown[] => [
  p.deviceId,
  p.recordedAt,
  p.id,
  p.companyId,
  p.vehicleId,
  p.vehicleKind,
  p.provider,
  p.receivedAt,
  p.lat,
  p.lng,
  p.speedKph,
  p.headingDeg,
  p.ignition ?? null,
  p.odometerKm ?? null,
  p.fuelLevelPct ?? null,
  p.eventCode ?? null,
  p.raw === undefined ? null : JSON.stringify(p.raw),
];

function toPoint(r: Row): TelemetryPoint {
  return {
    id: String(r.id ?? r.point_id),
    deviceId: String(r.device_id),
    vehicleId: s(r.vehicle_id),
    vehicleKind: (r.vehicle_kind ?? null) as TelemetryPoint['vehicleKind'],
    companyId: String(r.company_id),
    provider: r.provider as TelemetryProvider,
    recordedAt: isoReq(r.recorded_at),
    receivedAt: isoReq(r.received_at),
    lat: Number(r.lat),
    lng: Number(r.lng),
    speedKph: f(r.speed_kph),
    headingDeg: f(r.heading_deg),
    ignition: r.ignition == null ? null : Boolean(r.ignition),
    odometerKm: f(r.odometer_km),
    fuelLevelPct: f(r.fuel_level_pct),
    eventCode: s(r.event_code),
    raw: r.raw ?? null,
  };
}

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Primer día (UTC) del mes del instante, como llave `YYYY-MM`. */
const monthKey = (isoTs: string) => new Date(isoTs).toISOString().slice(0, 7);

export class PgTelemetryRepo implements TelemetryRepo {
  /** Meses cuya partición ya sabemos que existe (caché por instancia). */
  private readonly knownMonths = new Set<string>();

  constructor(private readonly db: Queryable) {}

  /**
   * Crea las particiones de [desde, hasta] (arranque: mes anterior + 3
   * siguientes) y recuerda los meses. Idempotente y seguro entre instancias.
   */
  async ensurePartitions(from: Date, to: Date): Promise<void> {
    await this.db.query('SELECT telemetry_ensure_partitions($1, $2)', [from, to]);
    for (let d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1)); d <= to; d.setUTCMonth(d.getUTCMonth() + 1)) {
      this.knownMonths.add(d.toISOString().slice(0, 7));
    }
  }

  /** Ventana operativa: mes anterior, actual y los 3 siguientes (arranque y job de mantenimiento). */
  async ensureWindow(now: Date = new Date()): Promise<void> {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 3, 1));
    await this.ensurePartitions(from, to);
  }

  /** Antes de insertar: la partición de cada mes del lote (casi siempre ya está en caché). */
  private async ensureMonths(points: TelemetryPoint[]) {
    for (const p of points) {
      const m = monthKey(p.recordedAt);
      if (this.knownMonths.has(m)) continue;
      await this.db.query('SELECT telemetry_ensure_partition($1)', [p.recordedAt]);
      this.knownMonths.add(m);
    }
  }

  async insert(p: TelemetryPoint) {
    return (await this.insertMany([p]))[0];
  }

  /**
   * Un INSERT multi-fila por lote con ON CONFLICT (device_id, recorded_at)
   * DO NOTHING, y en la misma sentencia (CTE) el upsert de la última posición
   * por vehículo con `WHERE recorded_at < EXCLUDED.recorded_at` (monotónica).
   */
  async insertMany(points: TelemetryPoint[]): Promise<boolean[]> {
    if (points.length === 0) return [];
    await this.ensureMonths(points);
    // Orden fijo por llave: dos lotes concurrentes con los mismos puntos en
    // distinto orden no se bloquean mutuamente (deadlock) en el ON CONFLICT.
    const sorted = [...points].sort(
      (x, y) => cmp(x.deviceId, y.deviceId) || Date.parse(x.recordedAt) - Date.parse(y.recordedAt),
    );
    const inserted = new Set<string>();
    for (let i = 0; i < sorted.length; i += TELEMETRY_INSERT_CHUNK) {
      const chunk = sorted.slice(i, i + TELEMETRY_INSERT_CHUNK);
      const params: unknown[] = [];
      const tuples = chunk.map((p) => {
        const vals = pointValues(p);
        const start = params.length;
        params.push(...vals);
        return `(${vals.map((_, j) => `$${start + j + 1}`).join(', ')})`;
      });
      const { rows } = await this.db.query<{ id: string }>(
        `WITH ins AS (
           INSERT INTO telemetry_points (${POINT_COLUMNS.join(', ')})
           VALUES ${tuples.join(', ')}
           ON CONFLICT (device_id, recorded_at) DO NOTHING
           RETURNING *
         ), latest AS (
           INSERT INTO vehicle_last_position (
             company_id, vehicle_id, vehicle_kind, device_id, point_id, provider, recorded_at, received_at,
             lat, lng, speed_kph, heading_deg, ignition, odometer_km, fuel_level_pct, event_code, raw)
           SELECT DISTINCT ON (company_id, vehicle_id)
                  company_id, vehicle_id, vehicle_kind, device_id, id, provider, recorded_at, received_at,
                  lat, lng, speed_kph, heading_deg, ignition, odometer_km, fuel_level_pct, event_code, raw
             FROM ins
            WHERE vehicle_id IS NOT NULL
            ORDER BY company_id, vehicle_id, recorded_at DESC
           ON CONFLICT (company_id, vehicle_id) DO UPDATE SET
             vehicle_kind = EXCLUDED.vehicle_kind, device_id = EXCLUDED.device_id, point_id = EXCLUDED.point_id,
             provider = EXCLUDED.provider, recorded_at = EXCLUDED.recorded_at, received_at = EXCLUDED.received_at,
             lat = EXCLUDED.lat, lng = EXCLUDED.lng, speed_kph = EXCLUDED.speed_kph,
             heading_deg = EXCLUDED.heading_deg, ignition = EXCLUDED.ignition, odometer_km = EXCLUDED.odometer_km,
             fuel_level_pct = EXCLUDED.fuel_level_pct, event_code = EXCLUDED.event_code, raw = EXCLUDED.raw
           WHERE vehicle_last_position.recorded_at < EXCLUDED.recorded_at
         )
         SELECT id FROM ins`,
        params,
      );
      for (const r of rows) inserted.add(r.id);
    }
    return points.map((p) => inserted.has(p.id));
  }

  async lastByVehicle(companyId: string, vehicleId: string) {
    const { rows } = await this.db.query(
      'SELECT * FROM vehicle_last_position WHERE company_id = $1 AND vehicle_id = $2',
      [companyId, vehicleId],
    );
    return rows[0] ? toPoint(rows[0]) : null;
  }

  async lastByVehicles(companyId: string, vehicleIds: string[]) {
    const out = new Map<string, TelemetryPoint>();
    if (vehicleIds.length === 0) return out;
    const { rows } = await this.db.query(
      'SELECT * FROM vehicle_last_position WHERE company_id = $1 AND vehicle_id = ANY($2::text[])',
      [companyId, vehicleIds],
    );
    for (const r of rows) out.set(String(r.vehicle_id), toPoint(r));
    return out;
  }

  async listByVehicle(companyId: string, vehicleId: string, fromIso: string, toIso: string, limit: number) {
    const { rows } = await this.db.query(
      `SELECT * FROM telemetry_points
        WHERE company_id = $1 AND vehicle_id = $2 AND recorded_at >= $3 AND recorded_at <= $4
        ORDER BY recorded_at, device_id COLLATE "C"
        LIMIT $5`,
      [companyId, vehicleId, fromIso, toIso, limit],
    );
    return rows.map(toPoint);
  }

  async listByDevice(companyId: string, deviceId: string) {
    const { rows } = await this.db.query(
      'SELECT * FROM telemetry_points WHERE company_id = $1 AND device_id = $2 ORDER BY recorded_at',
      [companyId, deviceId],
    );
    return rows.map(toPoint);
  }

  async countByVehicle(companyId: string, vehicleId: string) {
    const { rows } = await this.db.query<{ n: string }>(
      'SELECT count(*) AS n FROM telemetry_points WHERE company_id = $1 AND vehicle_id = $2',
      [companyId, vehicleId],
    );
    return Number(rows[0].n);
  }

  /**
   * Retención: borra las particiones de meses anteriores a `months` meses
   * antes del mes en curso (UTC). Devuelve los nombres borrados.
   */
  async dropPartitionsOlderThan(months: number, now: Date = new Date()): Promise<string[]> {
    const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1));
    const { rows } = await this.db.query<{ name: string }>('SELECT telemetry_drop_partitions_before($1) AS name', [cutoff]);
    for (const r of rows) this.knownMonths.delete(`${r.name.slice(-6, -2)}-${r.name.slice(-2)}`);
    return rows.map((r) => r.name);
  }
}

// ── Tokens de ingesta e IMEIs desconocidos ────────────────────────────────

function toToken(r: Row): StoredIngestToken {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    prefix: String(r.prefix),
    hash: String(r.hash),
    label: s(r.label),
    createdAt: isoReq(r.created_at),
    revokedAt: iso(r.revoked_at as Date | null),
  };
}

export class PgIngestTokenRepo implements IngestTokenRepo {
  constructor(private readonly db: Queryable) {}

  async create(t: StoredIngestToken) {
    const { rows } = await this.db.query(
      `INSERT INTO ingest_tokens (id, company_id, prefix, hash, label, created_at, revoked_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [t.id, t.companyId, t.prefix, t.hash, t.label, t.createdAt, t.revokedAt],
    );
    return toToken(rows[0]);
  }
  async list(companyId: string) {
    const { rows } = await this.db.query(
      'SELECT * FROM ingest_tokens WHERE company_id = $1 ORDER BY created_at, id COLLATE "C"',
      [companyId],
    );
    return rows.map(toToken);
  }
  async listActive() {
    const { rows } = await this.db.query('SELECT * FROM ingest_tokens WHERE revoked_at IS NULL');
    return rows.map(toToken);
  }
  async revoke(companyId: string, id: string, at: string) {
    const { rows } = await this.db.query(
      `UPDATE ingest_tokens SET revoked_at = COALESCE(revoked_at, $3)
        WHERE company_id = $1 AND id = $2 RETURNING *`,
      [companyId, id, at],
    );
    return rows[0] ? toToken(rows[0]) : null;
  }
  async recordUnknown(companyId: string, provider: TelemetryProvider, externalId: string, at: string) {
    await this.db.query(
      `INSERT INTO unknown_devices (company_id, provider, external_id, hits, last_seen_at)
       VALUES ($1, $2, $3, 1, $4)
       ON CONFLICT (company_id, provider, external_id)
       DO UPDATE SET hits = unknown_devices.hits + 1, last_seen_at = EXCLUDED.last_seen_at`,
      [companyId, provider, externalId, at],
    );
  }
  async listUnknown(companyId: string): Promise<UnknownDeviceHitDto[]> {
    const { rows } = await this.db.query(
      `SELECT provider, external_id, hits, last_seen_at FROM unknown_devices
        WHERE company_id = $1 ORDER BY first_seen_at, provider, external_id COLLATE "C"`,
      [companyId],
    );
    return rows.map((r) => ({
      provider: r.provider as TelemetryProvider,
      externalId: String(r.external_id),
      hits: Number(r.hits),
      lastSeenAt: isoReq(r.last_seen_at),
    }));
  }
}
