/**
 * Tipos del input para generar CFDI 4.0 + Complemento Carta Porte 3.0.
 * Estructura espejo de lo que SAT exige en su Anexo 20 / RMF 2024.
 */

export type CFDIType = 'I' | 'T'; // Ingreso | Traslado
export type LocationType = 'Origen' | 'Destino';
export type FiguraType = '01' | '02' | '03' | '04';

export interface Party {
  rfc: string;
  name: string;
  taxRegime: string; // c_RegimenFiscal (601, 612, etc.)
}

export interface Receiver extends Party {
  zip: string;       // CP receptor (NOM)
  useCfdi: string;   // c_UsoCFDI (G03, S01, etc.)
}

export interface Location {
  type: LocationType;
  rfc?: string;
  name?: string;
  zip: string;
  state: string;     // c_Estado
  municipality?: string;
  scheduledDate: string; // ISO date
  distanceToNextKm: number;
}

export interface Merchandise {
  sequence: number;
  productServiceCode: string; // c_ClaveProdServ (8 dígitos)
  description: string;
  quantity: number;
  unitCode: string;           // c_ClaveUnidad
  weightKg: number;
  valueAmount: number;
  valueCurrency?: string;
  tariffCode?: string;        // FraccionArancelaria (internacional)
  isDangerous: boolean;
  unCode?: string;            // c_MaterialPeligroso (UN)
  packingCode?: string;       // c_TipoEmbalaje
}

export interface Trailer {
  subtype: string;            // c_SubTipoRem (CTR001-CTR031)
  plate: string;
}

export interface Autotransport {
  permSct: string;            // c_TipoPermiso (TPAF01-TPAF18)
  permNumber: string;
  config: string;             // c_ConfigAutotransporte (T01-T20, etc.)
  plateVm: string;
  vehicleYear: number;
  insuranceCivilCompany: string;
  insuranceCivilPolicy: string;
  insuranceCargoCompany?: string;
  insuranceCargoPolicy?: string;
  insuranceCargoAmount?: number;
  trailers: Trailer[];
}

export interface Operator {
  typeFigura: FiguraType;     // '01' Operador, '02' Propietario, etc.
  rfc: string;
  name: string;
  federalLicenseNumber: string;
}

export interface CartaPorteInput {
  cfdiType: CFDIType;
  series: string;
  folio: string;
  fechaEmision: string;       // ISO

  issuer: Party;
  receiver: Receiver;

  subtotal: number;
  iva: number;
  total: number;
  paymentForm: string;        // c_FormaPago
  paymentMethod: 'PUE' | 'PPD';

  // Carta Porte 3.0
  transportInternational: boolean;
  totalDistanceKm: number;

  // Solo si internacional
  entranceExit?: 'Entrada' | 'Salida';
  country?: string;

  locations: Location[];      // Origen + Destinos (≥ 2)
  merchandise: Merchandise[];
  autotransport: Autotransport;
  operators: Operator[];

  /** IdCCP opcional para idempotencia (tests + regeneración tras error). */
  idCCP?: string;
}
