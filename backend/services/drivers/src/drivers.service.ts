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
}

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

  async remove(ctx: RequestCtx, id: string): Promise<void> {
    const ok = await this.repo.remove(ctx.companyId, id);
    if (!ok) throw new Error('Driver no encontrado');
  }
}
