/**
 * Contratos y cliente de seguridad para G3 Admin: MFA (TOTP), SSO (OIDC) y
 * bitácora de auditoría. Espejo de `backend/contracts/src/dtos/security.ts`.
 */
import { api, tokenStore } from './client';
import type { AuthSession } from './types';

export type UserRole = AuthSession['user']['role'];

export const MFA_MANDATORY_ROLES: readonly UserRole[] = ['owner', 'admin'];

// ===================== MFA =====================

export interface MfaChallenge {
  mfaRequired: true;
  mfaToken: string;
  expiresInSec: number;
  mfaEnrollmentRequired: boolean;
}

export type LoginResult = AuthSession | MfaChallenge;

export function isMfaChallenge(r: unknown): r is MfaChallenge {
  return typeof r === 'object' && r !== null && (r as MfaChallenge).mfaRequired === true;
}

/** Lo lanza `authApi.login` cuando el backend pide segundo factor. */
export class MfaRequiredError extends Error {
  constructor(readonly challenge: MfaChallenge) {
    super('Se requiere verificación en dos pasos');
    this.name = 'MfaRequiredError';
  }
}

export interface MfaEnrollResponse {
  secret: string;
  otpauthUri: string;
  issuer: string;
  account: string;
}

export interface MfaStatus {
  enabled: boolean;
  pending: boolean;
  enrolledAt: string | null;
  recoveryCodesRemaining: number;
  requiredByPolicy: boolean;
}

export interface SecurityPolicy {
  companyId: string;
  requireMfaForRoles: UserRole[];
  updatedAt: string;
}

/** 6 dígitos (TOTP) o código de recuperación XXXXX-XXXXX. */
export function isValidMfaCodeFormat(code: string): boolean {
  const c = (code ?? '').trim();
  if (/^\d{6}$/.test(c.replace(/\s/g, ''))) return true;
  return c.toUpperCase().replace(/[^A-Z2-7]/g, '').length === 10;
}

// ===================== SSO =====================

export type SsoProvider = 'google' | 'microsoft' | 'oidc';

export const SSO_PROVIDER_LABEL: Record<SsoProvider, string> = {
  google: 'Google Workspace',
  microsoft: 'Microsoft Entra ID',
  oidc: 'OIDC genérico',
};

export interface SsoConfig {
  companyId: string;
  provider: SsoProvider;
  enabled: boolean;
  issuer: string;
  clientId: string;
  clientSecretRef: string;
  allowedDomains: string[];
  jitProvisioning: boolean;
  updatedAt: string;
}

export type UpdateSsoConfig = Omit<SsoConfig, 'companyId' | 'updatedAt'>;

export interface SsoDiscoverResponse {
  ssoEnabled: boolean;
  provider: SsoProvider | null;
}

// ===================== Audit =====================

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
  | 'expense_policy.updated';

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  'auth.login.succeeded': 'Inicio de sesión',
  'auth.login.failed': 'Inicio de sesión fallido',
  'auth.mfa.verify_failed': 'Código MFA incorrecto',
  'auth.mfa.locked': 'MFA bloqueado por intentos',
  'auth.mfa.enrolled': 'MFA activado',
  'auth.mfa.disabled': 'MFA desactivado',
  'auth.mfa.recovery_code_used': 'Código de recuperación usado',
  'auth.mfa.recovery_codes_regenerated': 'Códigos de recuperación regenerados',
  'user.role_changed': 'Cambio de rol',
  'user.provisioned_jit': 'Alta automática por SSO',
  'security_policy.updated': 'Política de seguridad',
  'sso_config.updated': 'Configuración SSO',
  'expense_policy.updated': 'Regla de gastos',
};

export interface AuditEntry {
  id: string;
  seq: number;
  companyId: string | null;
  actor: { type: 'user' | 'system' | 'anonymous'; userId: string | null; role: UserRole | null };
  action: AuditAction;
  resource: { type: string; id: string | null };
  ip: string | null;
  userAgent: string | null;
  timestamp: string;
  metadata: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

export interface AuditQuery {
  page?: number;
  pageSize?: number;
  action?: AuditAction;
  actorId?: string;
  resourceType?: string;
  from?: string;
  to?: string;
}

export interface AuditPage {
  items: AuditEntry[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AuditIntegrity {
  ok: boolean;
  entries: number;
  brokenAtSeq: number | null;
  reason: string | null;
}

// ===================== Clientes =====================

function saveSession(s: AuthSession) {
  tokenStore.save({ accessToken: s.accessToken, refreshToken: s.refreshToken });
}

/** Login en dos pasos y SSO (rutas públicas — sin Bearer). */
export const mfaLoginApi = {
  /** Paso 1: guarda tokens solo si el backend devolvió sesión completa. */
  async login(input: { email: string; password: string }): Promise<LoginResult> {
    const res = await api.post<LoginResult>('/auth/login', input, { anonymous: true });
    if (!isMfaChallenge(res)) saveSession(res);
    return res;
  },
  async verify(input: { mfaToken: string; code: string }): Promise<AuthSession> {
    const res = await api.post<AuthSession>('/auth/mfa/verify', input, { anonymous: true });
    saveSession(res);
    return res;
  },
  challengeEnroll: (mfaToken: string) =>
    api.post<MfaEnrollResponse>('/auth/mfa/challenge/enroll', { mfaToken }, { anonymous: true }),
  async challengeConfirm(input: { mfaToken: string; code: string }) {
    const res = await api.post<{ session: AuthSession; recoveryCodes: string[] }>(
      '/auth/mfa/challenge/confirm',
      input,
      { anonymous: true },
    );
    saveSession(res.session);
    return res;
  },
  ssoDiscover: (email: string) =>
    api.get<SsoDiscoverResponse>('/auth/sso/discover', { query: { email }, anonymous: true }),
  ssoStart: (email: string) =>
    api.post<{ authorizationUrl: string; state: string }>('/auth/sso/start', { email }, { anonymous: true }),
  async ssoCallback(input: { state: string; code: string }): Promise<AuthSession> {
    const res = await api.post<AuthSession>('/auth/sso/callback', input, { anonymous: true });
    saveSession(res);
    return res;
  },
};

/** Endpoints autenticados (Bearer). */
export const securityApi = {
  mfaStatus: () => api.get<MfaStatus>('/auth/mfa/status'),
  mfaEnroll: () => api.post<MfaEnrollResponse>('/auth/mfa/enroll'),
  mfaConfirm: (code: string) => api.post<{ recoveryCodes: string[] }>('/auth/mfa/confirm', { code }),
  mfaDisable: (code: string) => api.post<{ ok: true }>('/auth/mfa/disable', { code }),
  regenerateRecoveryCodes: (code: string) =>
    api.post<{ recoveryCodes: string[] }>('/auth/mfa/recovery-codes', { code }),
  getPolicy: () => api.get<SecurityPolicy>('/auth/security-policy'),
  updatePolicy: (requireMfaForRoles: UserRole[]) =>
    api.put<SecurityPolicy>('/auth/security-policy', { requireMfaForRoles }),
  getSso: () => api.get<SsoConfig | null>('/auth/sso/config'),
  updateSso: (cfg: UpdateSsoConfig) =>
    api.put<SsoConfig>('/auth/sso/config', cfg),
  changeRole: (userId: string, role: UserRole) =>
    api.patch<{ id: string; role: UserRole }>(`/users/${encodeURIComponent(userId)}/role`, { role }),
};

export const auditApi = {
  list: (q: AuditQuery = {}) =>
    api.get<AuditPage>('/audit/events', { query: q as Record<string, string | number | undefined> }),
  verify: () => api.get<AuditIntegrity>('/audit/verify'),
};
