/**
 * Interfaz que abstrae el PAC SAT. Producción usará DiverzaProvider
 * o FacturamaProvider; tests usan MockPacProvider.
 *
 * El multi-PAC (Diverza primary + Facturama backup) se implementa
 * en una clase HighAvailabilityPacProvider que envuelve dos
 * providers concretos.
 */

export interface StampRequest {
  xml: string;
  invoiceId: string;
  companyId: string;
}

export interface StampSuccess {
  ok: true;
  uuidSat: string;            // UUID asignado por SAT (timbre fiscal)
  satSeal: string;            // SelloSAT del TimbreFiscalDigital
  satCertificateNumber: string;
  stampedXml: string;         // XML con TimbreFiscalDigital inyectado
  stampingDate: string;       // ISO
  pacProvider: string;        // 'diverza' / 'facturama' / 'mock'
  pacResponseTime: number;    // ms
}

export interface StampError {
  ok: false;
  errorCode: string;          // código del SAT o del PAC
  errorMessage: string;
  isOurError: boolean;        // true → aplica garantía de reembolso
  pacProvider: string;
  pacResponseTime: number;
}

export type StampResult = StampSuccess | StampError;

export interface CancelRequest {
  uuidSat: string;
  reason: '01' | '02' | '03' | '04';
  substituteUuid?: string;    // requerido si reason='01'
  rfcIssuer: string;
}

export interface CancelResult {
  ok: boolean;
  acknowledgmentXml?: string;
  errorMessage?: string;
}

export interface PacProvider {
  readonly name: string;
  stamp(req: StampRequest): Promise<StampResult>;
  cancel(req: CancelRequest): Promise<CancelResult>;
  healthCheck(): Promise<boolean>;
}
