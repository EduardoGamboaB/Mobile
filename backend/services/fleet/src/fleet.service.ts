import { v4 as uuid } from 'uuid';
import {
  TIER_LIMITS,
  Feature,
  TierLimitExceededError,
  UpgradeRequiredError,
  tierHas,
  type TractorDto,
  type TrailerDto,
  type TierValue,
  type LivePosition,
  type UserRole,
} from '@g3/contracts';
import type { TelemetryRepo, TractorRepo, TrailerRepo } from './repos';

export interface RequestCtx {
  companyId: string;
  tier: TierValue;
  /** Inyectado por el gateway (x-user-role); opcional para compatibilidad. */
  role?: UserRole;
}

export interface CreateTractorInput {
  unitNumber: string;
  plates: string;
  brand?: string;
  model?: string;
  year?: number;
}

export interface CreateTrailerInput {
  unitNumber: string;
  plates: string;
  type: TrailerDto['type'];
  capacityTons?: number;
}

export class FleetService {
  constructor(
    private readonly tractors: TractorRepo,
    private readonly trailers: TrailerRepo,
    /** Opcional para compatibilidad: sin repo de telemetría se usa lastLat/lastLng del tracto. */
    private readonly telemetry?: TelemetryRepo,
  ) {}

  // --- tractors ---
  listTractors(ctx: RequestCtx) {
    return this.tractors.list(ctx.companyId);
  }

  async getTractor(ctx: RequestCtx, id: string): Promise<TractorDto> {
    const t = await this.tractors.findById(ctx.companyId, id);
    if (!t) throw new Error('Tracto no encontrado');
    return t;
  }

  async createTractor(ctx: RequestCtx, input: CreateTractorInput): Promise<TractorDto> {
    await this.assertUnitsLimit(ctx);
    const t: TractorDto = {
      id: uuid(),
      companyId: ctx.companyId,
      unitNumber: input.unitNumber,
      plates: input.plates,
      brand: input.brand ?? null,
      model: input.model ?? null,
      year: input.year ?? null,
      status: 'available',
      lastLat: null,
      lastLng: null,
      lastSeenAt: null,
    };
    return this.tractors.create(t);
  }

  async updateTractor(ctx: RequestCtx, id: string, patch: Partial<CreateTractorInput & { status: TractorDto['status'] }>) {
    const updated = await this.tractors.update(ctx.companyId, id, patch);
    if (!updated) throw new Error('Tracto no encontrado');
    return updated;
  }

  async removeTractor(ctx: RequestCtx, id: string) {
    const ok = await this.tractors.remove(ctx.companyId, id);
    if (!ok) throw new Error('Tracto no encontrado');
  }

  // --- trailers ---
  listTrailers(ctx: RequestCtx) {
    return this.trailers.list(ctx.companyId);
  }

  async getTrailer(ctx: RequestCtx, id: string): Promise<TrailerDto> {
    const t = await this.trailers.findById(ctx.companyId, id);
    if (!t) throw new Error('Remolque no encontrado');
    return t;
  }

  async createTrailer(ctx: RequestCtx, input: CreateTrailerInput): Promise<TrailerDto> {
    await this.assertUnitsLimit(ctx);
    const t: TrailerDto = {
      id: uuid(),
      companyId: ctx.companyId,
      unitNumber: input.unitNumber,
      plates: input.plates,
      type: input.type,
      capacityTons: input.capacityTons ?? null,
      status: 'available',
    };
    return this.trailers.create(t);
  }

  async updateTrailer(ctx: RequestCtx, id: string, patch: Partial<CreateTrailerInput & { status: TrailerDto['status'] }>) {
    const updated = await this.trailers.update(ctx.companyId, id, patch);
    if (!updated) throw new Error('Remolque no encontrado');
    return updated;
  }

  async removeTrailer(ctx: RequestCtx, id: string) {
    const ok = await this.trailers.remove(ctx.companyId, id);
    if (!ok) throw new Error('Remolque no encontrado');
  }

  // --- live positions (gated por FleetMap) ---
  async livePositions(ctx: RequestCtx): Promise<LivePosition[]> {
    if (!tierHas(ctx.tier, Feature.FleetMap)) {
      throw new UpgradeRequiredError({
        currentTier: ctx.tier,
        missingFeatures: [Feature.FleetMap],
      });
    }
    const fromTractors = await this.tractors.livePositions(ctx.companyId);
    if (!this.telemetry) return fromTractors;

    // La fuente de verdad es la última telemetría del vehículo; el lastLat del
    // tracto queda como respaldo (datos previos a la ingesta / carga manual).
    const tractors = await this.tractors.list(ctx.companyId);
    const fallback = new Map(fromTractors.map((p) => [p.tractorId, p]));
    const lastByTractor = await this.telemetry.lastByVehicles(
      ctx.companyId,
      tractors.map((t) => t.id),
    );
    const out: LivePosition[] = [];
    for (const t of tractors) {
      const last = lastByTractor.get(t.id);
      if (last) {
        out.push({
          tractorId: t.id,
          unitNumber: t.unitNumber,
          lat: last.lat,
          lng: last.lng,
          speedKph: last.speedKph,
          headingDeg: last.headingDeg,
          lastSeenAt: last.recordedAt,
        });
      } else if (fallback.has(t.id)) {
        out.push(fallback.get(t.id)!);
      }
    }
    return out;
  }

  private async assertUnitsLimit(ctx: RequestCtx) {
    const limit = TIER_LIMITS[ctx.tier].units;
    const tractorCount = await this.tractors.countByCompany(ctx.companyId);
    const trailerCount = await this.trailers.countByCompany(ctx.companyId);
    const total = tractorCount + trailerCount;
    if (total >= limit) {
      throw new TierLimitExceededError({
        limit: 'units',
        tier: ctx.tier,
        limitValue: limit,
        currentValue: total + 1,
      });
    }
  }
}
