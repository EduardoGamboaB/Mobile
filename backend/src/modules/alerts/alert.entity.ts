import { Column, Entity, Index } from 'typeorm';
import { TenantEntity } from '../../database/entities/tenant.entity';

export type AlertSource = 'tractor' | 'trailer' | 'driver' | 'trip' | 'document';
export type AlertSeverity = 'info' | 'warning' | 'critical';

@Entity({ name: 'alerts' })
@Index(['companyId', 'acknowledged'])
export class Alert extends TenantEntity {
  @Column({ type: 'enum', enum: ['tractor', 'trailer', 'driver', 'trip', 'document'] })
  source!: AlertSource;
  @Column({ name: 'entity_id', length: 64 }) entityId!: string;
  @Column({ name: 'entity_label', length: 200 }) entityLabel!: string;
  @Column({ type: 'enum', enum: ['info', 'warning', 'critical'], default: 'info' })
  severity!: AlertSeverity;
  @Column({ length: 200 }) title!: string;
  @Column('text') detail!: string;
  @Column({ default: false }) acknowledged!: boolean;
  @Column({ name: 'acknowledged_at', type: 'timestamptz', nullable: true })
  acknowledgedAt!: Date | null;
}
