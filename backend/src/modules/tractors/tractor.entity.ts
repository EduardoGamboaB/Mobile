import { Column, Entity } from 'typeorm';
import { TenantEntity } from '../../database/entities/tenant.entity';

@Entity({ name: 'tractors' })
export class Tractor extends TenantEntity {
  @Column({ length: 32 }) number!: string;
  @Column({ length: 80, nullable: true, type: 'varchar' }) brand!: string | null;
  @Column({ length: 80, nullable: true, type: 'varchar' }) model!: string | null;
  @Column({ type: 'int', nullable: true }) year!: number | null;
  @Column({ length: 20, nullable: true, type: 'varchar' }) plates!: string | null;
  @Column({ length: 32, nullable: true, type: 'varchar' }) vin!: string | null;
  @Column({ type: 'enum', enum: ['diesel', 'electrico', 'hibrido'], default: 'diesel' })
  fuel!: 'diesel' | 'electrico' | 'hibrido';
  @Column({ type: 'int', default: 0 }) horsepower!: number;
  @Column({ type: 'enum', enum: ['active', 'maintenance', 'parked', 'sold'], default: 'active' })
  status!: 'active' | 'maintenance' | 'parked' | 'sold';
  @Column({ name: 'driver_id', type: 'uuid', nullable: true }) driverId!: string | null;
  @Column({ type: 'int', default: 100 }) health!: number;
  @Column({ name: 'mileage_km', type: 'int', default: 0 }) mileageKm!: number;
  @Column({ name: 'last_service_km', type: 'int', default: 0 }) lastServiceKm!: number;
  @Column({ name: 'next_service_km', type: 'int', default: 10_000 }) nextServiceKm!: number;
  @Column({ name: 'insurance_expires_at', type: 'date', nullable: true }) insuranceExpiresAt!: string | null;
  @Column({ name: 'verification_expires_at', type: 'date', nullable: true }) verificationExpiresAt!: string | null;
}
