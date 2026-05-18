import { Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Base para todas las entidades multi-tenant. Garantiza la columna
 * `company_id` indexada y obligatoria. El `TenantInterceptor` + filtros
 * de TypeORM se aseguran de que ninguna consulta cruce empresas.
 */
export abstract class TenantEntity extends BaseEntity {
  @Index()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;
}
