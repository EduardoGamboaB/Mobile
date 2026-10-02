/**
 * Persistencia del timbrado (idempotencia + bitácora de intentos). Gemelos:
 * `InMemoryInvoiceRepo` (dev/tests, una réplica) y `PgInvoiceRepo`.
 */

export type InvoiceStatus = 'pending' | 'stamping' | 'stamped' | 'rejected' | 'failed' | 'cancelled';
export type CancellationReason = '01' | '02' | '03' | '04';

export interface InvoiceRecord {
  id: string;
  companyId: string;
  idempotencyKey: string;
  requestHash: string;
  status: InvoiceStatus;
  /** XML generado una sola vez; los reintentos mandan exactamente este. */
  xml: string;
  uuidSat: string | null;
  satSeal: string | null;
  satCertificateNumber: string | null;
  stampedXml: string | null;
  stampedAt: string | null;
  rejectionCode: string | null;
  rejectionMessage: string | null;
  guaranteeApplicable: boolean | null;
  pacProvider: string | null;
  pacResponseTime: number | null;
  stampAttempts: number;
  lockedUntil: string | null;
  cancellationReason: CancellationReason | null;
  substituteUuid: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type StampOutcome =
  | {
      kind: 'stamped';
      uuidSat: string;
      satSeal: string;
      satCertificateNumber: string;
      stampedXml: string;
      stampedAt: string;
      pacProvider: string;
      pacResponseTime: number;
    }
  | {
      /** `rejected`: el SAT/PAC rechazó el XML (definitivo). `failed`: error nuestro/del PAC (reintentable). */
      kind: 'rejected' | 'failed';
      errorCode: string;
      errorMessage: string;
      guaranteeApplicable: boolean;
      pacProvider: string;
      pacResponseTime: number;
    }
  /** Excepción/timeout sin respuesta del PAC (reintentable). */
  | { kind: 'error'; errorMessage: string; pacProvider: string | null };

export interface ReserveInput {
  id: string;
  companyId: string;
  idempotencyKey: string;
  requestHash: string;
  xml: string;
  now: string;
}

export interface InvoiceRepo {
  findByKey(companyId: string, idempotencyKey: string): Promise<InvoiceRecord | null>;
  /**
   * Alta en `pending`. Si la llave ya existe en la compañía devuelve la
   * existente con `created: false` (también con altas simultáneas).
   */
  reserve(r: ReserveInput): Promise<{ record: InvoiceRecord; created: boolean }>;
  /**
   * Toma el timbrado: `pending`/`failed`, o `stamping` con el lease vencido
   * (la instancia anterior murió) → `stamping`, intento + 1. Devuelve `null`
   * a quien no lo gana o si ya terminó.
   */
  claimStamp(companyId: string, id: string, now: Date, leaseMs: number): Promise<InvoiceRecord | null>;
  /**
   * Registra el intento `attempt` y aplica el resultado. Un timbre exitoso
   * siempre se guarda (salvo que ya esté timbrada/cancelada); un fallo solo
   * si ese intento sigue siendo el vigente.
   */
  completeStamp(companyId: string, id: string, attempt: number, outcome: StampOutcome, now: Date): Promise<InvoiceRecord | null>;
  markCancelled(
    companyId: string,
    uuidSat: string,
    reason: CancellationReason,
    substituteUuid: string | null,
    now: Date,
  ): Promise<InvoiceRecord | null>;
}

export class InMemoryInvoiceRepo implements InvoiceRepo {
  private readonly rows = new Map<string, InvoiceRecord>();
  readonly attempts: Array<{ invoiceId: string; attempt: number; outcome: string; pacProvider: string | null }> = [];

  async findByKey(companyId: string, idempotencyKey: string) {
    const r = this.byKey(companyId, idempotencyKey);
    return r ? { ...r } : null;
  }

  /** Sin `await` intermedios: atómico dentro del proceso. */
  async reserve(r: ReserveInput) {
    const existing = this.byKey(r.companyId, r.idempotencyKey);
    if (existing) return { record: { ...existing }, created: false };
    if (this.rows.has(r.id)) throw new Error(`El id de factura ${r.id} ya existe con otra llave`);
    const rec: InvoiceRecord = {
      id: r.id,
      companyId: r.companyId,
      idempotencyKey: r.idempotencyKey,
      requestHash: r.requestHash,
      status: 'pending',
      xml: r.xml,
      uuidSat: null,
      satSeal: null,
      satCertificateNumber: null,
      stampedXml: null,
      stampedAt: null,
      rejectionCode: null,
      rejectionMessage: null,
      guaranteeApplicable: null,
      pacProvider: null,
      pacResponseTime: null,
      stampAttempts: 0,
      lockedUntil: null,
      cancellationReason: null,
      substituteUuid: null,
      cancelledAt: null,
      createdAt: r.now,
      updatedAt: r.now,
    };
    this.rows.set(rec.id, rec);
    return { record: { ...rec }, created: true };
  }

  private byKey(companyId: string, idempotencyKey: string) {
    return [...this.rows.values()].find((x) => x.companyId === companyId && x.idempotencyKey === idempotencyKey) ?? null;
  }

  async claimStamp(companyId: string, id: string, now: Date, leaseMs: number) {
    const cur = this.rows.get(id);
    if (!cur || cur.companyId !== companyId) return null;
    const leaseExpired = cur.status === 'stamping' && (!cur.lockedUntil || Date.parse(cur.lockedUntil) <= now.getTime());
    if (!(cur.status === 'pending' || cur.status === 'failed' || leaseExpired)) return null;
    const next: InvoiceRecord = {
      ...cur,
      status: 'stamping',
      stampAttempts: cur.stampAttempts + 1,
      lockedUntil: new Date(now.getTime() + leaseMs).toISOString(),
      updatedAt: now.toISOString(),
    };
    this.rows.set(id, next);
    return { ...next };
  }

  async completeStamp(companyId: string, id: string, attempt: number, o: StampOutcome, now: Date) {
    const cur = this.rows.get(id);
    if (!cur || cur.companyId !== companyId) return null;
    this.attempts.push({ invoiceId: id, attempt, outcome: o.kind, pacProvider: o.pacProvider });
    if (o.kind === 'stamped') {
      if (cur.status === 'stamped' || cur.status === 'cancelled') return { ...cur };
    } else if (cur.status !== 'stamping' || cur.stampAttempts !== attempt) {
      return { ...cur };
    }
    const next: InvoiceRecord = { ...cur, ...applyOutcome(o), lockedUntil: null, updatedAt: now.toISOString() };
    this.rows.set(id, next);
    return { ...next };
  }

  async markCancelled(companyId: string, uuidSat: string, reason: CancellationReason, substituteUuid: string | null, now: Date) {
    const cur = [...this.rows.values()].find((r) => r.companyId === companyId && r.uuidSat === uuidSat);
    if (!cur) return null;
    // Ya cancelada (u otro estado): sin cambios, idempotente.
    if (cur.status !== 'stamped') return { ...cur };
    const next: InvoiceRecord = {
      ...cur,
      status: 'cancelled',
      cancellationReason: reason,
      substituteUuid,
      cancelledAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    this.rows.set(cur.id, next);
    return { ...next };
  }
}

/** Campos que cambia cada resultado (compartido con el repo de Postgres). */
export function applyOutcome(o: StampOutcome): Partial<InvoiceRecord> {
  switch (o.kind) {
    case 'stamped':
      return {
        status: 'stamped',
        uuidSat: o.uuidSat,
        satSeal: o.satSeal,
        satCertificateNumber: o.satCertificateNumber,
        stampedXml: o.stampedXml,
        stampedAt: o.stampedAt,
        rejectionCode: null,
        rejectionMessage: null,
        guaranteeApplicable: null,
        pacProvider: o.pacProvider,
        pacResponseTime: o.pacResponseTime,
      };
    case 'rejected':
    case 'failed':
      return {
        status: o.kind,
        rejectionCode: o.errorCode,
        rejectionMessage: o.errorMessage,
        guaranteeApplicable: o.guaranteeApplicable,
        pacProvider: o.pacProvider,
        pacResponseTime: o.pacResponseTime,
      };
    case 'error':
      return {
        status: 'failed',
        rejectionCode: null,
        rejectionMessage: o.errorMessage,
        guaranteeApplicable: null,
        pacProvider: o.pacProvider,
        pacResponseTime: null,
      };
  }
}
