import type { Pool } from 'pg';
import type {
  AlertRuleDto,
  AlertRuleTrigger,
  IncidentCommentDto,
  IncidentDto,
  IncidentStatus,
  NotificationChannel,
  OperationalSignalDto,
} from '@g3/contracts';
import { iso, withTransaction, type Queryable } from '@g3/platform';
import type {
  AlertRuleRepo,
  ContactDirectory,
  EscalationStage,
  FolioFormatter,
  IncidentListFilter,
  IncidentPatch,
  IncidentRepo,
  NewIncident,
  TrackedSignal,
  VehicleSignalRepo,
} from './incidents.repo';
import type { Recipient } from './notifier';

// ── Incidentes ────────────────────────────────────────────────────────────

interface IncidentRow {
  id: string;
  company_id: string;
  folio: string;
  client_uuid: string | null;
  source: IncidentDto['source'];
  type: IncidentDto['type'];
  urgency: IncidentDto['urgency'];
  status: IncidentStatus;
  title: string;
  description: string;
  trip_id: string | null;
  driver_id: string | null;
  vehicle_id: string | null;
  assignee_id: string | null;
  occurred_at: Date;
  location_text: string | null;
  lat: number | null;
  lng: number | null;
  evidence_ids: string[];
  sla_ack_due_at: Date;
  sla_resolve_due_at: Date;
  acknowledged_at: Date | null;
  resolved_at: Date | null;
  closed_at: Date | null;
  escalation_level: number;
  created_at: Date;
  updated_at: Date;
}

const INCIDENT_COLS = `id, company_id, folio, client_uuid, source, type, urgency, status, title, description,
  trip_id, driver_id, vehicle_id, assignee_id, occurred_at, location_text, lat, lng, evidence_ids,
  sla_ack_due_at, sla_resolve_due_at, acknowledged_at, resolved_at, closed_at, escalation_level, created_at, updated_at`;

const toIncident = (r: IncidentRow): IncidentDto => ({
  id: r.id,
  companyId: r.company_id,
  folio: r.folio,
  clientUuid: r.client_uuid,
  source: r.source,
  type: r.type,
  urgency: r.urgency,
  status: r.status,
  title: r.title,
  description: r.description,
  tripId: r.trip_id,
  driverId: r.driver_id,
  vehicleId: r.vehicle_id,
  assigneeId: r.assignee_id,
  occurredAt: iso(r.occurred_at)!,
  locationText: r.location_text,
  lat: r.lat,
  lng: r.lng,
  evidenceIds: r.evidence_ids ?? [],
  slaAckDueAt: iso(r.sla_ack_due_at)!,
  slaResolveDueAt: iso(r.sla_resolve_due_at)!,
  acknowledgedAt: iso(r.acknowledged_at),
  resolvedAt: iso(r.resolved_at),
  closedAt: iso(r.closed_at),
  escalationLevel: Number(r.escalation_level),
  createdAt: iso(r.created_at)!,
  updatedAt: iso(r.updated_at)!,
});

/** Columna de cada campo mutable (`IncidentPatch`). */
const PATCH_COLUMNS: Record<keyof IncidentPatch, string> = {
  status: 'status',
  assigneeId: 'assignee_id',
  vehicleId: 'vehicle_id',
  acknowledgedAt: 'acknowledged_at',
  resolvedAt: 'resolved_at',
  closedAt: 'closed_at',
  escalationLevel: 'escalation_level',
  updatedAt: 'updated_at',
};

class DuplicateClientUuid extends Error {}

export class PgIncidentRepo implements IncidentRepo {
  constructor(private readonly pool: Pool) {}

  async create(draft: NewIncident, folioOf: FolioFormatter) {
    if (draft.clientUuid) {
      const existing = await this.findByClientUuid(draft.companyId, draft.clientUuid);
      if (existing) return { incident: existing, created: false };
    }
    try {
      const incident = await withTransaction(this.pool, async (tx) => {
        const year = new Date(draft.createdAt).getUTCFullYear();
        // Contador por compañía/año: el ON CONFLICT DO UPDATE toma el bloqueo de
        // la fila, así que dos altas simultáneas obtienen números distintos.
        const { rows: [counter] } = await tx.query<{ last_seq: number }>(
          `INSERT INTO incident_folio_counters (company_id, year, last_seq) VALUES ($1, $2, 1)
           ON CONFLICT (company_id, year) DO UPDATE SET last_seq = incident_folio_counters.last_seq + 1
           RETURNING last_seq`,
          [draft.companyId, year],
        );
        const { rows } = await tx.query<IncidentRow>(
          `INSERT INTO incidents (${INCIDENT_COLS})
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
                   $20, $21, $22, $23, $24, $25, $26, $27)
           ON CONFLICT (company_id, client_uuid) DO NOTHING
           RETURNING ${INCIDENT_COLS}`,
          [
            draft.id, draft.companyId, folioOf(year, Number(counter.last_seq)), draft.clientUuid, draft.source, draft.type,
            draft.urgency, draft.status, draft.title, draft.description, draft.tripId, draft.driverId, draft.vehicleId,
            draft.assigneeId, draft.occurredAt, draft.locationText, draft.lat, draft.lng, draft.evidenceIds,
            draft.slaAckDueAt, draft.slaResolveDueAt, draft.acknowledgedAt, draft.resolvedAt, draft.closedAt,
            draft.escalationLevel, draft.createdAt, draft.updatedAt,
          ],
        );
        // Otra alta con el mismo clientUuid ganó: ROLLBACK (no se consume folio).
        if (!rows[0]) throw new DuplicateClientUuid();
        return toIncident(rows[0]);
      });
      return { incident, created: true };
    } catch (e) {
      if (e instanceof DuplicateClientUuid && draft.clientUuid) {
        const existing = await this.findByClientUuid(draft.companyId, draft.clientUuid);
        if (existing) return { incident: existing, created: false };
      }
      throw e;
    }
  }

  async findById(companyId: string, id: string) {
    return this.one(`SELECT ${INCIDENT_COLS} FROM incidents WHERE company_id = $1 AND id = $2`, [companyId, id]);
  }

  async findByClientUuid(companyId: string, clientUuid: string) {
    return this.one(`SELECT ${INCIDENT_COLS} FROM incidents WHERE company_id = $1 AND client_uuid = $2`, [companyId, clientUuid]);
  }

  async list(companyId: string, f: IncidentListFilter = {}) {
    const { rows } = await this.pool.query<IncidentRow>(
      `SELECT ${INCIDENT_COLS} FROM incidents
        WHERE company_id = $1
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR urgency = $3)
          AND ($4::text IS NULL OR assignee_id = $4)
          AND ($5::text IS NULL OR trip_id = $5)
          AND ($6::text IS NULL OR driver_id = $6)
          AND ($7::text IS NULL OR vehicle_id = $7)
          AND ($8::text IS NULL OR type = $8)
          AND (NOT $9::boolean OR status NOT IN ('resolved', 'closed'))
        ORDER BY created_at DESC, id
        LIMIT $10`,
      [
        companyId, f.status ?? null, f.urgency ?? null, f.assigneeId ?? null, f.tripId ?? null, f.driverId ?? null,
        f.vehicleId ?? null, f.type ?? null, !!f.openOnly, f.limit ?? 1000,
      ],
    );
    return rows.map(toIncident);
  }

  async update(companyId: string, id: string, patch: IncidentPatch, opts: { ifStatus?: IncidentStatus } = {}) {
    const sets: string[] = [];
    const params: unknown[] = [companyId, id];
    for (const [k, v] of Object.entries(patch)) {
      const col = PATCH_COLUMNS[k as keyof IncidentPatch];
      if (!col || v === undefined) continue;
      params.push(v);
      sets.push(`${col} = $${params.length}`);
    }
    if (!sets.length) return this.findById(companyId, id);
    let where = 'company_id = $1 AND id = $2';
    if (opts.ifStatus) {
      params.push(opts.ifStatus);
      where += ` AND status = $${params.length}`;
    }
    return this.one(`UPDATE incidents SET ${sets.join(', ')} WHERE ${where} RETURNING ${INCIDENT_COLS}`, params);
  }

  async addEvidence(companyId: string, id: string, evidenceId: string, updatedAt: string) {
    const updated = await this.one(
      `UPDATE incidents SET evidence_ids = array_append(evidence_ids, $3::text), updated_at = $4
        WHERE company_id = $1 AND id = $2 AND NOT ($3::text = ANY (evidence_ids))
        RETURNING ${INCIDENT_COLS}`,
      [companyId, id, evidenceId, updatedAt],
    );
    return updated ?? this.findById(companyId, id);
  }

  async listEscalationDue(now: Date, limit = 500) {
    const { rows } = await this.pool.query<IncidentRow>(
      `SELECT ${INCIDENT_COLS} FROM incidents
        WHERE status NOT IN ('resolved', 'closed') AND escalation_level < 2
          AND ((acknowledged_at IS NULL AND escalation_level < 1 AND sla_ack_due_at < $1) OR sla_resolve_due_at < $1)
        ORDER BY sla_ack_due_at
        LIMIT $2`,
      [now, limit],
    );
    return rows.map(toIncident);
  }

  async claimEscalation(companyId: string, id: string, level: number, stage: EscalationStage, now: Date) {
    // Compare-and-set: con READ COMMITTED, un segundo barrido simultáneo espera el
    // bloqueo de la fila y vuelve a evaluar el WHERE sobre la versión nueva
    // (escalation_level ya no es menor) → 0 filas → no notifica dos veces.
    return this.one(
      `UPDATE incidents SET escalation_level = $3, updated_at = $5
        WHERE company_id = $1 AND id = $2
          AND status NOT IN ('resolved', 'closed')
          AND escalation_level < $3
          AND CASE WHEN $4::text = 'ack' THEN acknowledged_at IS NULL AND sla_ack_due_at < $5
                   ELSE sla_resolve_due_at < $5 END
        RETURNING ${INCIDENT_COLS}`,
      [companyId, id, level, stage, now],
    );
  }

  async addComment(companyId: string, c: IncidentCommentDto) {
    await this.pool.query(
      `INSERT INTO incident_comments (id, company_id, incident_id, author_id, kind, body, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [c.id, companyId, c.incidentId, c.authorId, c.kind, c.body, c.createdAt],
    );
    return { ...c };
  }

  async listComments(companyId: string, incidentId: string) {
    const { rows } = await this.pool.query<{
      id: string; incident_id: string; author_id: string | null; kind: IncidentCommentDto['kind']; body: string; created_at: Date;
    }>(
      `SELECT id, incident_id, author_id, kind, body, created_at FROM incident_comments
        WHERE company_id = $1 AND incident_id = $2 ORDER BY seq`,
      [companyId, incidentId],
    );
    return rows.map((r) => ({
      id: r.id,
      incidentId: r.incident_id,
      authorId: r.author_id,
      kind: r.kind,
      body: r.body,
      createdAt: iso(r.created_at)!,
    }));
  }

  private async one(sql: string, params: unknown[]) {
    const { rows } = await this.pool.query<IncidentRow>(sql, params);
    return rows[0] ? toIncident(rows[0]) : null;
  }
}

// ── Reglas ────────────────────────────────────────────────────────────────

interface RuleRow {
  id: string;
  company_id: string;
  name: string;
  enabled: boolean;
  trigger: AlertRuleTrigger;
  channels: NotificationChannel[];
  notify_roles: string[];
  created_at: Date;
}

const RULE_COLS = 'id, company_id, name, enabled, trigger, channels, notify_roles, created_at';

const toRule = (r: RuleRow): AlertRuleDto => ({
  id: r.id,
  companyId: r.company_id,
  name: r.name,
  enabled: r.enabled,
  trigger: r.trigger,
  channels: r.channels,
  notifyRoles: r.notify_roles,
  createdAt: iso(r.created_at)!,
});

export class PgAlertRuleRepo implements AlertRuleRepo {
  constructor(private readonly db: Queryable) {}

  async list(companyId: string) {
    const { rows } = await this.db.query<RuleRow>(
      `SELECT ${RULE_COLS} FROM alert_rules WHERE company_id = $1 ORDER BY created_at, id`,
      [companyId],
    );
    return rows.map(toRule);
  }

  async findById(companyId: string, id: string) {
    const { rows } = await this.db.query<RuleRow>(`SELECT ${RULE_COLS} FROM alert_rules WHERE company_id = $1 AND id = $2`, [companyId, id]);
    return rows[0] ? toRule(rows[0]) : null;
  }

  async save(r: AlertRuleDto) {
    const { rows } = await this.db.query<RuleRow>(
      `INSERT INTO alert_rules (id, company_id, name, enabled, trigger, channels, notify_roles, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, now())
       ON CONFLICT (id) DO UPDATE SET
         name = excluded.name, enabled = excluded.enabled, trigger = excluded.trigger,
         channels = excluded.channels, notify_roles = excluded.notify_roles, updated_at = now()
       WHERE alert_rules.company_id = excluded.company_id
       RETURNING ${RULE_COLS}`,
      [r.id, r.companyId, r.name, r.enabled, JSON.stringify(r.trigger), r.channels, r.notifyRoles, r.createdAt],
    );
    if (!rows[0]) throw new Error('La regla pertenece a otra compañía');
    return toRule(rows[0]);
  }

  async remove(companyId: string, id: string) {
    const { rowCount } = await this.db.query('DELETE FROM alert_rules WHERE company_id = $1 AND id = $2', [companyId, id]);
    return (rowCount ?? 0) > 0;
  }
}

// ── Contactos ─────────────────────────────────────────────────────────────

interface ContactRow {
  user_id: string;
  role: string;
  push_token: string | null;
  whatsapp: string | null;
}

const toRecipient = (r: ContactRow): Recipient => ({
  userId: r.user_id,
  role: r.role,
  pushToken: r.push_token,
  whatsapp: r.whatsapp,
});

export class PgContactDirectory implements ContactDirectory {
  constructor(private readonly db: Queryable) {}

  async upsert(companyId: string, r: Recipient) {
    const { rows } = await this.db.query<ContactRow>(
      `INSERT INTO notification_contacts (company_id, user_id, role, push_token, whatsapp, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (company_id, user_id) DO UPDATE SET
         role = excluded.role,
         push_token = CASE WHEN $6::boolean THEN excluded.push_token ELSE notification_contacts.push_token END,
         whatsapp = CASE WHEN $7::boolean THEN excluded.whatsapp ELSE notification_contacts.whatsapp END,
         updated_at = now()
       RETURNING user_id, role, push_token, whatsapp`,
      [
        companyId, r.userId, r.role, r.pushToken ?? null, r.whatsapp ?? null,
        r.pushToken !== undefined, r.whatsapp !== undefined,
      ],
    );
    return toRecipient(rows[0]);
  }

  async findByRoles(companyId: string, roles: string[]) {
    const { rows } = await this.db.query<ContactRow>(
      `SELECT user_id, role, push_token, whatsapp FROM notification_contacts
        WHERE company_id = $1 AND role = ANY ($2::text[]) ORDER BY user_id`,
      [companyId, roles],
    );
    return rows.map(toRecipient);
  }

  async findByUser(companyId: string, userId: string) {
    const { rows } = await this.db.query<ContactRow>(
      'SELECT user_id, role, push_token, whatsapp FROM notification_contacts WHERE company_id = $1 AND user_id = $2',
      [companyId, userId],
    );
    return rows[0] ? toRecipient(rows[0]) : null;
  }
}

// ── Última señal por unidad (device_offline) ─────────────────────────────

interface SignalRow {
  company_id: string;
  vehicle_id: string;
  trip_id: string;
  driver_id: string | null;
  speed_kph: number | null;
  lat: number;
  lng: number;
  recorded_at: Date;
}

export class PgVehicleSignalRepo implements VehicleSignalRepo {
  constructor(private readonly db: Queryable) {}

  async record(companyId: string, s: OperationalSignalDto) {
    if (!s.tripId) {
      await this.db.query('DELETE FROM vehicle_last_signals WHERE company_id = $1 AND vehicle_id = $2', [companyId, s.vehicleId]);
      return;
    }
    await this.db.query(
      `INSERT INTO vehicle_last_signals (company_id, vehicle_id, trip_id, driver_id, speed_kph, lat, lng, recorded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (company_id, vehicle_id) DO UPDATE SET
         trip_id = excluded.trip_id, driver_id = excluded.driver_id, speed_kph = excluded.speed_kph,
         lat = excluded.lat, lng = excluded.lng, recorded_at = excluded.recorded_at
       WHERE vehicle_last_signals.recorded_at < excluded.recorded_at`,
      [companyId, s.vehicleId, s.tripId, s.driverId, s.speedKph, s.lat, s.lng, s.recordedAt],
    );
  }

  async listStale(before: Date, limit = 500): Promise<TrackedSignal[]> {
    const { rows } = await this.db.query<SignalRow>(
      `SELECT company_id, vehicle_id, trip_id, driver_id, speed_kph, lat, lng, recorded_at
         FROM vehicle_last_signals WHERE recorded_at < $1 ORDER BY recorded_at LIMIT $2`,
      [before, limit],
    );
    return rows.map((r) => ({
      companyId: r.company_id,
      signal: {
        kind: 'position',
        vehicleId: r.vehicle_id,
        tripId: r.trip_id,
        driverId: r.driver_id,
        speedKph: r.speed_kph,
        lat: r.lat,
        lng: r.lng,
        recordedAt: iso(r.recorded_at)!,
      },
    }));
  }

  async claim(companyId: string, vehicleId: string, recordedAt: string) {
    const { rowCount } = await this.db.query(
      'DELETE FROM vehicle_last_signals WHERE company_id = $1 AND vehicle_id = $2 AND recorded_at = $3',
      [companyId, vehicleId, recordedAt],
    );
    return (rowCount ?? 0) > 0;
  }
}
