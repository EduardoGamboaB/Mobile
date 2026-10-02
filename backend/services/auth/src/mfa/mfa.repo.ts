export interface RecoveryCodeRecord {
  hash: string;
  usedAt: string | null;
}

export interface MfaRecord {
  userId: string;
  /** Secreto TOTP cifrado con `SecretCipher` (nunca en claro). */
  secretEnc: string;
  status: 'pending' | 'enabled';
  createdAt: string;
  enabledAt: string | null;
  /** Último paso TOTP aceptado (anti-replay). */
  lastUsedStep: number | null;
  recoveryCodes: RecoveryCodeRecord[];
}

export interface MfaRepo {
  find(userId: string): Promise<MfaRecord | null>;
  save(rec: MfaRecord): Promise<void>;
  delete(userId: string): Promise<void>;
}

export class InMemoryMfaRepo implements MfaRepo {
  private readonly byUser = new Map<string, MfaRecord>();
  async find(userId: string) {
    const r = this.byUser.get(userId);
    return r ? structuredClone(r) : null;
  }
  async save(rec: MfaRecord) {
    this.byUser.set(rec.userId, structuredClone(rec));
  }
  async delete(userId: string) {
    this.byUser.delete(userId);
  }
}
