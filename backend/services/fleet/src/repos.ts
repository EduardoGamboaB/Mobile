import type {
  DeviceDto,
  LivePosition,
  TelemetryPoint,
  TelemetryProvider,
  TractorDto,
  TrailerDto,
  UnknownDeviceHitDto,
} from '@g3/contracts';

/**
 * Contratos de persistencia de fleet. Los implementan los repos en memoria
 * (dev/tests) y los `Pg*Repo` (producción) con la misma semántica; los tests
 * de contrato (`test/repos.contract.spec.ts`) corren contra ambos.
 */

export interface TractorRepo {
  list(companyId: string): Promise<TractorDto[]>;
  findById(companyId: string, id: string): Promise<TractorDto | null>;
  create(t: TractorDto): Promise<TractorDto>;
  update(companyId: string, id: string, patch: Partial<TractorDto>): Promise<TractorDto | null>;
  remove(companyId: string, id: string): Promise<boolean>;
  countByCompany(companyId: string): Promise<number>;
  livePositions(companyId: string): Promise<LivePosition[]>;
  /** Última posición conocida del tracto; solo si `seenAt` es más nuevo (un punto viejo no pisa). */
  touchPosition(companyId: string, id: string, lat: number, lng: number, seenAt: string): Promise<void>;
}

export interface TrailerRepo {
  list(companyId: string): Promise<TrailerDto[]>;
  findById(companyId: string, id: string): Promise<TrailerDto | null>;
  create(t: TrailerDto): Promise<TrailerDto>;
  update(companyId: string, id: string, patch: Partial<TrailerDto>): Promise<TrailerDto | null>;
  remove(companyId: string, id: string): Promise<boolean>;
  countByCompany(companyId: string): Promise<number>;
}

export interface DeviceRepo {
  list(companyId: string): Promise<DeviceDto[]>;
  findById(companyId: string, id: string): Promise<DeviceDto | null>;
  /** Búsqueda global (sin companyId): solo para la ingesta, que luego valida la compañía del token. */
  findByExternalId(externalId: string): Promise<DeviceDto | null>;
  /** Lanza `externalId duplicado` si el IMEI ya existe (en cualquier compañía). */
  create(d: DeviceDto): Promise<DeviceDto>;
  update(companyId: string, id: string, patch: Partial<DeviceDto>): Promise<DeviceDto | null>;
  remove(companyId: string, id: string): Promise<boolean>;
  /** El equipo reportó: `pending` → `active` y `lastSeenAt` = máx(actual, seenAt). */
  markSeen(companyId: string, id: string, seenAt: string): Promise<DeviceDto | null>;
}

export interface TelemetryRepo {
  /** Inserta si no existe `(deviceId, recordedAt)`; `false` si era duplicado (idempotencia). */
  insert(p: TelemetryPoint): Promise<boolean>;
  /**
   * Lote de una petición de ingesta en una sola escritura (Postgres: un
   * INSERT multi-fila con ON CONFLICT DO NOTHING). Devuelve, en el orden de
   * entrada, si cada punto se insertó. Actualiza la última posición por
   * vehículo solo con puntos más nuevos que la guardada.
   */
  insertMany(points: TelemetryPoint[]): Promise<boolean[]>;
  lastByVehicle(companyId: string, vehicleId: string): Promise<TelemetryPoint | null>;
  /** Últimas posiciones de varios vehículos en una consulta (mapa en vivo). */
  lastByVehicles(companyId: string, vehicleIds: string[]): Promise<Map<string, TelemetryPoint>>;
  /** Puntos de un vehículo en [fromIso, toIso], ascendente, hasta `limit`. */
  listByVehicle(companyId: string, vehicleId: string, fromIso: string, toIso: string, limit: number): Promise<TelemetryPoint[]>;
  listByDevice(companyId: string, deviceId: string): Promise<TelemetryPoint[]>;
  countByVehicle(companyId: string, vehicleId: string): Promise<number>;
}

export interface StoredIngestToken {
  id: string;
  companyId: string;
  prefix: string;
  /** sha256(token) en hex — nunca guardamos el secreto. */
  hash: string;
  label: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export interface IngestTokenRepo {
  create(t: StoredIngestToken): Promise<StoredIngestToken>;
  list(companyId: string): Promise<StoredIngestToken[]>;
  /** Todos los tokens vigentes (para comparación en tiempo constante). */
  listActive(): Promise<StoredIngestToken[]>;
  /** Idempotente: revocar dos veces conserva la primera fecha. */
  revoke(companyId: string, id: string, at: string): Promise<StoredIngestToken | null>;
  /** Contador de IMEIs desconocidos por compañía (ayuda al onboarding). */
  recordUnknown(companyId: string, provider: TelemetryProvider, externalId: string, at: string): Promise<void>;
  listUnknown(companyId: string): Promise<UnknownDeviceHitDto[]>;
}
