import { v4 as uuid } from 'uuid';
import {
  Tier,
  TIER_PRICE_MXN,
  FEATURES_BY_TIER,
  TIER_LIMITS,
  type SubscriptionDto,
  type CheckoutResponseDto,
  type TierValue,
  type FeatureValue,
} from '@g3/contracts';
import type { SubscriptionRepo } from './repos/in-memory.subscription.repo';
import type { BillingProvider } from './billing/billing.provider';
import type { EventBus } from './event.bus';

export interface CreateCheckoutInput {
  tier: TierValue;
  units: number;
  successUrl: string;
  cancelUrl: string;
}

export interface ApplyTierMeta {
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
}

export interface TierCatalogEntry {
  tier: TierValue;
  priceMxn: number | null;
  limits: { units: number; users: number; tripsPerMonth: number };
  features: FeatureValue[];
}

export class BillingService {
  constructor(
    private readonly subs: SubscriptionRepo,
    private readonly provider: BillingProvider,
    private readonly bus: EventBus,
  ) {}

  async startTrial(companyId: string): Promise<SubscriptionDto> {
    const existing = await this.subs.findByCompanyId(companyId);
    if (existing) return existing;

    const sub: SubscriptionDto = {
      id: uuid(),
      companyId,
      tier: Tier.Free,
      status: 'active',
      units: 1,
      priceMxn: 0,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
    const saved = await this.subs.save(sub);
    await this.bus.publish({
      type: 'subscription.started',
      occurredAt: new Date().toISOString(),
      companyId,
      data: { subscriptionId: saved.id, tier: saved.tier },
    });
    return saved;
  }

  async getMine(companyId: string): Promise<SubscriptionDto> {
    const sub = await this.subs.findByCompanyId(companyId);
    if (!sub) throw new Error('Suscripción no encontrada');
    return sub;
  }

  async catalog(): Promise<TierCatalogEntry[]> {
    return Object.values(Tier).map((t) => ({
      tier: t,
      priceMxn: TIER_PRICE_MXN[t],
      limits: {
        units: TIER_LIMITS[t].units,
        users: TIER_LIMITS[t].users,
        tripsPerMonth: TIER_LIMITS[t].tripsPerMonth,
      },
      features: FEATURES_BY_TIER[t],
    }));
  }

  async createCheckout(
    companyId: string,
    input: CreateCheckoutInput,
  ): Promise<CheckoutResponseDto> {
    if (input.tier === Tier.Enterprise) {
      throw new Error('Enterprise requiere cotización. Contacta a ventas@g3logistics.mx');
    }
    if (input.tier === Tier.Free) {
      throw new Error('Free no requiere checkout — ya está activo.');
    }
    if (input.units < 1) throw new Error('units debe ser ≥ 1');

    const r = await this.provider.createCheckout({
      companyId,
      tier: input.tier,
      units: input.units,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    });

    await this.bus.publish({
      type: 'subscription.checkout_created',
      occurredAt: new Date().toISOString(),
      companyId,
      data: { sessionId: r.sessionId, tier: input.tier, units: input.units },
    });

    return r;
  }

  async applyTier(
    companyId: string,
    toTier: TierValue,
    meta: ApplyTierMeta,
  ): Promise<SubscriptionDto> {
    const existing = await this.subs.findByCompanyId(companyId);
    const fromTier = existing?.tier ?? Tier.Free;
    const sub: SubscriptionDto = {
      id: existing?.id ?? uuid(),
      companyId,
      tier: toTier,
      status: 'active',
      units: existing?.units ?? 1,
      priceMxn: TIER_PRICE_MXN[toTier],
      stripeSubscriptionId: meta.stripeSubscriptionId,
      currentPeriodEnd: meta.currentPeriodEnd,
      cancelAtPeriodEnd: false,
    };
    const saved = await this.subs.save(sub);

    const rankOrder = ['free', 'starter', 'pro', 'business', 'enterprise'];
    const direction =
      rankOrder.indexOf(toTier) > rankOrder.indexOf(fromTier) ? 'upgraded' : 'downgraded';

    if (fromTier !== toTier) {
      await this.bus.publish({
        type: `subscription.${direction}`,
        occurredAt: new Date().toISOString(),
        companyId,
        data: { subscriptionId: saved.id, fromTier, toTier },
      });
    }

    return saved;
  }

  async cancel(companyId: string): Promise<SubscriptionDto> {
    const sub = await this.getMine(companyId);
    const updated = { ...sub, cancelAtPeriodEnd: true };
    const saved = await this.subs.save(updated);
    await this.bus.publish({
      type: 'subscription.cancel_scheduled',
      occurredAt: new Date().toISOString(),
      companyId,
      data: { subscriptionId: saved.id },
    });
    return saved;
  }
}
