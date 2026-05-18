import { Column, Entity } from 'typeorm';
import { TenantEntity } from '../../database/entities/tenant.entity';

export type TrailerType =
  | 'jaula_42' | 'caja_53' | 'caja_48' | 'refrigerado' | 'tolva' | 'tanque' | 'plataforma' | 'lowboy';

@Entity({ name: 'trailers' })
export class Trailer extends TenantEntity {
  @Column({ length: 32 }) number!: string;
  @Column({
    type: 'enum',
    enum: ['jaula_42', 'caja_53', 'caja_48', 'refrigerado', 'tolva', 'tanque', 'plataforma', 'lowboy'],
  })
  type!: TrailerType;
  @Column({ length: 20, nullable: true, type: 'varchar' }) plates!: string | null;
  @Column({ length: 32, nullable: true, type: 'varchar' }) vin!: string | null;
  @Column({ name: 'capacity_tons', type: 'numeric', precision: 6, scale: 2, default: 0 })
  capacityTons!: string;
  @Column({ name: 'temp_range', type: 'varchar', nullable: true }) tempRange!: string | null;
  @Column({ type: 'enum', enum: ['active', 'maintenance', 'parked'], default: 'active' })
  status!: 'active' | 'maintenance' | 'parked';
  @Column({ name: 'attached_tractor_id', type: 'uuid', nullable: true })
  attachedTractorId!: string | null;
  @Column({ type: 'int', default: 100 }) health!: number;
  @Column({ name: 'last_inspection_at', type: 'date', nullable: true })
  lastInspectionAt!: string | null;
  @Column({ name: 'insurance_expires_at', type: 'date', nullable: true })
  insuranceExpiresAt!: string | null;
}
