import type { SubscriptionDto } from '@g3/contracts';

export interface SubscriptionRepo {
  findByCompanyId(companyId: string): Promise<SubscriptionDto | null>;
  save(sub: SubscriptionDto): Promise<SubscriptionDto>;
}

export class InMemorySubscriptionRepo implements SubscriptionRepo {
  private readonly byCompany = new Map<string, SubscriptionDto>();

  async findByCompanyId(companyId: string) {
    const s = this.byCompany.get(companyId);
    return s ? { ...s } : null;
  }
  async save(sub: SubscriptionDto) {
    this.byCompany.set(sub.companyId, { ...sub });
    return { ...sub };
  }
}
