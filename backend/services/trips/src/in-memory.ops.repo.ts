import type { EvidenceDto, ExpensePolicyDto, LogbookEntryDto, UploadUrlDto } from '@g3/contracts';

export class InMemoryLogbookRepo {
  private readonly rows = new Map<string, LogbookEntryDto>();

  async findByClientUuid(companyId: string, clientUuid: string) {
    const r = [...this.rows.values()].find((e) => e.companyId === companyId && e.clientUuid === clientUuid);
    return r ? { ...r } : null;
  }

  async listByTrip(companyId: string, tripId: string) {
    return [...this.rows.values()]
      .filter((e) => e.companyId === companyId && e.tripId === tripId)
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
      .map((e) => ({ ...e }));
  }

  async create(e: LogbookEntryDto) {
    this.rows.set(e.id, { ...e });
    return { ...e };
  }
}

export class InMemoryEvidenceRepo {
  private readonly rows = new Map<string, EvidenceDto>();

  async findByClientUuid(companyId: string, clientUuid: string) {
    const r = [...this.rows.values()].find((e) => e.companyId === companyId && e.clientUuid === clientUuid);
    return r ? { ...r } : null;
  }

  async listByTrip(companyId: string, tripId: string) {
    return [...this.rows.values()]
      .filter((e) => e.companyId === companyId && e.tripId === tripId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((e) => ({ ...e }));
  }

  async create(e: EvidenceDto) {
    this.rows.set(e.id, { ...e });
    return { ...e };
  }
}

export class InMemoryExpensePolicyRepo {
  private readonly byCompany = new Map<string, ExpensePolicyDto>();

  async get(companyId: string) {
    const p = this.byCompany.get(companyId);
    return p ? { ...p } : null;
  }

  async put(p: ExpensePolicyDto) {
    this.byCompany.set(p.companyId, { ...p });
    return { ...p };
  }
}

/** Firma de URLs de subida a Cloud Storage. En producción: GCS V4 signed URL. */
export interface EvidenceStorage {
  signUpload(storagePath: string, mimeType: string): Promise<UploadUrlDto>;
}

export class StubEvidenceStorage implements EvidenceStorage {
  async signUpload(storagePath: string): Promise<UploadUrlDto> {
    return {
      uploadUrl: `https://storage.googleapis.com/g3-evidences-stub/${encodeURI(storagePath)}?X-Goog-Signature=stub`,
      storagePath,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    };
  }
}
