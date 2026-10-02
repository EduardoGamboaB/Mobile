import { createHash } from 'crypto';
import type { CartaPorteGenerator } from './carta-porte/generator';
import type { CartaPorteInput } from './carta-porte/types';
import type { PacProvider, StampResult } from './pac/pac.provider';
import type { InvoiceRecord, InvoiceRepo, StampOutcome } from './invoice.repo';

export interface StampInvoiceInput {
  invoiceId: string;
  companyId: string;
  input: CartaPorteInput;
  /** Llave de idempotencia del llamador. Default: `invoiceId`. */
  idempotencyKey?: string;
}

export interface InvoiceResult {
  invoiceId: string;
  /**
   * `in_progress`: otra instancia está timbrando esta misma factura (repetir
   * más tarde). `cancelled`: ya timbrada y cancelada.
   */
  status: 'stamped' | 'rejected' | 'in_progress' | 'cancelled';
  uuidSat?: string;
  satSeal?: string;
  stampedXml?: string;
  rejectionCode?: string;
  rejectionMessage?: string;
  guaranteeApplicable?: boolean;  // si rejected → ¿reembolsamos timbre?
  pacProvider?: string;
  pacResponseTime?: number;
  /** Intentos de timbrado registrados (solo con repo). */
  attempts?: number;
  /** true si se devolvió un resultado guardado sin llamar al PAC. */
  replayed?: boolean;
}

export interface CancelInvoiceInput {
  uuidSat: string;
  reason: '01' | '02' | '03' | '04';
  substituteUuid?: string;
  rfcIssuer: string;
  /** Con repo: marca la factura como cancelada en esa compañía. */
  companyId?: string;
}

export interface InvoiceServiceOptions {
  /** Persistencia del timbrado. Sin repo no hay idempotencia (solo tests/dev). */
  repo?: InvoiceRepo;
  now?: () => Date;
  /** Cuánto se reserva un timbrado en curso antes de que otra instancia lo retome. */
  leaseMs?: number;
}

export class InvoiceConflictError extends Error {
  readonly status = 409;
}

/**
 * Orquesta el ciclo de vida de un CFDI:
 *  1. Valida y genera XML local (CartaPorteGenerator)
 *  2. Envía a PAC para timbrado SAT
 *  3. Persiste resultado (XML timbrado o motivo de rechazo)
 *  4. Aplica garantía de reembolso si error nuestro
 *
 * Con `repo` el timbrado es idempotente por (compañía, idempotencyKey):
 *  - Repetir una factura timbrada/rechazada devuelve lo guardado sin llamar al PAC.
 *  - Solo una instancia timbra a la vez (reclamo compare-and-set con lease).
 *  - Un reintento tras fallo/timeout reenvía EXACTAMENTE el mismo XML; si el
 *    primer intento sí llegó al SAT, el PAC responde con el timbre existente
 *    (CFDI ya timbrado, código 307) en lugar de emitir otro UUID.
 *  - La misma llave con otro contenido es un conflicto (409).
 */
export class InvoiceService {
  private readonly now: () => Date;

  constructor(
    private readonly generator: CartaPorteGenerator,
    private readonly pac: PacProvider,
    private readonly opts: InvoiceServiceOptions = {},
  ) {
    this.now = opts.now ?? (() => new Date());
  }

  async stamp(input: StampInvoiceInput): Promise<InvoiceResult> {
    if (this.opts.repo) return this.stampIdempotent(this.opts.repo, input);

    // 1. Generar XML (lanza si validación falla)
    const xml = this.generator.generate(input.input);

    // 2. Enviar a PAC
    const stampResult = await this.pac.stamp({
      xml,
      invoiceId: input.invoiceId,
      companyId: input.companyId,
    });

    // 3. Empacar resultado
    return toResult(input.invoiceId, stampResult);
  }

  async cancel(input: CancelInvoiceInput): Promise<{ ok: boolean; ack?: string }> {
    if (input.reason === '01' && !input.substituteUuid) {
      throw new Error('Motivo 01 (sustitución) requiere UUID sustituto');
    }
    const r = await this.pac.cancel(input);
    if (r.ok && this.opts.repo && input.companyId) {
      await this.opts.repo.markCancelled(input.companyId, input.uuidSat, input.reason, input.substituteUuid ?? null, this.now());
    }
    return { ok: r.ok, ack: r.acknowledgmentXml };
  }

  private async stampIdempotent(repo: InvoiceRepo, input: StampInvoiceInput): Promise<InvoiceResult> {
    const key = input.idempotencyKey ?? input.invoiceId;
    const requestHash = createHash('sha256').update(JSON.stringify(input.input)).digest('hex');

    let rec = await repo.findByKey(input.companyId, key);
    if (!rec) {
      // Validación y XML antes de reservar: una entrada inválida no deja rastro.
      const xml = this.generator.generate(input.input);
      rec = (await repo.reserve({ id: input.invoiceId, companyId: input.companyId, idempotencyKey: key, requestHash, xml, now: this.now().toISOString() })).record;
    }
    if (rec.requestHash !== requestHash) {
      throw new InvoiceConflictError(`La llave de idempotencia ${key} ya se usó con otro contenido`);
    }
    if (rec.status === 'stamped' || rec.status === 'rejected' || rec.status === 'cancelled') {
      return { ...fromRecord(rec), replayed: true };
    }

    const claimed = await repo.claimStamp(input.companyId, rec.id, this.now(), this.opts.leaseMs ?? 120_000);
    if (!claimed) {
      const cur = (await repo.findByKey(input.companyId, key)) ?? rec;
      return cur.status === 'stamping' ? { invoiceId: cur.id, status: 'in_progress', attempts: cur.stampAttempts } : { ...fromRecord(cur), replayed: true };
    }

    let result: StampResult;
    try {
      result = await this.pac.stamp({ xml: claimed.xml, invoiceId: claimed.id, companyId: claimed.companyId });
    } catch (e) {
      await repo.completeStamp(claimed.companyId, claimed.id, claimed.stampAttempts, {
        kind: 'error',
        errorMessage: (e as Error).message,
        pacProvider: this.pac.name,
      }, this.now());
      throw e;
    }
    const saved = await repo.completeStamp(claimed.companyId, claimed.id, claimed.stampAttempts, toOutcome(result), this.now());
    return { ...toResult(claimed.id, result), attempts: saved?.stampAttempts ?? claimed.stampAttempts };
  }
}

function toResult(invoiceId: string, r: StampResult): InvoiceResult {
  if (r.ok) {
    return {
      invoiceId,
      status: 'stamped',
      uuidSat: r.uuidSat,
      satSeal: r.satSeal,
      stampedXml: r.stampedXml,
      pacProvider: r.pacProvider,
      pacResponseTime: r.pacResponseTime,
    };
  }
  return {
    invoiceId,
    status: 'rejected',
    rejectionCode: r.errorCode,
    rejectionMessage: r.errorMessage,
    guaranteeApplicable: r.isOurError,
    pacProvider: r.pacProvider,
    pacResponseTime: r.pacResponseTime,
  };
}

/** Rechazo del SAT (XML malo) = definitivo; error nuestro/del PAC = reintentable. */
function toOutcome(r: StampResult): StampOutcome {
  if (r.ok) {
    return {
      kind: 'stamped',
      uuidSat: r.uuidSat,
      satSeal: r.satSeal,
      satCertificateNumber: r.satCertificateNumber,
      stampedXml: r.stampedXml,
      stampedAt: r.stampingDate,
      pacProvider: r.pacProvider,
      pacResponseTime: r.pacResponseTime,
    };
  }
  return {
    kind: r.isOurError ? 'failed' : 'rejected',
    errorCode: r.errorCode,
    errorMessage: r.errorMessage,
    guaranteeApplicable: r.isOurError,
    pacProvider: r.pacProvider,
    pacResponseTime: r.pacResponseTime,
  };
}

function fromRecord(r: InvoiceRecord): InvoiceResult {
  const base = { invoiceId: r.id, attempts: r.stampAttempts, pacProvider: r.pacProvider ?? undefined, pacResponseTime: r.pacResponseTime ?? undefined };
  if (r.status === 'stamped' || r.status === 'cancelled') {
    return { ...base, status: r.status, uuidSat: r.uuidSat ?? undefined, satSeal: r.satSeal ?? undefined, stampedXml: r.stampedXml ?? undefined };
  }
  return {
    ...base,
    status: 'rejected',
    rejectionCode: r.rejectionCode ?? undefined,
    rejectionMessage: r.rejectionMessage ?? undefined,
    guaranteeApplicable: r.guaranteeApplicable ?? undefined,
  };
}
