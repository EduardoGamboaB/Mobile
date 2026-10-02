import type { TierValue } from '@g3/contracts';
import type { UserRole } from '@g3/contracts';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  companyId: string;
  tier: TierValue;
  createdAt: string;
}

export interface UserRepo {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  findAll(): Promise<UserRecord[]>;
  findByCompanyId(companyId: string): Promise<UserRecord[]>;
  create(rec: UserRecord): Promise<UserRecord>;
  updateTierForCompany(companyId: string, tier: TierValue): Promise<void>;
  updateRole(id: string, role: UserRole): Promise<UserRecord | null>;
}

export class InMemoryUserRepo implements UserRepo {
  private readonly byId = new Map<string, UserRecord>();

  async findByEmail(email: string): Promise<UserRecord | null> {
    for (const u of this.byId.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) return { ...u };
    }
    return null;
  }
  async findById(id: string): Promise<UserRecord | null> {
    const u = this.byId.get(id);
    return u ? { ...u } : null;
  }
  async findAll(): Promise<UserRecord[]> {
    return [...this.byId.values()].map((u) => ({ ...u }));
  }
  async findByCompanyId(companyId: string): Promise<UserRecord[]> {
    return [...this.byId.values()].filter((u) => u.companyId === companyId).map((u) => ({ ...u }));
  }
  async create(rec: UserRecord): Promise<UserRecord> {
    this.byId.set(rec.id, { ...rec });
    return { ...rec };
  }
  async updateTierForCompany(companyId: string, tier: TierValue): Promise<void> {
    for (const u of this.byId.values()) {
      if (u.companyId === companyId) u.tier = tier;
    }
  }
  async updateRole(id: string, role: UserRole): Promise<UserRecord | null> {
    const u = this.byId.get(id);
    if (!u) return null;
    u.role = role;
    return { ...u };
  }
}
