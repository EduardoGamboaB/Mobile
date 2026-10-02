import { v4 as uuid } from 'uuid';
import {
  TIER_LIMITS,
  TierLimitExceededError,
  type DriverDto,
  type TierValue,
} from '@g3/contracts';
import type { DriverRepo } from './in-memory.driver.repo';

export interface RequestCtx {
  companyId: string;
  tier: TierValue;
  /** Presente cuando el usuario autenticado es un chofer (claim del JWT). */
  driverId?: string;
}

/** Lo que el chofer puede corregir de su propio perfil desde G3 Drive. */
export type SelfEditableDriverFields = Partial<Pick<CreateDriverInput, 'phone' | 'email'>>;

export interface CreateDriverInput {
  fullName: string;
  phone: string;
  email?: string;
  federalLicense?: string;
  licenseExpiresAt?: string;
}

export class DriversService {
  constructor(private readonly repo: DriverRepo) {}

  list(ctx: RequestCtx) {
    return this.repo.list(ctx.companyId);
  }

  async get(ctx: RequestCtx, id: string): Promise<DriverDto> {
    const d = await this.repo.findById(ctx.companyId, id);
    if (!d) throw new Error('Driver no encontrado');
    return d;
  }

  async create(ctx: RequestCtx, input: CreateDriverInput): Promise<DriverDto> {
    const count = await this.repo.countByCompany(ctx.companyId);
    const limit = TIER_LIMITS[ctx.tier].users;
    if (count >= limit) {
      throw new TierLimitExceededError({
        limit: 'users',
        tier: ctx.tier,
        limitValue: limit,
        currentValue: count + 1,
      });
    }
    const d: DriverDto = {
      id: uuid(),
      companyId: ctx.companyId,
      fullName: input.fullName,
      phone: input.phone,
      email: input.email ?? null,
      federalLicense: input.federalLicense ?? null,
      licenseExpiresAt: input.licenseExpiresAt ?? null,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    return this.repo.create(d);
  }

  async update(
    ctx: RequestCtx,
    id: string,
    patch: Partial<CreateDriverInput & { status: DriverDto['status'] }>,
  ): Promise<DriverDto> {
    const updated = await this.repo.update(ctx.companyId, id, patch);
    if (!updated) throw new Error('Driver no encontrado');
    return updated;
  }

  /** Perfil del chofer autenticado (G3 Drive). */
  async getMine(ctx: RequestCtx): Promise<DriverDto> {
    if (!ctx.driverId) throw new Error('El usuario no está vinculado a un chofer');
    return this.get(ctx, ctx.driverId);
  }

  /** El chofer solo puede tocar su contacto; licencia y estatus los gestiona la empresa. */
  async updateMine(ctx: RequestCtx, patch: SelfEditableDriverFields): Promise<DriverDto> {
    if (!ctx.driverId) throw new Error('El usuario no está vinculado a un chofer');
    const allowed: SelfEditableDriverFields = {};
    if (patch.phone !== undefined) allowed.phone = patch.phone;
    if (patch.email !== undefined) allowed.email = patch.email;
    return this.update(ctx, ctx.driverId, allowed);
  }

  async remove(ctx: RequestCtx, id: string): Promise<void> {
    const ok = await this.repo.remove(ctx.companyId, id);
    if (!ok) throw new Error('Driver no encontrado');
  }
}
