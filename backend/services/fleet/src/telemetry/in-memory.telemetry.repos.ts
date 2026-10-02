import type {
  DeviceDto,
  TelemetryPoint,
  TelemetryProvider,
  UnknownDeviceHitDto,
} from '@g3/contracts';

// ---------------------------------------------------------------------------
// Telemetría: dispositivos, puntos y tokens de ingesta.
// En prod → TypeORM/Postgres (ver docs/TELEMETRY-INGESTION.md).
// ---------------------------------------------------------------------------

export class InMemoryDeviceRepo {
  private readonly byId = new Map<string, DeviceDto>();
  /** Índice global externalId → deviceId: un IMEI pertenece a una sola compañía. */
  private readonly byExternalId = new Map<string, string>();

  async list(companyId: string) {
    return [...this.byId.values()].filter((d) => d.companyId === companyId).map((d) => ({ ...d }));
  }
  async findById(companyId: string, id: string) {
    const d = this.byId.get(id);
    return d && d.companyId === companyId ? { ...d } : null;
  }
  /** Búsqueda global (sin companyId): sólo para la ingesta, que luego valida la compañía del token. */
  async findByExternalId(externalId: string) {
    const id = this.byExternalId.get(externalId);
    const d = id ? this.byId.get(id) : undefined;
    return d ? { ...d } : null;
  }
  async create(d: DeviceDto) {
    if (this.byExternalId.has(d.externalId)) throw new Error(`externalId duplicado: ${d.externalId}`);
    this.byId.set(d.id, { ...d });
    this.byExternalId.set(d.externalId, d.id);
    return { ...d };
  }
  async update(companyId: string, id: string, patch: Partial<DeviceDto>) {
    const d = await this.findById(companyId, id);
    if (!d) return null;
    const next = { ...d, ...patch, id, companyId, externalId: d.externalId };
    this.byId.set(id, next);
    return { ...next };
  }
  async remove(companyId: string, id: string) {
    const d = await this.findById(companyId, id);
    if (!d) return false;
    this.byId.delete(id);
    this.byExternalId.delete(d.externalId);
    return true;
  }
}

export class InMemoryTelemetryRepo {
  private readonly points: TelemetryPoint[] = [];
  /** Clave de idempotencia deviceId|recordedAt (en Postgres: UNIQUE(device_id, recorded_at)). */
  private readonly keys = new Set<string>();
  /** Última posición por vehículo (companyId|vehicleId). */
  private readonly lastByVehicleKey = new Map<string, TelemetryPoint>();

  private static key(deviceId: string, recordedAt: string) {
    return `${deviceId}|${recordedAt}`;
  }

  /** Inserta si no existe; devuelve false si era duplicado (idempotencia). */
  async insert(p: TelemetryPoint): Promise<boolean> {
    const k = InMemoryTelemetryRepo.key(p.deviceId, p.recordedAt);
    if (this.keys.has(k)) return false;
    this.keys.add(k);
    this.points.push({ ...p });
    if (p.vehicleId) {
      const vk = `${p.companyId}|${p.vehicleId}`;
      const prev = this.lastByVehicleKey.get(vk);
      if (!prev || prev.recordedAt < p.recordedAt) this.lastByVehicleKey.set(vk, { ...p });
    }
    return true;
  }

  async lastByVehicle(companyId: string, vehicleId: string) {
    const p = this.lastByVehicleKey.get(`${companyId}|${vehicleId}`);
    return p ? { ...p } : null;
  }

  /** Puntos de un vehículo en [fromIso, toIso], ascendente, hasta `limit`. */
  async listByVehicle(companyId: string, vehicleId: string, fromIso: string, toIso: string, limit: number) {
    return this.points
      .filter(
        (p) =>
          p.companyId === companyId && p.vehicleId === vehicleId && p.recordedAt >= fromIso && p.recordedAt <= toIso,
      )
      .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
      .slice(0, limit)
      .map((p) => ({ ...p }));
  }

  async listByDevice(companyId: string, deviceId: string) {
    return this.points
      .filter((p) => p.companyId === companyId && p.deviceId === deviceId)
      .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
      .map((p) => ({ ...p }));
  }

  async countByVehicle(companyId: string, vehicleId: string) {
    return this.points.filter((p) => p.companyId === companyId && p.vehicleId === vehicleId).length;
  }
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

export class InMemoryIngestTokenRepo {
  private readonly byId = new Map<string, StoredIngestToken>();
  private readonly unknownHits = new Map<string, UnknownDeviceHitDto & { companyId: string }>();

  async create(t: StoredIngestToken) {
    this.byId.set(t.id, { ...t });
    return { ...t };
  }
  async list(companyId: string) {
    return [...this.byId.values()].filter((t) => t.companyId === companyId).map((t) => ({ ...t }));
  }
  /** Todos los tokens vigentes (para comparación en tiempo constante). */
  async listActive() {
    return [...this.byId.values()].filter((t) => t.revokedAt === null).map((t) => ({ ...t }));
  }
  async revoke(companyId: string, id: string, at: string) {
    const t = this.byId.get(id);
    if (!t || t.companyId !== companyId) return null;
    t.revokedAt = t.revokedAt ?? at;
    return { ...t };
  }

  /** Contador de IMEIs desconocidos por compañía (ayuda al onboarding). */
  async recordUnknown(companyId: string, provider: TelemetryProvider, externalId: string, at: string) {
    const k = `${companyId}|${provider}|${externalId}`;
    const prev = this.unknownHits.get(k);
    this.unknownHits.set(k, { companyId, provider, externalId, hits: (prev?.hits ?? 0) + 1, lastSeenAt: at });
  }
  async listUnknown(companyId: string): Promise<UnknownDeviceHitDto[]> {
    return [...this.unknownHits.values()]
      .filter((h) => h.companyId === companyId)
      .map((h) => ({ provider: h.provider, externalId: h.externalId, hits: h.hits, lastSeenAt: h.lastSeenAt }));
  }
}
