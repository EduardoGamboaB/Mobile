import { Column, Entity, Index } from 'typeorm';
import { TenantEntity } from '../../database/entities/tenant.entity';

export type TripStatus =
  | 'scheduled' | 'loading' | 'in_transit' | 'unloading' | 'finished' | 'cancelled';
export type PaymentStatus = 'pending' | 'released' | 'held' | 'na';

@Entity({ name: 'trips' })
@Index(['companyId', 'status'])
export class Trip extends TenantEntity {
  @Column({ length: 32, unique: true }) folio!: string;
  @Column({ length: 200 }) client!: string;
  @Column({ length: 200, nullable: true, type: 'varchar' }) cargo!: string | null;
  @Column({ length: 200 }) origin!: string;
  @Column({ length: 200 }) destination!: string;
  @Column({ name: 'driver_id', type: 'uuid' }) driverId!: string;
  @Column({ name: 'tractor_id', type: 'uuid' }) tractorId!: string;
  @Column({ name: 'trailer_id', type: 'uuid', nullable: true }) trailerId!: string | null;
  @Column({
    type: 'enum',
    enum: ['scheduled', 'loading', 'in_transit', 'unloading', 'finished', 'cancelled'],
    default: 'scheduled',
  })
  status!: TripStatus;
  @Column({ name: 'load_date', type: 'timestamptz', nullable: true }) loadDate!: Date | null;
  @Column({ name: 'eta_unload', type: 'timestamptz', nullable: true }) etaUnload!: Date | null;
  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true }) finishedAt!: Date | null;
  @Column({ type: 'numeric', precision: 8, scale: 2, default: 0 }) tons!: string;
  @Column({ name: 'price_per_ton', type: 'numeric', precision: 10, scale: 2, default: 0 }) pricePerTon!: string;
  @Column({ name: 'gross_amount', type: 'numeric', precision: 12, scale: 2, default: 0 }) grossAmount!: string;
  @Column({ name: 'driver_commission', type: 'numeric', precision: 10, scale: 2, default: 0 }) driverCommission!: string;
  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 }) tolls!: string;
  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 }) diesel!: string;
  @Column({ name: 'inspection_pct', type: 'int', default: 0 }) inspectionPct!: number;
  @Column({ name: 'evidence_count', type: 'int', default: 0 }) evidenceCount!: number;
  @Column({
    name: 'payment_status', type: 'enum',
    enum: ['pending', 'released', 'held', 'na'], default: 'na',
  })
  paymentStatus!: PaymentStatus;
}
