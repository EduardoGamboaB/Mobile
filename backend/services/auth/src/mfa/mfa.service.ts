/**
 * MFA TOTP por usuario: enrolar → confirmar con primer código → verificar
 * (TOTP ±1 paso, anti-replay) o código de recuperación (uso único) →
 * desactivar / regenerar códigos (siempre exigen un código válido).
 */
import type { MfaEnrollResponseDto, MfaRecoveryCodesDto, MfaStatusDto } from '@g3/contracts';
import type { Clock } from '../clock';
import { AuthError } from '../errors';
import type { AuditService } from '../audit/audit.service';
import type { UserRecord } from '../repos/in-memory.user.repo';
import type { SecurityPolicyService } from '../security/security-policy';
import { auditActor, type RequestMeta } from '../security/actor';
import type { MfaRecord, MfaRepo } from './mfa.repo';
import type { SecretCipher } from './secret-cipher';
import { generateRecoveryCodes, looksLikeRecoveryCode, type RecoveryCodeHasher } from './recovery-codes';
import { base32Decode, buildOtpauthUri, generateTotpSecret, verifyTotp } from './totp';

export type MfaVerifyResult = { ok: true; method: 'totp' | 'recovery' } | { ok: false };

type MfaUser = Pick<UserRecord, 'id' | 'email' | 'companyId' | 'role'>;

export class MfaService {
  constructor(
    private readonly repo: MfaRepo,
    private readonly cipher: SecretCipher,
    private readonly recoveryHasher: RecoveryCodeHasher,
    private readonly policies: SecurityPolicyService,
    private readonly audit: AuditService,
    private readonly clock: Clock,
    private readonly issuer = 'G3 Admin',
  ) {}

  async isEnabled(userId: string): Promise<boolean> {
    return (await this.repo.find(userId))?.status === 'enabled';
  }

  async status(user: MfaUser): Promise<MfaStatusDto> {
    const rec = await this.repo.find(user.id);
    return {
      enabled: rec?.status === 'enabled',
      pending: rec?.status === 'pending',
      enrolledAt: rec?.enabledAt ?? null,
      recoveryCodesRemaining: rec?.status === 'enabled' ? rec.recoveryCodes.filter((c) => !c.usedAt).length : 0,
      requiredByPolicy: await this.policies.requiresMfa(user.companyId, user.role),
    };
  }

  async beginEnrollment(user: MfaUser): Promise<MfaEnrollResponseDto> {
    const existing = await this.repo.find(user.id);
    if (existing?.status === 'enabled') {
      throw new AuthError(409, 'MFA ya está activo. Desactívalo antes de volver a enrolar.');
    }
    const secret = generateTotpSecret();
    await this.repo.save({
      userId: user.id,
      secretEnc: this.cipher.encrypt(secret),
      status: 'pending',
      createdAt: this.nowIso(),
      enabledAt: null,
      lastUsedStep: null,
      recoveryCodes: [],
    });
    return {
      secret,
      otpauthUri: buildOtpauthUri({ issuer: this.issuer, account: user.email, secret }),
      issuer: this.issuer,
      account: user.email,
    };
  }

  async confirmEnrollment(user: MfaUser, code: string, meta: RequestMeta): Promise<MfaRecoveryCodesDto> {
    const rec = await this.repo.find(user.id);
    if (!rec || rec.status !== 'pending') throw new AuthError(400, 'No hay un enrolamiento MFA pendiente');
    const r = verifyTotp(this.secretOf(rec), code, this.clock.now());
    if (!r.ok) throw new AuthError(401, 'Código MFA incorrecto');
    const recoveryCodes = generateRecoveryCodes();
    await this.repo.save({
      ...rec,
      status: 'enabled',
      enabledAt: this.nowIso(),
      lastUsedStep: r.step,
      recoveryCodes: recoveryCodes.map((c) => ({ hash: this.recoveryHasher.hash(c), usedAt: null })),
    });
    await this.record(user, 'auth.mfa.enrolled', meta, { method: 'totp' });
    return { recoveryCodes };
  }

  /** Verifica TOTP de 6 dígitos o código de recuperación. Nunca lanza por código malo. */
  async verifyCode(user: MfaUser, code: string, meta: RequestMeta): Promise<MfaVerifyResult> {
    const rec = await this.repo.find(user.id);
    if (!rec || rec.status !== 'enabled') return { ok: false };

    if (/^\s*\d{6}\s*$/.test(code ?? '')) {
      const r = verifyTotp(this.secretOf(rec), code, this.clock.now(), { afterStep: rec.lastUsedStep });
      if (!r.ok) return { ok: false };
      await this.repo.save({ ...rec, lastUsedStep: r.step });
      return { ok: true, method: 'totp' };
    }

    if (!looksLikeRecoveryCode(code)) return { ok: false };
    const idx = rec.recoveryCodes.findIndex((c) => !c.usedAt && this.recoveryHasher.matches(code, c.hash));
    if (idx === -1) return { ok: false };
    rec.recoveryCodes[idx] = { ...rec.recoveryCodes[idx], usedAt: this.nowIso() };
    await this.repo.save(rec);
    const remaining = rec.recoveryCodes.filter((c) => !c.usedAt).length;
    await this.record(user, 'auth.mfa.recovery_code_used', meta, { remaining });
    return { ok: true, method: 'recovery' };
  }

  async disable(user: MfaUser, code: string, meta: RequestMeta): Promise<void> {
    const r = await this.verifyCode(user, code, meta);
    if (!r.ok) throw new AuthError(401, 'Código MFA incorrecto');
    await this.repo.delete(user.id);
    // Si la política exige MFA a su rol, el próximo login forzará re-enrolamiento.
    await this.record(user, 'auth.mfa.disabled', meta, {
      verifiedWith: r.method,
      requiredByPolicy: await this.policies.requiresMfa(user.companyId, user.role),
    });
  }

  async regenerateRecoveryCodes(user: MfaUser, code: string, meta: RequestMeta): Promise<MfaRecoveryCodesDto> {
    const r = await this.verifyCode(user, code, meta);
    if (!r.ok) throw new AuthError(401, 'Código MFA incorrecto');
    const rec = (await this.repo.find(user.id))!;
    const recoveryCodes = generateRecoveryCodes();
    await this.repo.save({
      ...rec,
      recoveryCodes: recoveryCodes.map((c) => ({ hash: this.recoveryHasher.hash(c), usedAt: null })),
    });
    await this.record(user, 'auth.mfa.recovery_codes_regenerated', meta, { count: recoveryCodes.length });
    return { recoveryCodes };
  }

  private secretOf(rec: MfaRecord): Buffer {
    return base32Decode(this.cipher.decrypt(rec.secretEnc));
  }

  private nowIso(): string {
    return new Date(this.clock.now()).toISOString();
  }

  private async record(
    user: MfaUser,
    action: 'auth.mfa.enrolled' | 'auth.mfa.disabled' | 'auth.mfa.recovery_code_used' | 'auth.mfa.recovery_codes_regenerated',
    meta: RequestMeta,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.audit.record({
      companyId: user.companyId,
      actor: auditActor({ userId: user.id, role: user.role }),
      action,
      resource: { type: 'user', id: user.id },
      ip: meta.ip,
      userAgent: meta.userAgent,
      metadata,
    });
  }
}
