import type { CartaPorteGenerator } from './carta-porte/generator';
import type { CartaPorteInput } from './carta-porte/types';
import type { PacProvider } from './pac/pac.provider';

export interface StampInvoiceInput {
  invoiceId: string;
  companyId: string;
  input: CartaPorteInput;
}

export interface InvoiceResult {
  invoiceId: string;
  status: 'stamped' | 'rejected';
  uuidSat?: string;
  satSeal?: string;
  stampedXml?: string;
  rejectionCode?: string;
  rejectionMessage?: string;
  guaranteeApplicable?: boolean;  // si rejected → ¿reembolsamos timbre?
  pacProvider?: string;
  pacResponseTime?: number;
}

export interface CancelInvoiceInput {
  uuidSat: string;
  reason: '01' | '02' | '03' | '04';
  substituteUuid?: string;
  rfcIssuer: string;
}

/**
 * Orquesta el ciclo de vida de un CFDI:
 *  1. Valida y genera XML local (CartaPorteGenerator)
 *  2. Envía a PAC para timbrado SAT
 *  3. Persiste resultado (XML timbrado o motivo de rechazo)
 *  4. Aplica garantía de reembolso si error nuestro
 */
export class InvoiceService {
  constructor(
    private readonly generator: CartaPorteGenerator,
    private readonly pac: PacProvider,
  ) {}

  async stamp(input: StampInvoiceInput): Promise<InvoiceResult> {
    // 1. Generar XML (lanza si validación falla)
    const xml = this.generator.generate(input.input);

    // 2. Enviar a PAC
    const stampResult = await this.pac.stamp({
      xml,
      invoiceId: input.invoiceId,
      companyId: input.companyId,
    });

    // 3. Empacar resultado
    if (stampResult.ok) {
      return {
        invoiceId: input.invoiceId,
        status: 'stamped',
        uuidSat: stampResult.uuidSat,
        satSeal: stampResult.satSeal,
        stampedXml: stampResult.stampedXml,
        pacProvider: stampResult.pacProvider,
        pacResponseTime: stampResult.pacResponseTime,
      };
    } else {
      return {
        invoiceId: input.invoiceId,
        status: 'rejected',
        rejectionCode: stampResult.errorCode,
        rejectionMessage: stampResult.errorMessage,
        guaranteeApplicable: stampResult.isOurError,
        pacProvider: stampResult.pacProvider,
        pacResponseTime: stampResult.pacResponseTime,
      };
    }
  }

  async cancel(input: CancelInvoiceInput): Promise<{ ok: boolean; ack?: string }> {
    if (input.reason === '01' && !input.substituteUuid) {
      throw new Error('Motivo 01 (sustitución) requiere UUID sustituto');
    }
    const r = await this.pac.cancel(input);
    return { ok: r.ok, ack: r.acknowledgmentXml };
  }
}
