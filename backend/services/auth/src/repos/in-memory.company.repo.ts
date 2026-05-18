export interface CompanyRecord {
  id: string;
  name: string;
  rfc: string | null;
  contactEmail: string;
  contactPhone: string | null;
  createdAt: string;
}

export interface CompanyRepo {
  findById(id: string): Promise<CompanyRecord | null>;
  findAll(): Promise<CompanyRecord[]>;
  create(rec: CompanyRecord): Promise<CompanyRecord>;
}

export class InMemoryCompanyRepo implements CompanyRepo {
  private readonly byId = new Map<string, CompanyRecord>();
  async findById(id: string) {
    const c = this.byId.get(id);
    return c ? { ...c } : null;
  }
  async findAll() {
    return [...this.byId.values()].map((c) => ({ ...c }));
  }
  async create(rec: CompanyRecord) {
    this.byId.set(rec.id, { ...rec });
    return { ...rec };
  }
}
