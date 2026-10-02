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
  /** Reemplaza el factor completo (enrolar, confirmar, regenerar códigos). */
  save(rec: MfaRecord): Promise<void>;
  delete(userId: string): Promise<void>;
  /**
   * Anti-replay TOTP atómico: fija `lastUsedStep = step` solo si el factor
   * está activo y `step` es mayor al último aceptado. `false` = replay (otra
   * petición, quizá en otra réplica, ya usó ese paso o uno posterior).
   */
  advanceStep(userId: string, step: number): Promise<boolean>;
  /** Marca un código de recuperación como usado si aún no lo estaba (uso único atómico). */
  markRecoveryCodeUsed(userId: string, hash: string, usedAt: string): Promise<boolean>;
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
  async advanceStep(userId: string, step: number) {
    const r = this.byUser.get(userId);
    if (!r || r.status !== 'enabled' || (r.lastUsedStep != null && step <= r.lastUsedStep)) return false;
    r.lastUsedStep = step;
    return true;
  }
  async markRecoveryCodeUsed(userId: string, hash: string, usedAt: string) {
    const c = this.byUser.get(userId)?.recoveryCodes.find((x) => x.hash === hash);
    if (!c || c.usedAt) return false;
    c.usedAt = usedAt;
    return true;
  }
}
