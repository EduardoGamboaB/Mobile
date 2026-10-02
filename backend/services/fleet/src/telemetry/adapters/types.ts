import type { TelemetryRejectionCode } from '@g3/contracts';

/**
 * Lectura normalizada que produce un adapter. Todavía no sabe a qué
 * compañía/dispositivo/vehículo pertenece: eso lo resuelve el servicio de
 * ingesta a partir de `externalId` (IMEI / ID de equipo).
 */
export interface NormalizedReading {
  externalId: string;
  recordedAt: string;
  lat: number;
  lng: number;
  speedKph: number | null;
  headingDeg: number | null;
  ignition: boolean | null;
  odometerKm: number | null;
  fuelLevelPct: number | null;
  eventCode: string | null;
  raw: unknown;
}

export interface AdapterError {
  code: TelemetryRejectionCode;
  message: string;
  externalId?: string | null;
  raw?: unknown;
}

export interface AdapterResult {
  readings: NormalizedReading[];
  errors: AdapterError[];
}

/** Un adapter es una función pura: body del proveedor → lecturas o errores tipados. */
export type TelemetryAdapter = (body: unknown) => AdapterResult;
