import type {
  DeviceDto,
  TelemetryPoint,
  TelemetryProvider,
  UnknownDeviceHitDto,
} from '@g3/contracts';
import type { DeviceRepo, IngestTokenRepo, StoredIngestToken, TelemetryRepo } from '../repos';

export type { StoredIngestToken } from '../repos';

// ---------------------------------------------------------------------------
// Telemetría: dispositivos, puntos y tokens de ingesta.
// Gemelos en memoria de los Pg*Repo (src/pg.repos.ts); docs/data-model/fleet.md.
// ---------------------------------------------------------------------------

export class InMemoryDeviceRepo implements DeviceRepo {
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
  async markSeen(companyId: string, id: string, seenAt: string) {
    const d = this.byId.get(id);
    if (!d || d.companyId !== companyId) return null;
    const next: DeviceDto = {
      ...d,
      status: d.status === 'pending' ? 'active' : d.status,
      lastSeenAt: !d.lastSeenAt || Date.parse(d.lastSeenAt) < Date.parse(seenAt) ? seenAt : d.lastSeenAt,
    };
    this.byId.set(id, next);
    return { ...next };
  }
}

export class InMemoryTelemetryRepo implements TelemetryRepo {
  private readonly points: TelemetryPoint[] = [];
  /** Clave de idempotencia deviceId|recordedAt (en Postgres: UNIQUE(device_id, recorded_at)). */
  private readonly keys = new Set<string>();
  /** Última posición por vehículo (companyId|vehicleId). */
  private readonly lastByVehicleKey = new Map<string, TelemetryPoint>();

  /** Por instante (ms), igual que timestamptz: `…:10Z` y `…:10.000Z` son el mismo punto. */
  private static key(deviceId: string, recordedAt: string) {
    return `${deviceId}|${Date.parse(recordedAt)}`;
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
      if (!prev || Date.parse(prev.recordedAt) < Date.parse(p.recordedAt)) this.lastByVehicleKey.set(vk, { ...p });
    }
    return true;
  }

  async insertMany(points: TelemetryPoint[]) {
    const out: boolean[] = [];
    for (const p of points) out.push(await this.insert(p));
    return out;
  }

  async lastByVehicles(companyId: string, vehicleIds: string[]) {
    const out = new Map<string, TelemetryPoint>();
    for (const id of vehicleIds) {
      const p = this.lastByVehicleKey.get(`${companyId}|${id}`);
      if (p) out.set(id, { ...p });
    }
    return out;
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

export class InMemoryIngestTokenRepo implements IngestTokenRepo {
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
