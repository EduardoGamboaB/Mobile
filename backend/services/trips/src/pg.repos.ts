import type { EvidenceDto, ExpensePolicyDto, LogbookEntryDto, TripDto, TripStatus } from '@g3/contracts';
import { iso, num, type Queryable } from '@g3/platform';
import type {
  EvidenceRepo,
  ExpensePolicyRepo,
  LogbookRepo,
  TripListFilter,
  TripRepo,
  TripReportFilter,
  TripTransitionPatch,
} from './repos';

/**
 * Repos Postgres de trips (schema `trips`, ver migrations/ y
 * docs/data-model/trips.md). Misma semántica que los repos en memoria; los
 * tests de contrato corren contra ambos. Toda consulta filtra por company_id.
 */

type Row = Record<string, unknown>;

const s = (v: unknown) => (v == null ? null : String(v));
const isoReq = (v: unknown) => iso(v as Date)!;

/** camelCase del DTO → columna. Solo estas columnas se pueden escribir en `update`. */
const TRIP_COLUMNS: Record<keyof TripDto, string> = {
  id: 'id',
  companyId: 'company_id',
  folio: 'folio',
  status: 'status',
  driverId: 'driver_id',
  tractorId: 'tractor_id',
  trailerId: 'trailer_id',
  clientName: 'client_name',
  cargo: 'cargo',
  origin: 'origin',
  destination: 'destination',
  scheduledAt: 'scheduled_at',
  estimatedUnloadAt: 'estimated_unload_at',
  tons: 'tons',
  pricePerTon: 'price_per_ton',
  freightAmount: 'freight_amount',
  driverCommission: 'driver_commission',
  estimatedTolls: 'estimated_tolls',
  estimatedDiesel: 'estimated_diesel',
  notes: 'notes',
  startedAt: 'started_at',
  preClosedAt: 'pre_closed_at',
  closedAt: 'closed_at',
  cancelledAt: 'cancelled_at',
  paymentStatus: 'payment_status',
  paymentReleasedAt: 'payment_released_at',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};
const TRIP_KEYS = Object.keys(TRIP_COLUMNS) as (keyof TripDto)[];
const IMMUTABLE: (keyof TripDto)[] = ['id', 'companyId'];

const REF_DATE = 'COALESCE(scheduled_at, started_at, created_at)';

function toTrip(r: Row): TripDto {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    folio: String(r.folio),
    status: r.status as TripStatus,
    driverId: s(r.driver_id),
    tractorId: s(r.tractor_id),
    trailerId: s(r.trailer_id),
    clientName: s(r.client_name),
    cargo: s(r.cargo),
    origin: String(r.origin),
    destination: String(r.destination),
    scheduledAt: iso(r.scheduled_at as Date | null),
    estimatedUnloadAt: iso(r.estimated_unload_at as Date | null),
    tons: num(r.tons as string | null),
    pricePerTon: num(r.price_per_ton as string | null),
    freightAmount: num(r.freight_amount as string | null),
    driverCommission: num(r.driver_commission as string | null),
    estimatedTolls: num(r.estimated_tolls as string | null),
    estimatedDiesel: num(r.estimated_diesel as string | null),
    notes: s(r.notes),
    startedAt: iso(r.started_at as Date | null),
    preClosedAt: iso(r.pre_closed_at as Date | null),
    closedAt: iso(r.closed_at as Date | null),
    cancelledAt: iso(r.cancelled_at as Date | null),
    paymentStatus: r.payment_status as TripDto['paymentStatus'],
    paymentReleasedAt: iso(r.payment_released_at as Date | null),
    createdAt: isoReq(r.created_at),
    updatedAt: isoReq(r.updated_at),
  };
}

export class PgTripRepo implements TripRepo {
  constructor(private readonly db: Queryable) {}

  async list(companyId: string, filter: TripListFilter = {}) {
    const params: unknown[] = [companyId];
    let where = 'company_id = $1';
    if (filter.status) {
      params.push(filter.status);
      where += ` AND status = $${params.length}`;
    }
    if (filter.driverId) {
      params.push(filter.driverId);
      where += ` AND driver_id = $${params.length}`;
    }
    const { rows } = await this.db.query(`SELECT * FROM trips WHERE ${where} ORDER BY created_at, id COLLATE "C"`, params);
    return rows.map(toTrip);
  }

  async findById(companyId: string, id: string) {
    const { rows } = await this.db.query('SELECT * FROM trips WHERE company_id = $1 AND id = $2', [companyId, id]);
    return rows[0] ? toTrip(rows[0]) : null;
  }

  async create(t: TripDto) {
    const cols = TRIP_KEYS.map((k) => TRIP_COLUMNS[k]);
    const { rows } = await this.db.query(
      `INSERT INTO trips (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
      TRIP_KEYS.map((k) => t[k]),
    );
    return toTrip(rows[0]);
  }

  async update(companyId: string, id: string, patch: Partial<TripDto>) {
    const keys = (Object.keys(patch) as (keyof TripDto)[]).filter(
      (k) => k in TRIP_COLUMNS && !IMMUTABLE.includes(k) && patch[k] !== undefined,
    );
    if (keys.length === 0) return this.findById(companyId, id);
    const sets = keys.map((k, i) => `${TRIP_COLUMNS[k]} = $${i + 3}`);
    const { rows } = await this.db.query(
      `UPDATE trips SET ${sets.join(', ')} WHERE company_id = $1 AND id = $2 RETURNING *`,
      [companyId, id, ...keys.map((k) => patch[k])],
    );
    return rows[0] ? toTrip(rows[0]) : null;
  }

  /** `UPDATE … WHERE status = $from`: si otro request ya movió el viaje, no actualiza nada. */
  async transition(companyId: string, id: string, from: TripStatus, to: TripStatus, patch: TripTransitionPatch) {
    const { rows } = await this.db.query(
      `UPDATE trips
          SET status = $4,
              updated_at = $5,
              started_at = COALESCE($6, started_at),
              pre_closed_at = COALESCE($7, pre_closed_at),
              closed_at = COALESCE($8, closed_at),
              cancelled_at = COALESCE($9, cancelled_at)
        WHERE company_id = $1 AND id = $2 AND status = $3
        RETURNING *`,
      [
        companyId,
        id,
        from,
        to,
        patch.updatedAt,
        patch.startedAt ?? null,
        patch.preClosedAt ?? null,
        patch.closedAt ?? null,
        patch.cancelledAt ?? null,
      ],
    );
    return rows[0] ? toTrip(rows[0]) : null;
  }

  async releasePayment(companyId: string, id: string, payable: readonly TripStatus[], at: string) {
    const { rows } = await this.db.query(
      `UPDATE trips
          SET payment_status = 'released', payment_released_at = $4, updated_at = $4
        WHERE company_id = $1 AND id = $2 AND payment_status = 'pending' AND status = ANY($3::text[])
        RETURNING *`,
      [companyId, id, [...payable], at],
    );
    return rows[0] ? toTrip(rows[0]) : null;
  }

  async nextFolioSeq(companyId: string, year: number) {
    const { rows } = await this.db.query<{ last_value: number }>(
      `INSERT INTO trip_folio_counters (company_id, year, last_value) VALUES ($1, $2, 1)
       ON CONFLICT (company_id, year) DO UPDATE SET last_value = trip_folio_counters.last_value + 1
       RETURNING last_value`,
      [companyId, year],
    );
    return Number(rows[0].last_value);
  }

  async countInCurrentMonth(companyId: string) {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const { rows } = await this.db.query<{ n: string }>(
      `SELECT count(*) AS n FROM trips
        WHERE company_id = $1 AND COALESCE(scheduled_at, started_at, $4) >= $2 AND COALESCE(scheduled_at, started_at, $4) < $3`,
      [companyId, start, end, now],
    );
    return Number(rows[0].n);
  }

  async countTotalForCompany(companyId: string) {
    const { rows } = await this.db.query<{ n: string }>('SELECT count(*) AS n FROM trips WHERE company_id = $1', [
      companyId,
    ]);
    return Number(rows[0].n);
  }

  async listByVehicle(companyId: string, vehicleId: string, statuses: readonly TripStatus[]) {
    const { rows } = await this.db.query(
      `SELECT * FROM trips
        WHERE company_id = $1 AND status = ANY($3::text[]) AND (tractor_id = $2 OR trailer_id = $2)
        ORDER BY created_at, id COLLATE "C"`,
      [companyId, vehicleId, [...statuses]],
    );
    return rows.map(toTrip);
  }

  async listForReport(companyId: string, f: TripReportFilter) {
    const params: unknown[] = [companyId];
    const where = ['company_id = $1'];
    const add = (sql: (p: string) => string, v: unknown) => {
      params.push(v);
      where.push(sql(`$${params.length}`));
    };
    if (f.statuses) add((p) => `status = ANY(${p}::text[])`, f.statuses);
    else where.push(`status NOT IN ('draft', 'cancelled')`);
    if (f.driverId) add((p) => `driver_id = ${p}`, f.driverId);
    if (f.tractorId) add((p) => `tractor_id = ${p}`, f.tractorId);
    if (f.fromMs != null) add((p) => `${REF_DATE} >= ${p}`, new Date(f.fromMs));
    if (f.toMs != null) add((p) => `${REF_DATE} <= ${p}`, new Date(f.toMs));
    const { rows } = await this.db.query(
      `SELECT * FROM trips WHERE ${where.join(' AND ')} ORDER BY ${REF_DATE} DESC, id COLLATE "C"`,
      params,
    );
    return rows.map(toTrip);
  }
}

// ── Bitácora ──────────────────────────────────────────────────────────────

const LOGBOOK_COLUMNS: Record<keyof LogbookEntryDto, string> = {
  id: 'id',
  companyId: 'company_id',
  clientUuid: 'client_uuid',
  tripId: 'trip_id',
  driverId: 'driver_id',
  eventType: 'event_type',
  occurredAt: 'occurred_at',
  locationText: 'location_text',
  lat: 'lat',
  lng: 'lng',
  odometerKm: 'odometer_km',
  fuel: 'fuel',
  expenseAmount: 'expense_amount',
  expenseConcept: 'expense_concept',
  expenseHasReceipt: 'expense_has_receipt',
  comments: 'comments',
  createdAt: 'created_at',
};
const LOGBOOK_KEYS = Object.keys(LOGBOOK_COLUMNS) as (keyof LogbookEntryDto)[];

function toLogbook(r: Row): LogbookEntryDto {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    clientUuid: String(r.client_uuid),
    tripId: String(r.trip_id),
    driverId: String(r.driver_id),
    eventType: r.event_type as LogbookEntryDto['eventType'],
    occurredAt: isoReq(r.occurred_at),
    locationText: s(r.location_text),
    lat: r.lat == null ? null : Number(r.lat),
    lng: r.lng == null ? null : Number(r.lng),
    odometerKm: num(r.odometer_km as string | null),
    fuel: (r.fuel ?? null) as LogbookEntryDto['fuel'],
    expenseAmount: num(r.expense_amount as string | null),
    expenseConcept: s(r.expense_concept),
    expenseHasReceipt: Boolean(r.expense_has_receipt),
    comments: s(r.comments),
    createdAt: isoReq(r.created_at),
  };
}

/** INSERT idempotente por (company_id, client_uuid): `ON CONFLICT DO NOTHING` + SELECT. */
async function insertIdempotent<T>(
  db: Queryable,
  table: string,
  columns: string[],
  values: unknown[],
  companyId: string,
  clientUuid: string,
  map: (r: Row) => T,
): Promise<T> {
  const { rows } = await db.query(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})
     ON CONFLICT (company_id, client_uuid) DO NOTHING RETURNING *`,
    values,
  );
  if (rows[0]) return map(rows[0]);
  const existing = await db.query(`SELECT * FROM ${table} WHERE company_id = $1 AND client_uuid = $2`, [
    companyId,
    clientUuid,
  ]);
  return map(existing.rows[0]);
}

export class PgLogbookRepo implements LogbookRepo {
  constructor(private readonly db: Queryable) {}

  async findByClientUuid(companyId: string, clientUuid: string) {
    const { rows } = await this.db.query('SELECT * FROM logbook_entries WHERE company_id = $1 AND client_uuid = $2', [
      companyId,
      clientUuid,
    ]);
    return rows[0] ? toLogbook(rows[0]) : null;
  }

  async listByTrip(companyId: string, tripId: string) {
    const { rows } = await this.db.query(
      `SELECT * FROM logbook_entries WHERE company_id = $1 AND trip_id = $2
        ORDER BY occurred_at, created_at, id COLLATE "C"`,
      [companyId, tripId],
    );
    return rows.map(toLogbook);
  }

  async listByTrips(companyId: string, tripIds: string[]) {
    if (tripIds.length === 0) return [];
    const { rows } = await this.db.query(
      `SELECT * FROM logbook_entries WHERE company_id = $1 AND trip_id = ANY($2::text[])
        ORDER BY trip_id, occurred_at, id COLLATE "C"`,
      [companyId, tripIds],
    );
    return rows.map(toLogbook);
  }

  create(e: LogbookEntryDto) {
    return insertIdempotent(
      this.db,
      'logbook_entries',
      LOGBOOK_KEYS.map((k) => LOGBOOK_COLUMNS[k]),
      LOGBOOK_KEYS.map((k) => e[k] ?? null),
      e.companyId,
      e.clientUuid,
      toLogbook,
    );
  }
}

// ── Evidencias ────────────────────────────────────────────────────────────

const EVIDENCE_COLUMNS: Record<keyof EvidenceDto, string> = {
  id: 'id',
  companyId: 'company_id',
  clientUuid: 'client_uuid',
  tripId: 'trip_id',
  logbookId: 'logbook_id',
  incidentId: 'incident_id',
  driverId: 'driver_id',
  type: 'type',
  storagePath: 'storage_path',
  mimeType: 'mime_type',
  sizeBytes: 'size_bytes',
  lat: 'lat',
  lng: 'lng',
  takenAt: 'taken_at',
  createdAt: 'created_at',
};
const EVIDENCE_KEYS = Object.keys(EVIDENCE_COLUMNS) as (keyof EvidenceDto)[];

function toEvidence(r: Row): EvidenceDto {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    clientUuid: String(r.client_uuid),
    tripId: s(r.trip_id),
    logbookId: s(r.logbook_id),
    incidentId: s(r.incident_id),
    driverId: String(r.driver_id),
    type: r.type as EvidenceDto['type'],
    storagePath: String(r.storage_path),
    mimeType: s(r.mime_type),
    // bigint llega como string.
    sizeBytes: r.size_bytes == null ? null : Number(r.size_bytes),
    lat: r.lat == null ? null : Number(r.lat),
    lng: r.lng == null ? null : Number(r.lng),
    takenAt: iso(r.taken_at as Date | null),
    createdAt: isoReq(r.created_at),
  };
}

export class PgEvidenceRepo implements EvidenceRepo {
  constructor(private readonly db: Queryable) {}

  async findByClientUuid(companyId: string, clientUuid: string) {
    const { rows } = await this.db.query('SELECT * FROM evidences WHERE company_id = $1 AND client_uuid = $2', [
      companyId,
      clientUuid,
    ]);
    return rows[0] ? toEvidence(rows[0]) : null;
  }

  async listByTrip(companyId: string, tripId: string) {
    const { rows } = await this.db.query(
      `SELECT * FROM evidences WHERE company_id = $1 AND trip_id = $2 ORDER BY created_at DESC, id COLLATE "C"`,
      [companyId, tripId],
    );
    return rows.map(toEvidence);
  }

  create(e: EvidenceDto) {
    return insertIdempotent(
      this.db,
      'evidences',
      EVIDENCE_KEYS.map((k) => EVIDENCE_COLUMNS[k]),
      EVIDENCE_KEYS.map((k) => e[k] ?? null),
      e.companyId,
      e.clientUuid,
      toEvidence,
    );
  }
}

// ── Política de gastos ────────────────────────────────────────────────────

function toPolicy(r: Row): ExpensePolicyDto {
  return {
    companyId: String(r.company_id),
    allowManualExpense: Boolean(r.allow_manual_expense),
    manualMaxAmount: num(r.manual_max_amount as string | null),
    requireReceipt: Boolean(r.require_receipt),
    updatedAt: isoReq(r.updated_at),
  };
}

export class PgExpensePolicyRepo implements ExpensePolicyRepo {
  constructor(private readonly db: Queryable) {}

  async get(companyId: string) {
    const { rows } = await this.db.query('SELECT * FROM expense_policies WHERE company_id = $1', [companyId]);
    return rows[0] ? toPolicy(rows[0]) : null;
  }

  async put(p: ExpensePolicyDto) {
    const { rows } = await this.db.query(
      `INSERT INTO expense_policies (company_id, allow_manual_expense, manual_max_amount, require_receipt, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (company_id) DO UPDATE SET
         allow_manual_expense = EXCLUDED.allow_manual_expense,
         manual_max_amount = EXCLUDED.manual_max_amount,
         require_receipt = EXCLUDED.require_receipt,
         updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [p.companyId, p.allowManualExpense, p.manualMaxAmount, p.requireReceipt, p.updatedAt],
    );
    return toPolicy(rows[0]);
  }
}
