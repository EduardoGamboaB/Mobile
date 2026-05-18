import { Column, Entity, Index } from 'typeorm';
import { TenantEntity } from '../../database/entities/tenant.entity';
import { TierValue } from '../../shared/tiers';

export type SubscriptionStatus =
  | 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';

@Entity({ name: 'subscriptions' })
@Index(['companyId', 'status'])
export class Subscription extends TenantEntity {
  @Column({ type: 'enum', enum: ['free', 'starter', 'pro', 'business', 'enterprise'], default: 'free' })
  tier!: TierValue;

  @Column({
    type: 'enum',
    enum: ['trialing', 'active', 'past_due', 'canceled', 'incomplete'],
    default: 'active',
  })
  status!: SubscriptionStatus;

  /** Cantidad de unidades incluidas (impacta precio mensual). */
  @Column({ default: 1 })
  units!: number;

  @Column({ name: 'price_mxn', type: 'numeric', precision: 10, scale: 2, default: 0 })
  priceMxn!: string; // numeric → string en TypeORM

  /** Stripe subscription ID. */
  @Column({ name: 'stripe_subscription_id', type: 'varchar', nullable: true })
  stripeSubscriptionId!: string | null;

  /** Stripe price ID activo. */
  @Column({ name: 'stripe_price_id', type: 'varchar', nullable: true })
  stripePriceId!: string | null;

  @Column({ name: 'current_period_end', type: 'timestamptz', nullable: true })
  currentPeriodEnd!: Date | null;

  @Column({ name: 'cancel_at_period_end', default: false })
  cancelAtPeriodEnd!: boolean;
}
