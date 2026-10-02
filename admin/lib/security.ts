'use client';
/**
 * Estado de seguridad de G3 Admin: login en dos pasos (MFA), SSO, ajustes
 * de seguridad (MFA del usuario, política por compañía, config SSO) y
 * bitácora de auditoría.
 *
 * - Live: pega al backend (mfaLoginApi / securityApi / auditApi).
 * - Demo: simula todo en localStorage para que el flujo se pueda mostrar
 *   sin backend (cualquier código de 6 dígitos excepto 000000 es válido).
 */
import { create } from 'zustand';
import { isLive } from './api/config';
import { G3ApiError, type AuthSession } from './api/types';
import {
  auditApi,
  isMfaChallenge,
  isValidMfaCodeFormat,
  MFA_MANDATORY_ROLES,
  mfaLoginApi,
  securityApi,
  type AuditAction,
  type AuditEntry,
  type AuditIntegrity,
  type AuditPage,
  type AuditQuery,
  type MfaEnrollResponse,
  type MfaStatus,
  type SecurityPolicy,
  type SsoConfig,
  type SsoDiscoverResponse,
  type UpdateSsoConfig,
  type UserRole,
} from './api/security';
import { onExpensePolicyChanged, useAppStore } from './store';

export type LoginStep = 'credentials' | 'mfa' | 'enroll' | 'recovery-codes' | 'done';

const DEMO_KEY = 'g3admin.security.demo.v1';
const SSO_STATE_KEY = 'g3admin.sso.state.v1';
const ROLE_ORDER: UserRole[] = ['owner', 'admin', 'dispatcher', 'driver', 'viewer'];

interface PendingMfa {
  mfaToken: string;
  email: string;
  enrollmentRequired: boolean;
}

interface SecurityState {
  /* login */
  step: LoginStep;
  pending: PendingMfa | null;
  enrollment: MfaEnrollResponse | null;
  recoveryCodes: string[] | null;
  error: string | null;
  busy: boolean;
  beginLogin: (email: string, password: string) => Promise<LoginStep>;
  submitMfaCode: (code: string) => Promise<boolean>;
  startForcedEnrollment: () => Promise<void>;
  confirmForcedEnrollment: (code: string) => Promise<boolean>;
  acknowledgeRecoveryCodes: () => void;
  cancelLogin: () => void;

  /* SSO */
  discoverSso: (email: string) => Promise<SsoDiscoverResponse>;
  startSso: (email: string) => Promise<string>;
  completeSso: (p: { code: string; state: string }) => Promise<boolean>;

  /* ajustes */
  mfa: MfaStatus | null;
  policy: SecurityPolicy | null;
  sso: SsoConfig | null;
  loadSecurity: () => Promise<void>;
  startEnrollment: () => Promise<void>;
  confirmEnrollment: (code: string) => Promise<boolean>;
  disableMfa: (code: string) => Promise<boolean>;
  regenerateRecoveryCodes: (code: string) => Promise<boolean>;
  setRequireMfaForRoles: (roles: UserRole[]) => Promise<void>;
  saveSso: (cfg: UpdateSsoConfig) => Promise<boolean>;

  /* bitácora */
  audit: AuditPage | null;
  integrity: AuditIntegrity | null;
  loadAudit: (q: AuditQuery) => Promise<void>;
  verifyAudit: () => Promise<void>;
}

// ------------------------------------------------------------------ helpers

function errMessage(e: unknown, fallback: string): string {
  if (e instanceof G3ApiError) return e.body?.message || fallback;
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

function normalizeCode(code: string): string {
  const c = (code ?? '').trim();
  const digits = c.replace(/\s/g, '');
  if (/^\d{6}$/.test(digits)) return digits;
  const raw = c.toUpperCase().replace(/[^A-Z2-7]/g, '');
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

function withMandatory(roles: UserRole[]): UserRole[] {
  const set = new Set<UserRole>([...MFA_MANDATORY_ROLES, ...roles]);
  return ROLE_ORDER.filter((r) => set.has(r));
}

const session = {
  get(k: string): string | null {
    try {
      if (typeof sessionStorage !== 'undefined') return sessionStorage.getItem(k);
    } catch {
      /* sin sessionStorage */
    }
    return memSession.get(k) ?? null;
  },
  set(k: string, v: string | null) {
    try {
      if (typeof sessionStorage !== 'undefined') {
        if (v == null) sessionStorage.removeItem(k);
        else sessionStorage.setItem(k, v);
        return;
      }
    } catch {
      /* sin sessionStorage */
    }
    if (v == null) memSession.delete(k);
    else memSession.set(k, v);
  },
};
const memSession = new Map<string, string>();

// ------------------------------------------------------------------- demo

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function randomB32(n: number): string {
  const bytes = new Uint8Array(n);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => B32[b & 31]).join('');
}

interface DemoSecurity {
  mfaEnabled: boolean;
  mfaEnrolledAt: string | null;
  pendingSecret: string | null;
  recoveryCodes: { code: string; used: boolean }[];
  requireMfaForRoles: UserRole[];
  sso: SsoConfig | null;
  audit: AuditEntry[];
}

const DEMO_USER = { id: 'usr_demo_admin', role: 'owner' as UserRole, email: 'despacho@g3logistics.mx' };
const DEMO_COMPANY = 'cmp_demo';

function demoDefault(): DemoSecurity {
  return {
    mfaEnabled: false,
    mfaEnrolledAt: null,
    pendingSecret: null,
    recoveryCodes: [],
    requireMfaForRoles: ['owner', 'admin'],
    sso: null,
    audit: [],
  };
}

function demoLoad(): DemoSecurity {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(DEMO_KEY) : null;
    return raw ? { ...demoDefault(), ...JSON.parse(raw) } : demoDefault();
  } catch {
    return demoDefault();
  }
}

function demoSave(d: DemoSecurity) {
  if (typeof window !== 'undefined') window.localStorage.setItem(DEMO_KEY, JSON.stringify(d));
}

function demoAudit(action: AuditAction, resource: AuditEntry['resource'], metadata: Record<string, unknown> = {}) {
  const d = demoLoad();
  const prev = d.audit[d.audit.length - 1];
  d.audit.push({
    id: `demo_${d.audit.length + 1}`,
    seq: d.audit.length + 1,
    companyId: DEMO_COMPANY,
    actor: { type: 'user', userId: DEMO_USER.id, role: DEMO_USER.role },
    action,
    resource,
    ip: '127.0.0.1',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'demo',
    timestamp: new Date().toISOString(),
    metadata,
    prevHash: prev?.hash ?? '0'.repeat(64),
    hash: randomB32(32).toLowerCase(),
  });
  demoSave(d);
}

function demoStatus(d: DemoSecurity): MfaStatus {
  return {
    enabled: d.mfaEnabled,
    pending: !!d.pendingSecret,
    enrolledAt: d.mfaEnrolledAt,
    recoveryCodesRemaining: d.recoveryCodes.filter((c) => !c.used).length,
    requiredByPolicy: d.requireMfaForRoles.includes(DEMO_USER.role),
  };
}

function demoCodeOk(code: string): 'totp' | 'recovery' | null {
  const c = normalizeCode(code);
  if (/^\d{6}$/.test(c)) return c === '000000' ? null : 'totp';
  const d = demoLoad();
  const rc = d.recoveryCodes.find((r) => !r.used && r.code === c);
  if (!rc) return null;
  rc.used = true;
  demoSave(d);
  demoAudit('auth.mfa.recovery_code_used', { type: 'user', id: DEMO_USER.id }, {
    remaining: d.recoveryCodes.filter((r) => !r.used).length,
  });
  return 'recovery';
}

function demoEnroll(): MfaEnrollResponse {
  const d = demoLoad();
  const secret = randomB32(32);
  d.pendingSecret = secret;
  demoSave(d);
  const issuer = encodeURIComponent('G3 Admin');
  const account = encodeURIComponent(DEMO_USER.email);
  return {
    secret,
    otpauthUri: `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`,
    issuer: 'G3 Admin',
    account: DEMO_USER.email,
  };
}

function demoConfirm(code: string): string[] | null {
  const c = normalizeCode(code);
  const d = demoLoad();
  if (!d.pendingSecret || !/^\d{6}$/.test(c) || c === '000000') return null;
  const codes = Array.from({ length: 10 }, () => {
    const r = randomB32(10);
    return `${r.slice(0, 5)}-${r.slice(5)}`;
  });
  d.pendingSecret = null;
  d.mfaEnabled = true;
  d.mfaEnrolledAt = new Date().toISOString();
  d.recoveryCodes = codes.map((code) => ({ code, used: false }));
  demoSave(d);
  demoAudit('auth.mfa.enrolled', { type: 'user', id: DEMO_USER.id }, { method: 'totp' });
  return codes;
}

function demoSession(email: string): AuthSession {
  return {
    accessToken: 'demo.access',
    refreshToken: 'demo.refresh',
    user: { id: DEMO_USER.id, email, role: DEMO_USER.role, companyId: DEMO_COMPANY, tier: useAppStore.getState().tier },
  };
}

// La regla de gastos vive hoy en el cliente: en demo la registramos en la
// bitácora local. En live, el servicio dueño de la regla debe llamar a
// POST /audit/events (ingesta interna) — ver security/08-pentest-scope.md.
onExpensePolicyChanged((before, after) => {
  if (isLive) return;
  demoAudit('expense_policy.updated', { type: 'expense_policy', id: DEMO_COMPANY }, { before, after });
});

// ------------------------------------------------------------------ store

const INITIAL = {
  step: 'credentials' as LoginStep,
  pending: null,
  enrollment: null,
  recoveryCodes: null,
  error: null,
  busy: false,
  mfa: null,
  policy: null,
  sso: null,
  audit: null,
  integrity: null,
};

export const useSecurityStore = create<SecurityState>((set, get) => {
  /** Ejecuta `fn` marcando busy y limpiando error; devuelve null si lanzó. */
  async function guarded<T>(fn: () => Promise<T>, fallback: string): Promise<T | null> {
    set({ busy: true, error: null });
    try {
      return await fn();
    } catch (e) {
      set({ error: errMessage(e, fallback) });
      return null;
    } finally {
      set({ busy: false });
    }
  }

  async function finish(s: AuthSession, next: LoginStep = 'done') {
    await useAppStore.getState().completeSignIn(s);
    set({ step: next, pending: null, ...(next === 'done' ? { enrollment: null } : {}) });
  }

  return {
    ...INITIAL,

    // ------------------------------------------------------------ login
    beginLogin: async (email, password) => {
      const step = await guarded<LoginStep>(async () => {
        if (!isLive) {
          if (demoLoad().mfaEnabled) {
            set({ step: 'mfa', pending: { mfaToken: 'demo', email, enrollmentRequired: false } });
            return 'mfa';
          }
          demoAudit('auth.login.succeeded', { type: 'user', id: DEMO_USER.id }, { method: 'password' });
          await finish(demoSession(email));
          return 'done';
        }
        const r = await mfaLoginApi.login({ email, password });
        if (!isMfaChallenge(r)) {
          await finish(r);
          return 'done';
        }
        set({ pending: { mfaToken: r.mfaToken, email, enrollmentRequired: r.mfaEnrollmentRequired } });
        if (r.mfaEnrollmentRequired) {
          set({ step: 'enroll' });
          set({ enrollment: await mfaLoginApi.challengeEnroll(r.mfaToken) });
          return 'enroll';
        }
        set({ step: 'mfa' });
        return 'mfa';
      }, 'No fue posible iniciar sesión');
      return step ?? get().step;
    },

    submitMfaCode: async (code) => {
      const pending = get().pending;
      if (!pending) return false;
      if (!isValidMfaCodeFormat(code)) {
        set({ error: 'Escribe el código de 6 dígitos de tu app o un código de recuperación.' });
        return false;
      }
      const normalized = normalizeCode(code);
      set({ busy: true, error: null });
      try {
        if (!isLive) {
          const method = demoCodeOk(normalized);
          if (!method) throw new Error('Código MFA incorrecto');
          demoAudit('auth.login.succeeded', { type: 'user', id: DEMO_USER.id }, { method: `password+${method}` });
          await finish(demoSession(pending.email));
          return true;
        }
        const s = await mfaLoginApi.verify({ mfaToken: pending.mfaToken, code: normalized });
        await finish(s);
        return true;
      } catch (e) {
        const msg = errMessage(e, 'Código MFA incorrecto');
        // 429 (bloqueado) o 401 por token expirado/usado: hay que reiniciar el login
        const restart =
          e instanceof G3ApiError && (e.status === 429 || /expirad|usado|inválido/i.test(msg));
        set(restart ? { error: msg, step: 'credentials', pending: null } : { error: msg });
        return false;
      } finally {
        set({ busy: false });
      }
    },

    startForcedEnrollment: async () => {
      const pending = get().pending;
      if (!pending) return;
      await guarded(async () => {
        set({ enrollment: isLive ? await mfaLoginApi.challengeEnroll(pending.mfaToken) : demoEnroll(), step: 'enroll' });
      }, 'No fue posible iniciar el enrolamiento');
    },

    confirmForcedEnrollment: async (code) => {
      const pending = get().pending;
      if (!pending) return false;
      const ok = await guarded(async () => {
        if (!isLive) {
          const codes = demoConfirm(code);
          if (!codes) throw new Error('Código MFA incorrecto');
          set({ recoveryCodes: codes });
          await finish(demoSession(pending.email), 'recovery-codes');
          return true;
        }
        const r = await mfaLoginApi.challengeConfirm({ mfaToken: pending.mfaToken, code: normalizeCode(code) });
        set({ recoveryCodes: r.recoveryCodes });
        await finish(r.session, 'recovery-codes');
        return true;
      }, 'Código MFA incorrecto');
      return ok === true;
    },

    acknowledgeRecoveryCodes: () => set({ recoveryCodes: null, enrollment: null, step: 'done' }),

    cancelLogin: () => set({ step: 'credentials', pending: null, enrollment: null, error: null }),

    // -------------------------------------------------------------- SSO
    discoverSso: async (email) => {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email ?? '')) return { ssoEnabled: false, provider: null };
      if (!isLive) {
        const sso = demoLoad().sso;
        const domain = email.split('@')[1].toLowerCase();
        return sso?.enabled && sso.allowedDomains.includes(domain)
          ? { ssoEnabled: true, provider: sso.provider }
          : { ssoEnabled: false, provider: null };
      }
      try {
        return await mfaLoginApi.ssoDiscover(email);
      } catch {
        return { ssoEnabled: false, provider: null };
      }
    },

    startSso: async (email) => {
      if (!isLive) {
        demoAudit('auth.login.succeeded', { type: 'user', id: DEMO_USER.id }, { method: 'sso', provider: demoLoad().sso?.provider });
        await finish(demoSession(email));
        return '/dashboard';
      }
      const r = await mfaLoginApi.ssoStart(email);
      // Se compara en el callback: un callback que no iniciamos nosotros se rechaza.
      session.set(SSO_STATE_KEY, r.state);
      return r.authorizationUrl;
    },

    completeSso: async ({ code, state }) => {
      const expected = session.get(SSO_STATE_KEY);
      session.set(SSO_STATE_KEY, null);
      if (!expected || !state || expected !== state) {
        set({ error: 'La respuesta de SSO no corresponde a este navegador. Vuelve a intentarlo.' });
        return false;
      }
      const ok = await guarded(async () => {
        await finish(await mfaLoginApi.ssoCallback({ code, state }));
        return true;
      }, 'No fue posible completar el inicio de sesión con SSO');
      return ok === true;
    },

    // ---------------------------------------------------------- ajustes
    loadSecurity: async () => {
      await guarded(async () => {
        if (!isLive) {
          const d = demoLoad();
          set({
            mfa: demoStatus(d),
            policy: { companyId: DEMO_COMPANY, requireMfaForRoles: withMandatory(d.requireMfaForRoles), updatedAt: '' },
            sso: d.sso,
          });
          return;
        }
        const [mfa, policy, sso] = await Promise.all([
          securityApi.mfaStatus(),
          securityApi.getPolicy(),
          securityApi.getSso().catch(() => null),
        ]);
        set({ mfa, policy, sso });
      }, 'No fue posible cargar la configuración de seguridad');
    },

    startEnrollment: async () => {
      await guarded(async () => {
        set({ enrollment: isLive ? await securityApi.mfaEnroll() : demoEnroll(), recoveryCodes: null });
      }, 'No fue posible iniciar el enrolamiento');
    },

    confirmEnrollment: async (code) => {
      const ok = await guarded(async () => {
        if (!isLive) {
          const codes = demoConfirm(code);
          if (!codes) throw new Error('Código MFA incorrecto');
          set({ recoveryCodes: codes, enrollment: null, mfa: demoStatus(demoLoad()) });
          return true;
        }
        const { recoveryCodes } = await securityApi.mfaConfirm(normalizeCode(code));
        set({ recoveryCodes, enrollment: null, mfa: await securityApi.mfaStatus() });
        return true;
      }, 'Código MFA incorrecto');
      return ok === true;
    },

    disableMfa: async (code) => {
      const ok = await guarded(async () => {
        if (!isLive) {
          if (!demoCodeOk(code)) throw new Error('Código MFA incorrecto');
          const d = demoLoad();
          Object.assign(d, { mfaEnabled: false, mfaEnrolledAt: null, recoveryCodes: [] });
          demoSave(d);
          demoAudit('auth.mfa.disabled', { type: 'user', id: DEMO_USER.id });
          set({ mfa: demoStatus(demoLoad()), recoveryCodes: null });
          return true;
        }
        await securityApi.mfaDisable(normalizeCode(code));
        set({ mfa: await securityApi.mfaStatus(), recoveryCodes: null });
        return true;
      }, 'Código MFA incorrecto');
      return ok === true;
    },

    regenerateRecoveryCodes: async (code) => {
      const ok = await guarded(async () => {
        if (!isLive) {
          if (!demoCodeOk(code)) throw new Error('Código MFA incorrecto');
          const d = demoLoad();
          const codes = Array.from({ length: 10 }, () => {
            const r = randomB32(10);
            return `${r.slice(0, 5)}-${r.slice(5)}`;
          });
          d.recoveryCodes = codes.map((c) => ({ code: c, used: false }));
          demoSave(d);
          demoAudit('auth.mfa.recovery_codes_regenerated', { type: 'user', id: DEMO_USER.id }, { count: 10 });
          set({ recoveryCodes: codes, mfa: demoStatus(demoLoad()) });
          return true;
        }
        const { recoveryCodes } = await securityApi.regenerateRecoveryCodes(normalizeCode(code));
        set({ recoveryCodes, mfa: await securityApi.mfaStatus() });
        return true;
      }, 'Código MFA incorrecto');
      return ok === true;
    },

    setRequireMfaForRoles: async (roles) => {
      const next = withMandatory(roles);
      await guarded(async () => {
        if (!isLive) {
          const d = demoLoad();
          const before = withMandatory(d.requireMfaForRoles);
          d.requireMfaForRoles = next;
          demoSave(d);
          demoAudit('security_policy.updated', { type: 'security_policy', id: DEMO_COMPANY }, {
            before: { requireMfaForRoles: before },
            after: { requireMfaForRoles: next },
          });
          set({ policy: { companyId: DEMO_COMPANY, requireMfaForRoles: next, updatedAt: new Date().toISOString() }, mfa: demoStatus(d) });
          return;
        }
        set({ policy: await securityApi.updatePolicy(next) });
      }, 'No fue posible guardar la política');
    },

    saveSso: async (cfg) => {
      const ok = await guarded(async () => {
        if (!isLive) {
          const d = demoLoad();
          d.sso = { ...cfg, companyId: DEMO_COMPANY, updatedAt: new Date().toISOString() };
          demoSave(d);
          demoAudit('sso_config.updated', { type: 'sso_config', id: DEMO_COMPANY }, {
            after: { provider: cfg.provider, enabled: cfg.enabled, allowedDomains: cfg.allowedDomains },
          });
          set({ sso: d.sso });
          return true;
        }
        set({ sso: await securityApi.updateSso(cfg) });
        return true;
      }, 'No fue posible guardar la configuración SSO');
      return ok === true;
    },

    // ---------------------------------------------------------- bitácora
    loadAudit: async (q) => {
      await guarded(async () => {
        if (!isLive) {
          const page = Math.max(1, q.page ?? 1);
          const pageSize = Math.min(200, Math.max(1, q.pageSize ?? 25));
          const all = demoLoad()
            .audit.filter((e) => !q.action || e.action === q.action)
            .reverse();
          set({ audit: { items: all.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: all.length } });
          return;
        }
        set({ audit: await auditApi.list(q) });
      }, 'No fue posible cargar la bitácora');
    },

    verifyAudit: async () => {
      await guarded(async () => {
        if (!isLive) {
          const n = demoLoad().audit.length;
          set({ integrity: { ok: true, entries: n, brokenAtSeq: null, reason: null } });
          return;
        }
        set({ integrity: await auditApi.verify() });
      }, 'No fue posible verificar la bitácora');
    },
  };
});

/** Para tests y logout: limpia el estado de seguridad en memoria. */
export function resetSecurityStore() {
  useSecurityStore.setState({ ...INITIAL });
  memSession.clear();
}
