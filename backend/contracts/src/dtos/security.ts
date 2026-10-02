/**
 * Contratos de seguridad: MFA (TOTP), SSO (OIDC) y bitácora de auditoría.
 *
 * Login en dos pasos: `/auth/login` devuelve `LoginResultDto`, que es una
 * sesión completa (`AuthSessionDto`) o un reto MFA (`MfaChallengeDto`).
 * Con el reto, el cliente llama `/auth/mfa/verify` y recibe la sesión.
 */
import type { AuthSessionDto, UserRole } from './auth';

// ===================== MFA =====================

/** Roles a los que la política SIEMPRE exige MFA (no se pueden quitar). */
export const MFA_MANDATORY_ROLES: readonly UserRole[] = ['owner', 'admin'];

/** Respuesta de `/auth/login` cuando el usuario debe pasar por MFA. */
export interface MfaChallengeDto {
  mfaRequired: true;
  /** Token corto (5 min), de propósito único — NO sirve como access token. */
  mfaToken: string;
  expiresInSec: number;
  /**
   * true cuando la política de la compañía exige MFA al rol del usuario y
   * aún no lo ha enrolado: debe usar `/auth/mfa/challenge/enroll` +
   * `/auth/mfa/challenge/confirm` en vez de `/auth/mfa/verify`.
   */
  mfaEnrollmentRequired: boolean;
}

export type LoginResultDto = AuthSessionDto | MfaChallengeDto;

export function isMfaChallenge(r: LoginResultDto | unknown): r is MfaChallengeDto {
  return typeof r === 'object' && r !== null && (r as MfaChallengeDto).mfaRequired === true;
}

/** `code` acepta TOTP de 6 dígitos o un código de recuperación (XXXXX-XXXXX). */
export interface MfaVerifyDto {
  mfaToken: string;
  code: string;
}

export interface MfaEnrollResponseDto {
  /** Secreto base32 (RFC 4648, sin padding) para captura manual. */
  secret: string;
  /** URI `otpauth://totp/...` para generar el QR. */
  otpauthUri: string;
  issuer: string;
  account: string;
}

export interface MfaCodeDto {
  code: string;
}

export interface MfaChallengeEnrollDto {
  mfaToken: string;
}

export interface MfaChallengeConfirmDto {
  mfaToken: string;
  code: string;
}

export interface MfaRecoveryCodesDto {
  /** Se muestran UNA sola vez; el backend solo guarda hashes. */
  recoveryCodes: string[];
}

export interface MfaChallengeConfirmResponseDto extends MfaRecoveryCodesDto {
  session: AuthSessionDto;
}

export interface MfaStatusDto {
  enabled: boolean;
  /** Enrolamiento iniciado pero sin confirmar con el primer código. */
  pending: boolean;
  enrolledAt: string | null;
  recoveryCodesRemaining: number;
  /** La política de la compañía exige MFA al rol de este usuario. */
  requiredByPolicy: boolean;
}

export interface SecurityPolicyDto {
  companyId: string;
  /** Siempre incluye `MFA_MANDATORY_ROLES`. */
  requireMfaForRoles: UserRole[];
  updatedAt: string;
}

export interface UpdateSecurityPolicyDto {
  requireMfaForRoles: UserRole[];
}

// ===================== SSO (OIDC) =====================

export type SsoProvider = 'google' | 'microsoft' | 'oidc';

export interface SsoConfigDto {
  companyId: string;
  provider: SsoProvider;
  enabled: boolean;
  /** Ej. https://accounts.google.com o https://login.microsoftonline.com/{tenant}/v2.0 */
  issuer: string;
  clientId: string;
  /** Referencia a Secret Manager (nunca el secreto en claro). */
  clientSecretRef: string;
  /** Dominios de correo aceptados, ej. ['acme.mx']. */
  allowedDomains: string[];
  /** Alta automática (JIT) de usuarios nuevos del dominio con rol `viewer`. */
  jitProvisioning: boolean;
  updatedAt: string;
}

export type UpdateSsoConfigDto = Omit<SsoConfigDto, 'companyId' | 'updatedAt'>;

export interface SsoDiscoverResponseDto {
  ssoEnabled: boolean;
  provider: SsoProvider | null;
}

export interface SsoStartDto {
  email: string;
}

export interface SsoStartResponseDto {
  authorizationUrl: string;
  /** El cliente lo guarda (sessionStorage) y lo compara en el callback. */
  state: string;
}

export interface SsoCallbackDto {
  state: string;
  code: string;
}

// ===================== Roles =====================

export interface ChangeUserRoleDto {
  role: UserRole;
}

// ===================== Audit log =====================

export type AuditAction =
  | 'auth.login.succeeded'
  | 'auth.login.failed'
  | 'auth.mfa.verify_failed'
  | 'auth.mfa.locked'
  | 'auth.mfa.enrolled'
  | 'auth.mfa.disabled'
  | 'auth.mfa.recovery_code_used'
  | 'auth.mfa.recovery_codes_regenerated'
  | 'user.role_changed'
  | 'user.provisioned_jit'
  | 'security_policy.updated'
  | 'sso_config.updated'
  | 'expense_policy.updated'
  | 'auth.otp.requested'
  | 'auth.otp.failed'
  | 'auth.password_reset.requested'
  | 'auth.password_reset.completed'
  | 'user.driver_access_granted';

export const AUDIT_ACTIONS: readonly AuditAction[] = [
  'auth.login.succeeded',
  'auth.login.failed',
  'auth.mfa.verify_failed',
  'auth.mfa.locked',
  'auth.mfa.enrolled',
  'auth.mfa.disabled',
  'auth.mfa.recovery_code_used',
  'auth.mfa.recovery_codes_regenerated',
  'user.role_changed',
  'user.provisioned_jit',
  'security_policy.updated',
  'sso_config.updated',
  'expense_policy.updated',
  'auth.otp.requested',
  'auth.otp.failed',
  'auth.password_reset.requested',
  'auth.password_reset.completed',
  'user.driver_access_granted',
];

export interface AuditActorDto {
  type: 'user' | 'system' | 'anonymous';
  userId: string | null;
  role: UserRole | null;
}

export interface AuditEntryDto {
  id: string;
  /** Posición en la cadena de la compañía (1..n). */
  seq: number;
  /** null = evento sin compañía resoluble (p.ej. login de correo inexistente). */
  companyId: string | null;
  actor: AuditActorDto;
  action: AuditAction;
  resource: { type: string; id: string | null };
  ip: string | null;
  userAgent: string | null;
  timestamp: string;
  metadata: Record<string, unknown>;
  /** Hash de la entrada anterior de la misma cadena ('0'*64 para la primera). */
  prevHash: string;
  /** sha256(prevHash + JSON canónico de la entrada). */
  hash: string;
}

export interface AuditQueryDto {
  page?: number;
  pageSize?: number;
  action?: AuditAction;
  actorId?: string;
  resourceType?: string;
  /** ISO-8601 inclusivo. */
  from?: string;
  /** ISO-8601 inclusivo. */
  to?: string;
}

export interface AuditPageDto {
  items: AuditEntryDto[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AuditIntegrityDto {
  ok: boolean;
  entries: number;
  /** seq de la primera entrada inválida, si la cadena está rota. */
  brokenAtSeq: number | null;
  reason: string | null;
}
