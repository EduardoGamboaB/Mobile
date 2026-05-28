import { v4 as uuid } from 'uuid';
import type {
  PacProvider, StampRequest, StampResult, CancelRequest, CancelResult,
} from './pac.provider';

/**
 * Mock PAC para tests y desarrollo. Simula timbrado SAT.
 *
 * Acepta override de comportamiento:
 *  - new MockPacProvider({ failNext: true, errorCode: 'CP201' })
 *    para simular rechazo SAT en el próximo timbrado
 */

export interface MockPacOptions {
  failNext?: boolean;
  errorCode?: string;
  errorMessage?: string;
  isOurError?: boolean;
  responseDelayMs?: number;
}

export class MockPacProvider implements PacProvider {
  readonly name = 'mock';

  // historial de timbrados (útil para assertions en tests)
  public stamps: StampRequest[] = [];
  public cancels: CancelRequest[] = [];

  constructor(private opts: MockPacOptions = {}) {}

  async stamp(req: StampRequest): Promise<StampResult> {
    this.stamps.push(req);
    await this.delay();

    if (this.opts.failNext) {
      this.opts.failNext = false; // reset
      return {
        ok: false,
        errorCode: this.opts.errorCode ?? 'CP201',
        errorMessage: this.opts.errorMessage ?? 'TipoUbicacion inválido',
        isOurError: this.opts.isOurError ?? false,
        pacProvider: this.name,
        pacResponseTime: this.opts.responseDelayMs ?? 100,
      };
    }

    // Happy path: SAT acepta el timbre
    const uuidSat = uuid().toUpperCase();
    return {
      ok: true,
      uuidSat,
      satSeal: 'MOCK_SELLO_SAT_' + uuidSat.slice(0, 8),
      satCertificateNumber: '00001000000500000001',
      stampedXml: this.injectTimbre(req.xml, uuidSat),
      stampingDate: new Date().toISOString(),
      pacProvider: this.name,
      pacResponseTime: this.opts.responseDelayMs ?? 100,
    };
  }

  async cancel(req: CancelRequest): Promise<CancelResult> {
    this.cancels.push(req);
    await this.delay();
    return {
      ok: true,
      acknowledgmentXml: `<MockAck uuid="${req.uuidSat}" reason="${req.reason}"/>`,
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  /** Inyecta el TimbreFiscalDigital antes del cierre del Comprobante. */
  private injectTimbre(xml: string, uuidSat: string): string {
    const timbre = `
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital
      xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
      Version="1.1"
      UUID="${uuidSat}"
      FechaTimbrado="${new Date().toISOString()}"
      RfcProvCertif="MOCK010101000"
      NoCertificadoSAT="00001000000500000001"
      SelloSAT="MOCK_SELLO"
      SelloCFD="MOCK_CFD"/>
  </cfdi:Complemento>`;
    // Insertar antes del </cfdi:Comprobante>
    return xml.replace('</cfdi:Comprobante>', `${timbre}\n</cfdi:Comprobante>`);
  }

  private delay(): Promise<void> {
    const ms = this.opts.responseDelayMs ?? 0;
    return new Promise((r) => setTimeout(r, ms));
  }
}
