import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../database/entities/base.entity';

@Entity({ name: 'companies' })
export class Company extends BaseEntity {
  @Column({ length: 200 })
  name!: string;

  @Column({ length: 32, nullable: true, type: 'varchar' })
  rfc!: string | null;

  @Column({ length: 100, nullable: true, type: 'varchar' })
  city!: string | null;

  @Column({ default: true })
  active!: boolean;

  /** Identificador de cuenta Stripe (`cus_xxx`). */
  @Column({ name: 'stripe_customer_id', nullable: true, type: 'varchar' })
  stripeCustomerId!: string | null;
}
