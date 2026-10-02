/**
 * Telemetría agnóstica de proveedor (prioridad 3 del roadmap).
 *
 * G3 lee GPS de terceros (Suntech, Teltonika, Queclink o un JSON ya
 * normalizado) y lo convierte a un único `TelemetryPoint`. Así una flota que
 * ya trae equipo instalado puede usar G3 sin reinstalar nada.
 */

export const TELEMETRY_PROVIDERS = ['suntech', 'teltonika', 'queclink', 'generic'] as const;
export type TelemetryProvider = (typeof TELEMETRY_PROVIDERS)[number];

export const isTelemetryProvider = (v: unknown): v is TelemetryProvider =>
  typeof v === 'string' && (TELEMETRY_PROVIDERS as readonly string[]).includes(v);

export type VehicleKind = 'tractor' | 'trailer';

/**
 * - `pending`: registrado, nunca ha reportado.
 * - `active`: ya reportó al menos una posición.
 * - `inactive`: deshabilitado por la compañía; su telemetría se rechaza.
 */
export type DeviceStatus = 'pending' | 'active' | 'inactive';

export interface DeviceDto {
  id: string;
  companyId: string;
  provider: TelemetryProvider;
  /** IMEI o ID de equipo del proveedor. Único global: no puede pertenecer a dos compañías. */
  externalId: string;
  label: string | null;
  vehicleId: string | null;
  vehicleKind: VehicleKind | null;
  status: DeviceStatus;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface CreateDeviceDto {
  provider: TelemetryProvider;
  externalId: string;
  label?: string;
}

export interface UpdateDeviceDto {
  label?: string | null;
  status?: Exclude<DeviceStatus, 'pending'>;
}

export interface LinkDeviceDto {
  vehicleId: string;
  vehicleKind: VehicleKind;
}

/** Punto de telemetría normalizado (lo que se persiste). */
export interface TelemetryPoint {
  id: string;
  deviceId: string;
  vehicleId: string | null;
  vehicleKind: VehicleKind | null;
  companyId: string;
  provider: TelemetryProvider;
  /** Hora GPS reportada por el equipo (ISO, UTC). */
  recordedAt: string;
  /** Hora en que G3 recibió el punto (ISO, UTC). */
  receivedAt: string;
  lat: number;
  lng: number;
  speedKph: number | null;
  headingDeg: number | null;
  ignition?: boolean | null;
  odometerKm?: number | null;
  fuelLevelPct?: number | null;
  eventCode?: string | null;
  /** Mensaje original del proveedor (línea ASCII o registro JSON) para auditoría. */
  raw: unknown;
}

/** Body del proveedor `generic`: puntos ya normalizados por un middleware externo. */
export interface GenericTelemetryPointInput {
  externalId: string;
  recordedAt: string;
  lat: number;
  lng: number;
  speedKph?: number | null;
  headingDeg?: number | null;
  ignition?: boolean | null;
  odometerKm?: number | null;
  fuelLevelPct?: number | null;
  eventCode?: string | null;
}

export interface GenericTelemetryPayload {
  points: GenericTelemetryPointInput[];
}

export type TelemetryRejectionCode =
  | 'malformed'
  | 'unsupported_message'
  | 'invalid_coordinates'
  | 'no_gps_fix'
  | 'invalid_timestamp'
  | 'unknown_device'
  | 'device_inactive'
  | 'provider_mismatch';

export interface TelemetryRejection {
  code: TelemetryRejectionCode;
  message: string;
  externalId?: string | null;
}

/** Respuesta de `POST /telemetry/ingest/:provider`. */
export interface IngestResultDto {
  provider: TelemetryProvider;
  received: number;
  accepted: number;
  duplicates: number;
  unknownDevices: number;
  rejected: TelemetryRejection[];
}

export interface IngestTokenDto {
  id: string;
  companyId: string;
  /** Primeros caracteres del token para identificarlo en UI (nunca el secreto). */
  prefix: string;
  label: string | null;
  createdAt: string;
  revokedAt: string | null;
}

/** Sólo se devuelve una vez, al crearlo. */
export interface IngestTokenCreatedDto extends IngestTokenDto {
  token: string;
}

export interface UnknownDeviceHitDto {
  provider: TelemetryProvider;
  externalId: string;
  hits: number;
  lastSeenAt: string;
}

export interface TrackPointDto {
  recordedAt: string;
  lat: number;
  lng: number;
  speedKph: number | null;
  headingDeg: number | null;
  ignition: boolean | null;
  deviceId: string;
}

export interface VehicleTrackDto {
  vehicleId: string;
  vehicleKind: VehicleKind;
  from: string;
  to: string;
  points: TrackPointDto[];
  truncated: boolean;
}
