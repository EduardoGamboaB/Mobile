import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { v4 as uuid } from 'uuid';
import {
  Feature,
  TelemetryEventType,
  UpgradeRequiredError,
  isTelemetryProvider,
  tierHas,
  type DeviceDto,
  type IngestResultDto,
  type IngestTokenCreatedDto,
  type IngestTokenDto,
  type TelemetryPoint,
  type TelemetryPositionReceivedEvent,
  type UnknownDeviceHitDto,
  type VehicleKind,
  type VehicleTrackDto,
} from '@g3/contracts';
import type { RequestCtx } from '../fleet.service';
import type {
  DeviceRepo,
  IngestTokenRepo,
  StoredIngestToken,
  TelemetryRepo,
  TractorRepo,
  TrailerRepo,
} from '../repos';
import type { EventBus } from '../event.bus';
import { ADAPTERS } from './adapters';
import {
  ForbiddenError,
  InvalidIngestTokenError,
  NotFoundError,
  UnsupportedProviderError,
  ValidationError,
} from '../errors';

export interface TelemetryDeps {
  devices: DeviceRepo;
  telemetry: TelemetryRepo;
  tokens: IngestTokenRepo;
  tractors: TractorRepo;
  trailers: TrailerRepo;
  bus: EventBus;
  clock?: () => Date;
}

const TOKEN_PREFIX = 'g3it_';
const MAX_TOKEN_LEN = 256;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TRACK_RANGE_MS = 7 * DAY_MS;
const MAX_TRACK_POINTS = 5000;

const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest();

/**
 * Ingesta de telemetría agnóstica de proveedor.
 *
 *   webhook (token por compañía) → adapter puro → resolver IMEI → idempotencia
 *   → guardar puntos (un INSERT por lote) → actualizar device/vehículo → eventos
 */
export class TelemetryService {
  private readonly clock: () => Date;

  constructor(private readonly d: TelemetryDeps) {
    this.clock = d.clock ?? (() => new Date());
  }

  // -------------------------------------------------------------------------
  // Tokens de ingesta (gestionados por owner/admin con JWT)
  // -------------------------------------------------------------------------

  async createIngestToken(ctx: RequestCtx, input: { label?: string }): Promise<IngestTokenCreatedDto> {
    this.assertAdmin(ctx);
    const token = TOKEN_PREFIX + randomBytes(32).toString('base64url');
    const stored: StoredIngestToken = {
      id: uuid(),
      companyId: ctx.companyId,
      prefix: token.slice(0, 12),
      hash: sha256(token).toString('hex'),
      label: input?.label?.trim() || null,
      createdAt: this.clock().toISOString(),
      revokedAt: null,
    };
    await this.d.tokens.create(stored);
    return { ...toTokenDto(stored), token };
  }

  async listIngestTokens(ctx: RequestCtx): Promise<IngestTokenDto[]> {
    this.assertAdmin(ctx);
    return (await this.d.tokens.list(ctx.companyId)).map(toTokenDto);
  }

  async revokeIngestToken(ctx: RequestCtx, id: string): Promise<IngestTokenDto> {
    this.assertAdmin(ctx);
    const t = await this.d.tokens.revoke(ctx.companyId, id, this.clock().toISOString());
    if (!t) throw new NotFoundError('Token no encontrado');
    return toTokenDto(t);
  }

  listUnknownDevices(ctx: RequestCtx): Promise<UnknownDeviceHitDto[]> {
    return this.d.tokens.listUnknown(ctx.companyId);
  }

  /**
   * Resuelve la compañía dueña del token. Compara sha256(token) contra TODOS
   * los tokens vigentes con `timingSafeEqual` y sin salida anticipada, así el
   * tiempo de respuesta no revela cuántos bytes coinciden ni qué token existe.
   */
  private async authenticate(token: string | undefined): Promise<string> {
    if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN_LEN) {
      throw new InvalidIngestTokenError();
    }
    const candidate = sha256(token);
    let companyId: string | null = null;
    for (const t of await this.d.tokens.listActive()) {
      const stored = Buffer.from(t.hash, 'hex');
      if (stored.length === candidate.length && timingSafeEqual(stored, candidate) && companyId === null) {
        companyId = t.companyId;
      }
    }
    if (!companyId) throw new InvalidIngestTokenError();
    return companyId;
  }

  // -------------------------------------------------------------------------
  // Ingesta
  // -------------------------------------------------------------------------

  async ingest(provider: string, token: string | undefined, body: unknown): Promise<IngestResultDto> {
    if (!isTelemetryProvider(provider)) throw new UnsupportedProviderError(provider);
    const companyId = await this.authenticate(token);

    const parsed = ADAPTERS[provider](body);
    const result: IngestResultDto = {
      provider,
      received: parsed.readings.length + parsed.errors.length,
      accepted: 0,
      duplicates: 0,
      unknownDevices: 0,
      rejected: parsed.errors.map((e) => ({ code: e.code, message: e.message, externalId: e.externalId ?? null })),
    };

    const receivedAt = this.clock().toISOString();
    const deviceCache = new Map<string, DeviceDto | null>();
    const points: TelemetryPoint[] = [];

    for (const r of parsed.readings) {
      if (!deviceCache.has(r.externalId)) {
        const found = await this.d.devices.findByExternalId(r.externalId);
        // Un IMEI de OTRA compañía se trata igual que uno inexistente: no se
        // filtra su existencia ni se le puede inyectar telemetría.
        deviceCache.set(r.externalId, found && found.companyId === companyId ? found : null);
      }
      const device = deviceCache.get(r.externalId)!;

      if (!device) {
        result.unknownDevices++;
        result.rejected.push({ code: 'unknown_device', message: 'Dispositivo no registrado', externalId: r.externalId });
        await this.d.tokens.recordUnknown(companyId, provider, r.externalId, receivedAt);
        continue;
      }
      if (device.status === 'inactive') {
        result.rejected.push({ code: 'device_inactive', message: 'Dispositivo inactivo', externalId: r.externalId });
        continue;
      }
      if (provider !== 'generic' && device.provider !== provider) {
        result.rejected.push({
          code: 'provider_mismatch',
          message: `Dispositivo registrado como ${device.provider}`,
          externalId: r.externalId,
        });
        continue;
      }

      points.push({
        id: uuid(),
        deviceId: device.id,
        vehicleId: device.vehicleId,
        vehicleKind: device.vehicleKind,
        companyId,
        provider,
        recordedAt: r.recordedAt,
        receivedAt,
        lat: r.lat,
        lng: r.lng,
        speedKph: r.speedKph,
        headingDeg: r.headingDeg,
        ignition: r.ignition,
        odometerKm: r.odometerKm,
        fuelLevelPct: r.fuelLevelPct,
        eventCode: r.eventCode,
        raw: r.raw,
      });
    }

    // Todo el lote en una escritura; (deviceId, recordedAt) repetido = duplicado.
    const inserted = await this.d.telemetry.insertMany(points);
    const accepted = points.filter((_, i) => inserted[i]);
    result.duplicates = points.length - accepted.length;
    result.accepted = accepted.length;

    await this.touchDevices(accepted);
    await this.touchTractors(accepted);
    for (const p of accepted) await this.publish(p);
    return result;
  }

  /** Un UPDATE por equipo con su punto más nuevo del lote (pending → active, lastSeenAt monotónico). */
  private async touchDevices(points: TelemetryPoint[]) {
    for (const p of latestBy(points, (x) => x.deviceId)) {
      await this.d.devices.markSeen(p.companyId, p.deviceId, p.recordedAt);
    }
  }

  /** Mantiene lastLat/lastLng del tracto (compatibilidad con TractorDto). Puntos viejos no pisan. */
  private async touchTractors(points: TelemetryPoint[]) {
    const ofTractors = points.filter((p) => p.vehicleKind === 'tractor' && p.vehicleId);
    for (const p of latestBy(ofTractors, (x) => x.vehicleId!)) {
      await this.d.tractors.touchPosition(p.companyId, p.vehicleId!, p.lat, p.lng, p.recordedAt);
    }
  }

  private async publish(p: TelemetryPoint) {
    const data: TelemetryPositionReceivedEvent = {
      pointId: p.id,
      deviceId: p.deviceId,
      provider: p.provider,
      vehicleId: p.vehicleId,
      vehicleKind: p.vehicleKind,
      recordedAt: p.recordedAt,
      lat: p.lat,
      lng: p.lng,
      speedKph: p.speedKph,
      headingDeg: p.headingDeg,
      ignition: p.ignition ?? null,
      eventCode: p.eventCode ?? null,
    };
    await this.d.bus.publish({
      type: TelemetryEventType.PositionReceived,
      occurredAt: p.receivedAt,
      companyId: p.companyId,
      data: { ...data },
    });
  }

  // -------------------------------------------------------------------------
  // Recorrido (gated por FleetMap, igual que livePositions)
  // -------------------------------------------------------------------------

  async vehicleTrack(ctx: RequestCtx, vehicleId: string, from?: string, to?: string): Promise<VehicleTrackDto> {
    if (!tierHas(ctx.tier, Feature.FleetMap)) {
      throw new UpgradeRequiredError({ currentTier: ctx.tier, missingFeatures: [Feature.FleetMap] });
    }
    let vehicleKind: VehicleKind;
    if (await this.d.tractors.findById(ctx.companyId, vehicleId)) vehicleKind = 'tractor';
    else if (await this.d.trailers.findById(ctx.companyId, vehicleId)) vehicleKind = 'trailer';
    else throw new NotFoundError('Vehículo no encontrado');

    const toMs = to ? Date.parse(to) : this.clock().getTime();
    const fromMs = from ? Date.parse(from) : toMs - DAY_MS;
    if (Number.isNaN(toMs) || Number.isNaN(fromMs)) throw new ValidationError('from/to deben ser fechas ISO-8601');
    if (fromMs > toMs) throw new ValidationError('from debe ser anterior a to');
    if (toMs - fromMs > MAX_TRACK_RANGE_MS) throw new ValidationError('El rango máximo es de 7 días');

    const fromIso = new Date(fromMs).toISOString();
    const toIso = new Date(toMs).toISOString();
    const rows = await this.d.telemetry.listByVehicle(ctx.companyId, vehicleId, fromIso, toIso, MAX_TRACK_POINTS + 1);
    const truncated = rows.length > MAX_TRACK_POINTS;
    return {
      vehicleId,
      vehicleKind,
      from: fromIso,
      to: toIso,
      truncated,
      points: rows.slice(0, MAX_TRACK_POINTS).map((p) => ({
        recordedAt: p.recordedAt,
        lat: p.lat,
        lng: p.lng,
        speedKph: p.speedKph,
        headingDeg: p.headingDeg,
        ignition: p.ignition ?? null,
        deviceId: p.deviceId,
      })),
    };
  }

  private assertAdmin(ctx: RequestCtx) {
    if (ctx.role && ctx.role !== 'owner' && ctx.role !== 'admin') {
      throw new ForbiddenError('Sólo owner/admin pueden gestionar tokens de ingesta');
    }
  }
}

function toTokenDto(t: StoredIngestToken): IngestTokenDto {
  return {
    id: t.id,
    companyId: t.companyId,
    prefix: t.prefix,
    label: t.label,
    createdAt: t.createdAt,
    revokedAt: t.revokedAt,
  };
}

/** El punto más reciente (por recordedAt) de cada grupo. */
function latestBy(points: TelemetryPoint[], key: (p: TelemetryPoint) => string): TelemetryPoint[] {
  const out = new Map<string, TelemetryPoint>();
  for (const p of points) {
    const k = key(p);
    const prev = out.get(k);
    if (!prev || Date.parse(prev.recordedAt) < Date.parse(p.recordedAt)) out.set(k, p);
  }
  return [...out.values()];
}
