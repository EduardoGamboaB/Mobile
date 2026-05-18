import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { BillingProvider } from './billing.interface';
import { TierValue } from '../../../shared/tiers';

@Injectable()
export class StripeBillingProvider implements BillingProvider {
  private readonly logger = new Logger(StripeBillingProvider.name);
  private readonly client: Stripe;

  constructor(private readonly cfg: ConfigService) {
    const key = this.cfg.get<string>('STRIPE_SECRET_KEY');
    if (!key) {
      this.logger.warn('STRIPE_SECRET_KEY no configurado — billing modo no-op');
    }
    this.client = new Stripe(key ?? 'sk_test_placeholder', {
      apiVersion: '2024-09-30.acacia',
      typescript: true,
    });
  }

  private priceIdFor(tier: TierValue): string {
    const map: Record<TierValue, string | undefined> = {
      free: undefined,
      starter:    this.cfg.get<string>('STRIPE_PRICE_STARTER'),
      pro:        this.cfg.get<string>('STRIPE_PRICE_PRO'),
      business:   this.cfg.get<string>('STRIPE_PRICE_BUSINESS'),
      enterprise: undefined, // enterprise = cotización fuera de Stripe
    };
    const id = map[tier];
    if (!id) throw new Error(`Sin Stripe price configurado para tier ${tier}`);
    return id;
  }

  async ensureCustomer(companyId: string, name: string, email: string): Promise<string> {
    const search = await this.client.customers.search({
      query: `metadata['companyId']:'${companyId}'`,
      limit: 1,
    });
    if (search.data[0]) return search.data[0].id;
    const created = await this.client.customers.create({
      name,
      email,
      metadata: { companyId },
    });
    return created.id;
  }

  async createCheckout(input: {
    customerId: string;
    tier: TierValue;
    units: number;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string; sessionId: string }> {
    const session = await this.client.checkout.sessions.create({
      mode: 'subscription',
      customer: input.customerId,
      line_items: [
        { price: this.priceIdFor(input.tier), quantity: input.units },
      ],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      allow_promotion_codes: true,
      metadata: { tier: input.tier, units: String(input.units) },
      subscription_data: {
        metadata: { tier: input.tier },
      },
    });
    return { url: session.url ?? '', sessionId: session.id };
  }

  async cancelAtPeriodEnd(subId: string): Promise<void> {
    await this.client.subscriptions.update(subId, { cancel_at_period_end: true });
  }

  async changePlan(input: {
    stripeSubscriptionId: string;
    newPriceId: string;
    units: number;
  }): Promise<void> {
    const sub = await this.client.subscriptions.retrieve(input.stripeSubscriptionId);
    const itemId = sub.items.data[0]?.id;
    if (!itemId) throw new Error('Sin items en la suscripción');
    await this.client.subscriptions.update(input.stripeSubscriptionId, {
      items: [{ id: itemId, price: input.newPriceId, quantity: input.units }],
      proration_behavior: 'create_prorations',
    });
  }

  /** Utilizado por el webhook controller. */
  webhookClient(): Stripe {
    return this.client;
  }
}
