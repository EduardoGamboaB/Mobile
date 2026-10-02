import type { Pool } from 'pg';
import { iso, num, withTransaction } from '@g3/platform';
import {
  applyOutcome,
  type CancellationReason,
  type InvoiceRecord,
  type InvoiceRepo,
  type InvoiceStatus,
  type ReserveInput,
  type StampOutcome,
} from './invoice.repo';

interface Row {
  id: string;
  company_id: string;
  idempotency_key: string;
  request_hash: string;
  status: InvoiceStatus;
  xml: string;
  uuid_sat: string | null;
  sat_seal: string | null;
  sat_certificate_number: string | null;
  stamped_xml: string | null;
  stamped_at: Date | null;
  rejection_code: string | null;
  rejection_message: string | null;
  guarantee_applicable: boolean | null;
  pac_provider: string | null;
  pac_response_ms: number | null;
  stamp_attempts: number;
  locked_until: Date | null;
  cancellation_reason: CancellationReason | null;
  substitute_uuid: string | null;
  cancelled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const COLS = `id, company_id, idempotency_key, request_hash, status, xml, uuid_sat, sat_seal, sat_certificate_number,
  stamped_xml, stamped_at, rejection_code, rejection_message, guarantee_applicable, pac_provider, pac_response_ms,
  stamp_attempts, locked_until, cancellation_reason, substitute_uuid, cancelled_at, created_at, updated_at`;

const toRecord = (r: Row): InvoiceRecord => ({
  id: r.id,
  companyId: r.company_id,
  idempotencyKey: r.idempotency_key,
  requestHash: r.request_hash,
  status: r.status,
  xml: r.xml,
  uuidSat: r.uuid_sat,
  satSeal: r.sat_seal,
  satCertificateNumber: r.sat_certificate_number,
  stampedXml: r.stamped_xml,
  stampedAt: iso(r.stamped_at),
  rejectionCode: r.rejection_code,
  rejectionMessage: r.rejection_message,
  guaranteeApplicable: r.guarantee_applicable,
  pacProvider: r.pac_provider,
  pacResponseTime: num(r.pac_response_ms),
  stampAttempts: Number(r.stamp_attempts),
  lockedUntil: iso(r.locked_until),
  cancellationReason: r.cancellation_reason,
  substituteUuid: r.substitute_uuid,
  cancelledAt: iso(r.cancelled_at),
  createdAt: iso(r.created_at)!,
  updatedAt: iso(r.updated_at)!,
});

export class PgInvoiceRepo implements InvoiceRepo {
  constructor(private readonly pool: Pool) {}

  async findByKey(companyId: string, idempotencyKey: string) {
    const { rows } = await this.pool.query<Row>(
      `SELECT ${COLS} FROM invoices WHERE company_id = $1 AND idempotency_key = $2`,
      [companyId, idempotencyKey],
    );
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async reserve(r: ReserveInput) {
    const { rows } = await this.pool.query<Row>(
      `INSERT INTO invoices (id, company_id, idempotency_key, request_hash, status, xml, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $6)
       ON CONFLICT DO NOTHING
       RETURNING ${COLS}`,
      [r.id, r.companyId, r.idempotencyKey, r.requestHash, r.xml, r.now],
    );
    if (rows[0]) return { record: toRecord(rows[0]), created: true };
    const existing = await this.findByKey(r.companyId, r.idempotencyKey);
    if (!existing) throw new Error(`El id de factura ${r.id} ya existe con otra llave`);
    return { record: existing, created: false };
  }

  async claimStamp(companyId: string, id: string, now: Date, leaseMs: number) {
    // Compare-and-set: con dos instancias a la vez solo una pasa el WHERE.
    const { rows } = await this.pool.query<Row>(
      `UPDATE invoices
          SET status = 'stamping', stamp_attempts = stamp_attempts + 1,
              locked_until = $3::timestamptz + make_interval(secs => $4::double precision / 1000), updated_at = $3
        WHERE company_id = $1 AND id = $2
          AND (status IN ('pending', 'failed') OR (status = 'stamping' AND (locked_until IS NULL OR locked_until <= $3)))
        RETURNING ${COLS}`,
      [companyId, id, now, leaseMs],
    );
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async completeStamp(companyId: string, id: string, attempt: number, o: StampOutcome, now: Date) {
    return withTransaction(this.pool, async (tx) => {
      await tx.query(
        `INSERT INTO invoice_stamp_attempts (invoice_id, attempt, company_id, pac_provider, outcome, error_code, error_message, response_ms, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (invoice_id, attempt) DO NOTHING`,
        [
          id, attempt, companyId, o.pacProvider, o.kind,
          o.kind === 'rejected' || o.kind === 'failed' ? o.errorCode : null,
          o.kind === 'stamped' ? null : o.errorMessage,
          o.kind === 'stamped' || o.kind === 'rejected' || o.kind === 'failed' ? Math.round(o.pacResponseTime) : null,
          now,
        ],
      );
      const p = applyOutcome(o);
      const params: unknown[] = [
        companyId, id, p.status, p.uuidSat ?? null, p.satSeal ?? null, p.satCertificateNumber ?? null,
        p.stampedXml ?? null, p.stampedAt ?? null, p.rejectionCode ?? null, p.rejectionMessage ?? null,
        p.guaranteeApplicable ?? null, p.pacProvider ?? null,
        p.pacResponseTime == null ? null : Math.round(p.pacResponseTime), now,
      ];
      // Un timbre exitoso siempre se guarda; un fallo, solo si su intento sigue vigente.
      let guard = `status NOT IN ('stamped', 'cancelled')`;
      if (o.kind !== 'stamped') {
        params.push(attempt);
        guard = `status = 'stamping' AND stamp_attempts = $${params.length}`;
      }
      const { rows } = await tx.query<Row>(
        `UPDATE invoices SET
           status = $3, uuid_sat = coalesce($4, uuid_sat), sat_seal = coalesce($5, sat_seal),
           sat_certificate_number = coalesce($6, sat_certificate_number), stamped_xml = coalesce($7, stamped_xml),
           stamped_at = coalesce($8, stamped_at), rejection_code = $9, rejection_message = $10,
           guarantee_applicable = $11, pac_provider = $12, pac_response_ms = $13, locked_until = NULL, updated_at = $14
         WHERE company_id = $1 AND id = $2 AND ${guard}
         RETURNING ${COLS}`,
        params,
      );
      if (rows[0]) return toRecord(rows[0]);
      const { rows: cur } = await tx.query<Row>(`SELECT ${COLS} FROM invoices WHERE company_id = $1 AND id = $2`, [companyId, id]);
      return cur[0] ? toRecord(cur[0]) : null;
    });
  }

  async markCancelled(companyId: string, uuidSat: string, reason: CancellationReason, substituteUuid: string | null, now: Date) {
    const { rows } = await this.pool.query<Row>(
      `UPDATE invoices SET status = 'cancelled', cancellation_reason = $3, substitute_uuid = $4, cancelled_at = $5, updated_at = $5
        WHERE company_id = $1 AND uuid_sat = $2 AND status = 'stamped'
        RETURNING ${COLS}`,
      [companyId, uuidSat, reason, substituteUuid, now],
    );
    if (rows[0]) return toRecord(rows[0]);
    const { rows: cur } = await this.pool.query<Row>(`SELECT ${COLS} FROM invoices WHERE company_id = $1 AND uuid_sat = $2`, [companyId, uuidSat]);
    return cur[0] ? toRecord(cur[0]) : null;
  }
}
