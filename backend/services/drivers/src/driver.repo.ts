import { ConflictException, BadRequestException } from '@nestjs/common';
import type { DriverDto } from '@g3/contracts';

/** Resultado del alta con límite del plan: o se creó, o ya se llegó al tope. */
export type CreateWithinLimitResult = { ok: true; driver: DriverDto } | { ok: false; count: number };

export interface DriverRepo {
  list(companyId: string): Promise<DriverDto[]>;
  findById(companyId: string, id: string): Promise<DriverDto | null>;
  create(d: DriverDto): Promise<DriverDto>;
  /**
   * Alta atómica respetando el límite del plan (`limit` = máximo de choferes
   * de la compañía). En Postgres cuenta e inserta bajo un lock por compañía
   * para que dos altas simultáneas no pasen ambas el límite.
   */
  createWithinLimit(d: DriverDto, limit: number): Promise<CreateWithinLimitResult>;
  update(companyId: string, id: string, patch: Partial<DriverDto>): Promise<DriverDto | null>;
  remove(companyId: string, id: string): Promise<boolean>;
  countByCompany(companyId: string): Promise<number>;
  /** Vincula (o desvincula con `null`) el usuario de G3 Drive del chofer. */
  linkUser(companyId: string, id: string, userId: string | null): Promise<boolean>;
  findByUserId(companyId: string, userId: string): Promise<DriverDto | null>;
}

/** Teléfono, licencia o usuario ya registrados en otro chofer de la misma compañía → 409. */
export class DriverConflictError extends ConflictException {
  constructor(readonly field: 'phone' | 'federalLicense' | 'userId') {
    super(
      field === 'phone'
        ? 'Ya existe un chofer con ese teléfono en tu compañía'
        : field === 'federalLicense'
          ? 'Ya existe un chofer con esa licencia federal en tu compañía'
          : 'Ese usuario ya está vinculado a otro chofer',
    );
  }
}

/** Dato con formato inválido (p.ej. fecha de vencimiento) → 400. */
export class DriverValidationError extends BadRequestException {}
