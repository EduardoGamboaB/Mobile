import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from './subscription.entity';
import { StripeBillingProvider } from './billing/stripe.provider';
import { CompaniesService } from '../companies/companies.service';
import { UsersService } from '../users/users.service';
import { EventsService } from '../events/events.service';
import {
  Tier,
  TierValue,
  TIER_PRICE_MXN,
  TIER_LIMITS,
  TIER_RANK,
  isUpgrade,
} from '../../shared/tiers';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription) private readonly repo: Repository<Subscription>,
    private readonly stripe: StripeBillingProvider,
    @Inject(forwardRef(() => CompaniesService)) private readonly companies: CompaniesService,
    @Inject(forwardRef(() => UsersService)) private readonly users: UsersService,
    private readonly events: EventsService,
  ) {}

  /** Crea suscripción Free al onboarding. */
  async startTrial(companyId: string, tier: TierValue = Tier.Free): Promise<Subscription> {
    const sub = await this.repo.save(
      this.repo.create({
        companyId,
        tier,
        status: 'active',
        units: 1,
        priceMxn: String(TIER_PRICE_MXN[tier] ?? 0),
      }),
    );
    await this.events.publishDomainEvent('subscription.started', {
      companyId, tier, units: 1,
    });
    return sub;
  }

  async getActiveByCompany(companyId: string): Promise<Subscription> {
    const sub = await this.repo.findOne({
      where: { companyId, status: 'active' as const },
      order: { createdAt: 'DESC' },
    });
    if (!sub) {
      // Si no hay subscripción explícita, retornamos free implícito.
      return this.startTrial(companyId, Tier.Free);
    }
    return sub;
  }

  async createCheckout(input: {
    companyId: string;
    userEmail: string;
    tier: TierValue;
    units: number;
    successUrl: string;
    cancelUrl: string;
  }) {
    if (input.tier === Tier.Free) {
      throw new BadRequestException('Free no requiere checkout');
    }
    if (input.tier === Tier.Enterprise) {
      throw new BadRequestException('Enterprise se cotiza con ventas');
    }
    const company = await this.companies.findOne(input.companyId);
    const limits = TIER_LIMITS[input.tier];
    if (limits.units != null && input.units > limits.units) {
      throw new BadRequestException(
        `El plan ${input.tier} acepta máximo ${limits.units} unidades`,
      );
    }
    let customerId = company.stripeCustomerId;
    if (!customerId) {
      customerId = await this.stripe.ensureCustomer(company.id, company.name, input.userEmail);
      await this.companies.setStripeCustomer(company.id, customerId);
    }
    const session = await this.stripe.createCheckout({
      customerId,
      tier: input.tier,
      units: input.units,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    });
    await this.events.publishDomainEvent('subscription.checkout_created', {
      companyId: company.id, tier: input.tier, units: input.units,
    });
    return session;
  }

  /**
   * Aplica el cambio en la BD. Llamado por:
   *  - el webhook de Stripe tras `customer.subscription.created/updated`
   *  - admin endpoints (downgrade explícito)
   */
  async applyTier(input: {
    companyId: string;
    tier: TierValue;
    units: number;
    stripeSubscriptionId?: string | null;
    stripePriceId?: string | null;
    currentPeriodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean;
  }): Promise<Subscription> {
    let sub = await this.repo.findOne({ where: { companyId: input.companyId }, order: { createdAt: 'DESC' } });
    const previousTier = sub?.tier;
    if (!sub) {
      sub = this.repo.create({ companyId: input.companyId });
    }
    sub.tier = input.tier;
    sub.units = input.units;
    sub.priceMxn = String((TIER_PRICE_MXN[input.tier] ?? 0) * input.units);
    sub.status = 'active';
    sub.stripeSubscriptionId = input.stripeSubscriptionId ?? sub.stripeSubscriptionId;
    sub.stripePriceId = input.stripePriceId ?? sub.stripePriceId;
    sub.currentPeriodEnd = input.currentPeriodEnd ?? sub.currentPeriodEnd;
    sub.cancelAtPeriodEnd = input.cancelAtPeriodEnd ?? sub.cancelAtPeriodEnd;
    sub = await this.repo.save(sub);

    if (previousTier && previousTier !== input.tier) {
      await this.events.publishDomainEvent(
        isUpgrade(previousTier, input.tier) ? 'subscription.upgraded' : 'subscription.downgraded',
        { companyId: input.companyId, from: previousTier, to: input.tier, units: input.units },
      );
    }
    return sub;
  }

  async cancelAtPeriodEnd(companyId: string): Promise<void> {
    const sub = await this.getActiveByCompany(companyId);
    if (!sub.stripeSubscriptionId) throw new NotFoundException('Sin suscripción activa en Stripe');
    await this.stripe.cancelAtPeriodEnd(sub.stripeSubscriptionId);
    sub.cancelAtPeriodEnd = true;
    await this.repo.save(sub);
    await this.events.publishDomainEvent('subscription.cancel_scheduled', {
      companyId, tier: sub.tier,
    });
  }

  /**
   * Helper expuesto a otros módulos: ¿la compañía X puede usar feature Y?
   * Útil cuando el check no se hace por decorador sino programáticamente.
   */
  async companyCan(companyId: string, feature: import('../../shared/tiers').FeatureValue): Promise<boolean> {
    const sub = await this.getActiveByCompany(companyId);
    return (
      TIER_RANK[sub.tier] >= TIER_RANK[
        ((): TierValue => {
          // re-uso de minTierFor pero inline para evitar import circular
          const order: TierValue[] = ['free', 'starter', 'pro', 'business', 'enterprise'];
          for (const t of order) {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const F = require('../../shared/tiers').FEATURES_BY_TIER[t] as string[];
            if (F.includes(feature)) return t;
          }
          return 'enterprise';
        })()
      ]
    );
  }
}
