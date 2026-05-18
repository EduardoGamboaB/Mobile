import { v4 as uuid } from 'uuid';
import {
  Feature,
  TIER_LIMITS,
  TierLimitExceededError,
  UpgradeRequiredError,
  tierHas,
  type TripDto,
  type TripStatus,
  type TierValue,
} from '@g3/contracts';
import type { InMemoryTripRepo } from './in-memory.trip.repo';
import type { EventBus } from './event.bus';

export interface RequestCtx {
  companyId: string;
  tier: TierValue;
}

export interface CreateTripInput {
  origin: string;
  destination: string;
  scheduledAt?: string;
  driverId?: string;
  tractorId?: string;
  trailerId?: string;
  freightAmount?: number;
}

/** Máquina de estados: desde → permitidos */
const TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  draft: ['assigned', 'canceled'],
  assigned: ['in_transit', 'canceled'],
  in_transit: ['arrived', 'canceled'],
  arrived: ['delivered'],
  delivered: ['paid'],
  paid: [],
  canceled: [],
};

export class TripsService {
  constructor(
    private readonly repo: InMemoryTripRepo,
    private readonly bus: EventBus,
  ) {}

  list(ctx: RequestCtx, filter: { status?: TripStatus; driverId?: string } = {}) {
    return this.repo.list(ctx.companyId, filter);
  }

  async get(ctx: RequestCtx, id: string): Promise<TripDto> {
    const t = await this.repo.findById(ctx.companyId, id);
    if (!t) throw new Error('Viaje no encontrado');
    return t;
  }

  async create(ctx: RequestCtx, input: CreateTripInput): Promise<TripDto> {
    const usedThisMonth = await this.repo.countInCurrentMonth(ctx.companyId);
    const monthlyLimit = TIER_LIMITS[ctx.tier].tripsPerMonth;
    if (usedThisMonth >= monthlyLimit) {
      throw new TierLimitExceededError({
        limit: 'tripsPerMonth',
        tier: ctx.tier,
        limitValue: monthlyLimit,
        currentValue: usedThisMonth + 1,
      });
    }

    const seq = (await this.repo.countTotalForCompany(ctx.companyId)) + 1;
    const folio = `G3-${new Date().getUTCFullYear()}-${String(seq).padStart(5, '0')}`;

    const trip: TripDto = {
      id: uuid(),
      companyId: ctx.companyId,
      folio,
      status: 'assigned',
      driverId: input.driverId ?? null,
      tractorId: input.tractorId ?? null,
      trailerId: input.trailerId ?? null,
      origin: input.origin,
      destination: input.destination,
      scheduledAt: input.scheduledAt ?? null,
      startedAt: null,
      completedAt: null,
      paymentReleasedAt: null,
      freightAmount: input.freightAmount ?? null,
    };
    const saved = await this.repo.create(trip);
    await this.bus.publish({
      type: 'trip.created',
      occurredAt: new Date().toISOString(),
      companyId: ctx.companyId,
      data: { tripId: saved.id, folio: saved.folio },
    });
    return saved;
  }

  async setStatus(ctx: RequestCtx, id: string, next: TripStatus): Promise<TripDto> {
    const trip = await this.get(ctx, id);
    const allowed = TRANSITIONS[trip.status];
    if (!allowed.includes(next)) {
      throw new Error(`Transición inválida: ${trip.status} → ${next}`);
    }
    const patch: Partial<TripDto> = { status: next };
    if (next === 'in_transit') patch.startedAt = new Date().toISOString();
    if (next === 'delivered') patch.completedAt = new Date().toISOString();

    const updated = (await this.repo.update(ctx.companyId, id, patch))!;
    await this.bus.publish({
      type: 'trip.status_changed',
      occurredAt: new Date().toISOString(),
      companyId: ctx.companyId,
      data: { tripId: id, fromStatus: trip.status, toStatus: next },
    });
    return updated;
  }

  async releasePayment(ctx: RequestCtx, id: string): Promise<TripDto> {
    if (!tierHas(ctx.tier, Feature.PaymentAuthorization)) {
      throw new UpgradeRequiredError({
        currentTier: ctx.tier,
        missingFeatures: [Feature.PaymentAuthorization],
      });
    }
    const trip = await this.get(ctx, id);
    if (trip.status !== 'delivered') {
      throw new Error('El viaje debe estar entregado antes de liberar el pago');
    }
    const updated = (await this.repo.update(ctx.companyId, id, {
      status: 'paid',
      paymentReleasedAt: new Date().toISOString(),
    }))!;
    await this.bus.publish({
      type: 'trip.payment_released',
      occurredAt: new Date().toISOString(),
      companyId: ctx.companyId,
      data: { tripId: id, amount: trip.freightAmount },
    });
    return updated;
  }
}
