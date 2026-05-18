import { Column, Entity, Index } from 'typeorm';
import { TenantEntity } from '../../database/entities/tenant.entity';

export type UserRole = 'driver' | 'dispatcher' | 'admin' | 'owner';

@Entity({ name: 'users' })
@Index(['email'], { unique: true })
export class User extends TenantEntity {
  @Column({ length: 200 })
  email!: string;

  @Column({ name: 'password_hash', length: 200 })
  passwordHash!: string;

  @Column({ name: 'full_name', length: 200 })
  fullName!: string;

  @Column({ type: 'enum', enum: ['driver', 'dispatcher', 'admin', 'owner'], default: 'admin' })
  role!: UserRole;

  @Column({ default: true })
  active!: boolean;
}
