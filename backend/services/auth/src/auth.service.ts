import { createHash } from 'crypto';
import { v4 as uuid } from 'uuid';
import { Tier, type TierValue } from '@g3/contracts';
import type {
  AuditActorDto,
  AuthSessionDto,
  LoginDto,
  LoginResultDto,
  MfaChallengeConfirmDto,
  MfaChallengeConfirmResponseDto,
  MfaChallengeEnrollDto,
  MfaEnrollResponseDto,
  MfaVerifyDto,
  RefreshDto,
  RegisterCompanyDto,
  UserRole,
} from '@g3/contracts';
import { AuthError } from './errors';
import type { AuditService } from './audit/audit.service';
import type { MfaService } from './mfa/mfa.service';
import type { MfaChallengeService } from './mfa/mfa-challenge';
import type { SecurityPolicyService } from './security/security-policy';
import {
  ALL_ROLES,
  NO_META,
  assertAdmin,
  auditActor,
  type ActorContext,
  type RequestMeta,
} from './security/actor';
import type { UserRecord } from './repos/in-memory.user.repo';
import type { PasswordHasher } from './password.hasher';
import type { JwtTokenIssuer } from './token.issuer';
import type { EventBus } from './event.bus';
import type { UserRepo } from './repos/in-memory.user.repo';
import type { CompanyRepo } from './repos/in-memory.company.repo';

const MIN_PASSWORD_LENGTH = 12;

/**
 * Dependencias de seguridad (MFA, política, auditoría). Opcionales para no
 * romper a quien construye el servicio "a mano"; `container.ts` siempre
 * las inyecta en runtime.
 */
export interface AuthSecurityDeps {
  mfa: MfaService;
  challenges: MfaChallengeService;
  policies: SecurityPolicyService;
  audit: AuditService;
}

export type PublicUser = Omit<UserRecord, 'passwordHash'>;

function emailHash(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 16);
}

export class AuthService {
  constructor(
    private readonly users: UserRepo,
    private readonly companies: CompanyRepo,
    private readonly hasher: PasswordHasher,
    private readonly tokens: JwtTokenIssuer,
    private readonly bus: EventBus,
    private readonly security?: AuthSecurityDeps,
  ) {}

  async registerCompany(input: RegisterCompanyDto): Promise<AuthSessionDto> {
    if (input.password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
        `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      );
    }
    if (await this.users.findByEmail(input.contactEmail)) {
      throw new Error('Ese correo ya existe en G3');
    }

    const now = new Date().toISOString();
    const companyId = uuid();
    await this.companies.create({
      id: companyId,
      name: input.companyName,
      rfc: input.rfc ?? null,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone ?? null,
      createdAt: now,
    });

    const userId = uuid();
    const passwordHash = await this.hasher.hash(input.password);
    await this.users.create({
      id: userId,
      email: input.contactEmail,
      passwordHash,
      fullName: input.ownerName,
      role: 'owner',
      companyId,
      tier: Tier.Free,
      createdAt: now,
    });

    await this.bus.publish({
      type: 'auth.company_registered',
      occurredAt: now,
      companyId,
      data: { companyName: input.companyName, ownerEmail: input.contactEmail },
    });

    return this.buildSession({
      id: userId,
      email: input.contactEmail,
      role: 'owner',
      companyId,
      tier: Tier.Free,
    });
  }

  /**
   * Paso 1 del login. Con MFA activo (o exigido por política) NO emite JWT:
   * devuelve `{ mfaRequired, mfaToken }` y la sesión sale de `verifyMfa` /
   * `challengeConfirm`.
   */
  async login(input: LoginDto, meta: RequestMeta = NO_META): Promise<LoginResultDto> {
    const user = await this.users.findByEmail(input.email);
    const fakeHash = '$2a$04$00000000000000000000000000000000000000000000000000000';
    // verificar siempre — evita timing attack que enumera emails
    const ok = user
      ? await this.hasher.verify(input.password, user.passwordHash)
      : await this.hasher.verify(input.password, fakeHash);
    if (!user || !ok) {
      await this.audit({
        companyId: user?.companyId ?? null,
        actor: user ? auditActor({ userId: user.id, role: user.role }) : { type: 'anonymous', userId: null, role: null },
        action: 'auth.login.failed',
        resourceId: user?.id ?? null,
        meta,
        metadata: { reason: 'bad_credentials', method: 'password', ...(user ? {} : { emailHash: emailHash(input.email) }) },
      });
      throw new AuthError(401, 'Credenciales incorrectas');
    }

    if (this.security) {
      const { mfa, policies, challenges } = this.security;
      const enabled = await mfa.isEnabled(user.id);
      const required = await policies.requiresMfa(user.companyId, user.role);
      if (enabled || required) {
        const { token, expiresInSec } = await challenges.issue(user.id, enabled ? 'verify' : 'enroll');
        return { mfaRequired: true, mfaToken: token, expiresInSec, mfaEnrollmentRequired: !enabled };
      }
    }

    await this.auditLoginOk(user, meta, { method: 'password' });
    return this.sessionFor(user);
  }

  /** Paso 2: TOTP o código de recuperación contra el mfaToken (máx. 5 intentos). */
  async verifyMfa(input: MfaVerifyDto, meta: RequestMeta = NO_META): Promise<AuthSessionDto> {
    const sec = this.requireSecurity();
    const { userId, jti } = await sec.challenges.verify(input?.mfaToken, 'verify');
    const user = await this.users.findById(userId);
    if (!user) throw new AuthError(401, 'Token MFA inválido');

    const r = await sec.mfa.verifyCode(user, input.code, meta);
    if (!r.ok) {
      await this.registerMfaFailure(user, jti, meta);
      throw new AuthError(401, 'Código MFA incorrecto');
    }
    if (!(await sec.challenges.consume(jti))) throw new AuthError(401, 'Token MFA ya usado');
    await this.auditLoginOk(user, meta, { method: `password+${r.method}` });
    return this.sessionFor(user);
  }

  /** Enrolamiento forzado por política durante el login (mfaToken de propósito `enroll`). */
  async challengeEnroll(input: MfaChallengeEnrollDto): Promise<MfaEnrollResponseDto> {
    const sec = this.requireSecurity();
    const { userId } = await sec.challenges.verify(input?.mfaToken, 'enroll');
    const user = await this.users.findById(userId);
    if (!user) throw new AuthError(401, 'Token MFA inválido');
    return sec.mfa.beginEnrollment(user);
  }

  async challengeConfirm(
    input: MfaChallengeConfirmDto,
    meta: RequestMeta = NO_META,
  ): Promise<MfaChallengeConfirmResponseDto> {
    const sec = this.requireSecurity();
    const { userId, jti } = await sec.challenges.verify(input?.mfaToken, 'enroll');
    const user = await this.users.findById(userId);
    if (!user) throw new AuthError(401, 'Token MFA inválido');
    let recoveryCodes: string[];
    try {
      ({ recoveryCodes } = await sec.mfa.confirmEnrollment(user, input.code, meta));
    } catch (e) {
      if (e instanceof AuthError && e.status === 401) await this.registerMfaFailure(user, jti, meta);
      throw e;
    }
    if (!(await sec.challenges.consume(jti))) throw new AuthError(401, 'Token MFA ya usado');
    await this.auditLoginOk(user, meta, { method: 'password+mfa_enrollment' });
    return { session: this.sessionFor(user), recoveryCodes };
  }

  async refresh(input: RefreshDto): Promise<AuthSessionDto> {
    const { sub } = this.tokens.verifyRefresh(input.refreshToken);
    const user = await this.users.findById(sub);
    if (!user) throw new Error('Sesión inválida');
    return this.sessionFor(user);
  }

  async getUser(id: string): Promise<UserRecord | null> {
    return this.users.findById(id);
  }

  /** Cambio de rol dentro de la compañía del actor. Siempre auditado. */
  async changeUserRole(actor: ActorContext, targetUserId: string, role: UserRole): Promise<PublicUser> {
    assertAdmin(actor);
    if (!ALL_ROLES.includes(role)) throw new AuthError(400, 'Rol inválido');
    const target = await this.users.findById(targetUserId);
    if (!target || target.companyId !== actor.companyId) throw new AuthError(404, 'Usuario no encontrado');
    if (actor.role !== 'owner' && (role === 'owner' || target.role === 'owner')) {
      throw new AuthError(403, 'Solo un owner puede asignar o modificar owners');
    }
    if (target.role === 'owner' && role !== 'owner') {
      const owners = (await this.users.findByCompanyId(actor.companyId)).filter((u) => u.role === 'owner');
      if (owners.length <= 1) throw new AuthError(409, 'La compañía debe conservar al menos un owner');
    }
    const updated = (await this.users.updateRole(target.id, role))!;
    await this.audit({
      companyId: actor.companyId,
      actor: auditActor(actor),
      action: 'user.role_changed',
      resourceId: target.id,
      meta: actor,
      metadata: { from: target.role, to: role },
    });
    const { passwordHash: _omit, ...pub } = updated;
    return pub;
  }

  /** Emite sesión para un usuario ya autenticado por otro medio (SSO). */
  sessionFor(user: Pick<UserRecord, 'id' | 'email' | 'role' | 'companyId' | 'tier' | 'driverId'>): AuthSessionDto {
    return this.buildSession({
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      tier: user.tier,
      ...(user.role === 'driver' && user.driverId ? { driverId: user.driverId } : {}),
    });
  }

  /** Llamado desde el subscriber de Pub/Sub cuando billing emite subscription.upgraded */
  async applyTier(companyId: string, tier: TierValue): Promise<void> {
    await this.users.updateTierForCompany(companyId, tier);
  }

  private requireSecurity(): AuthSecurityDeps {
    if (!this.security) throw new AuthError(501, 'MFA no está configurado en este servicio');
    return this.security;
  }

  private async registerMfaFailure(user: UserRecord, jti: string, meta: RequestMeta): Promise<void> {
    const sec = this.requireSecurity();
    const f = await sec.challenges.recordFailure(jti);
    const base = { companyId: user.companyId, actor: auditActor({ userId: user.id, role: user.role }), resourceId: user.id, meta };
    await this.audit({ ...base, action: 'auth.mfa.verify_failed', metadata: { remainingAttempts: f.remaining } });
    if (f.locked) await this.audit({ ...base, action: 'auth.mfa.locked', metadata: {} });
  }

  private async auditLoginOk(user: UserRecord, meta: RequestMeta, metadata: Record<string, unknown>) {
    await this.audit({
      companyId: user.companyId,
      actor: auditActor({ userId: user.id, role: user.role }),
      action: 'auth.login.succeeded',
      resourceId: user.id,
      meta,
      metadata,
    });
  }

  private async audit(e: {
    companyId: string | null;
    actor: AuditActorDto;
    action: Parameters<AuditService['record']>[0]['action'];
    resourceId: string | null;
    meta: RequestMeta;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    if (!this.security) return;
    await this.security.audit.record({
      companyId: e.companyId,
      actor: e.actor,
      action: e.action,
      resource: { type: 'user', id: e.resourceId },
      ip: e.meta.ip,
      userAgent: e.meta.userAgent,
      metadata: e.metadata,
    });
  }

  private buildSession(user: {
    id: string;
    email: string;
    role: AuthSessionDto['user']['role'];
    companyId: string;
    tier: TierValue;
    driverId?: string;
  }): AuthSessionDto {
    const tokens = this.tokens.issue({
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      tier: user.tier,
      ...(user.driverId ? { driverId: user.driverId } : {}),
    });
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
    };
  }
}
