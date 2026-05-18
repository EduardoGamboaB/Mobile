import { Column, Entity } from 'typeorm';
import { TenantEntity } from '../../database/entities/tenant.entity';

@Entity({ name: 'drivers' })
export class Driver extends TenantEntity {
  @Column({ name: 'full_name', length: 200 })
  fullName!: string;

  @Column({ length: 32, nullable: true, type: 'varchar' })
  phone!: string | null;

  @Column({ length: 200, nullable: true, type: 'varchar' })
  email!: string | null;

  @Column({ name: 'federal_license', length: 60, nullable: true, type: 'varchar' })
  federalLicense!: string | null;

  @Column({ name: 'license_expires_at', type: 'date', nullable: true })
  licenseExpiresAt!: string | null;

  @Column({ type: 'enum', enum: ['active', 'on_trip', 'inactive', 'suspended'], default: 'active' })
  status!: 'active' | 'on_trip' | 'inactive' | 'suspended';

  /** Score compuesto 0..100 — recalculado por Cloud Function tras eventos. */
  @Column({ type: 'int', default: 75 })
  score!: number;

  @Column({ name: 'on_time_pct', type: 'int', default: 0 })
  onTimePct!: number;

  @Column({ name: 'km_per_liter', type: 'numeric', precision: 5, scale: 2, default: 0 })
  kmPerLiter!: string;
}
