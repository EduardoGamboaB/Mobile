import { create } from 'zustand';
import { getMyProfile } from '@/api/profiles';
import { isDemo, DEMO_USER_ID, demoProfile } from '@/demo';
import type { Profile } from '@/models';
import { authApi, type RegisterCompanyInput } from '@/api/g3/auth';
import { tokenStore } from '@/api/g3/client';
import type { AuthSession } from '@/api/g3/types';
import { useSubscriptionStore } from '@/stores/subscription';

/**
 * Sesión de G3 Drive. El backend G3 (NestJS) es el único proveedor de
 * identidad: login con OTP por SMS (choferes) o correo + contraseña, y
 * tokens JWT guardados por `tokenStore`.
 */
export interface Session {
  access_token: string;
  refresh_token: string;
  user: AuthSession['user'];
}

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  bootstrap: () => Promise<void>;
  signInWithPhone: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** Alias de `signInWithEmail` (compatibilidad). */
  signInG3: (email: string, password: string) => Promise<void>;
  registerCompanyG3: (input: RegisterCompanyInput) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  signInAsDemo: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

/** Sesión falsa para modo demo — basta para que la app considere al usuario autenticado. */
const demoSession = (): Session => ({
  access_token: 'demo-token',
  refresh_token: 'demo-refresh',
  user: {
    id: DEMO_USER_ID,
    email: demoProfile.email ?? 'demo@g3logistics.mx',
    role: 'driver',
    companyId: demoProfile.company_id ?? 'demo',
    tier: 'pro',
  },
});

/** Lee los claims del JWT (sin verificar: la verificación la hace el gateway). */
export function decodeJwtUser(token: string): AuthSession['user'] | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    const json = decodeURIComponent(
      Array.from(atob(b64), (ch) => `%${ch.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''),
    );
    const p = JSON.parse(json) as Record<string, unknown>;
    if (typeof p.sub !== 'string' || typeof p.companyId !== 'string') return null;
    if (typeof p.exp === 'number' && p.exp * 1000 < Date.now() - 7 * 24 * 3600_000) return null;
    return {
      id: p.sub,
      email: String(p.email ?? ''),
      role: (p.role as AuthSession['user']['role']) ?? 'driver',
      companyId: p.companyId,
      tier: (p.tier as AuthSession['user']['tier']) ?? 'free',
      ...(typeof p.driverId === 'string' ? { driverId: p.driverId } : {}),
    };
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => {
  /** Instala la sesión devuelta por el backend y carga perfil + plan. */
  const adopt = async (res: AuthSession, extra: Partial<Profile> = {}) => {
    const session: Session = {
      access_token: res.accessToken,
      refresh_token: res.refreshToken,
      user: res.user,
    };
    const profile = await getMyProfile(res.user).catch(() => null);
    set({ session, profile: profile ? { ...profile, ...extra } : null, loading: false });
    await useSubscriptionStore.getState().syncFromBackend().catch(() => undefined);
  };

  const run = async (fn: () => Promise<void>) => {
    set({ loading: true });
    try {
      await fn();
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  };

  return {
    session: null,
    profile: null,
    loading: false,
    initialized: false,

    bootstrap: async () => {
      if (isDemo) {
        set({ initialized: true });
        return;
      }
      set({ loading: true });
      const tokens = await tokenStore.load();
      const user = tokens ? decodeJwtUser(tokens.accessToken) : null;
      if (tokens && user) {
        const profile = await getMyProfile(user).catch(() => null);
        set({ session: { access_token: tokens.accessToken, refresh_token: tokens.refreshToken, user }, profile });
      } else if (tokens) {
        await tokenStore.clear();
      }
      set({ loading: false, initialized: true });
    },

    signInWithPhone: async (phone) => {
      if (isDemo) throw new Error('Modo demo: usa el botón "Entrar en modo demo".');
      await run(async () => {
        await authApi.requestOtp(phone);
        set({ loading: false });
      });
    },

    verifyOtp: async (phone, token) => {
      if (isDemo) throw new Error('Modo demo: usa el botón "Entrar en modo demo".');
      await run(async () => adopt(await authApi.verifyOtp(phone, token)));
    },

    signInWithEmail: async (email, password) => {
      if (isDemo) throw new Error('Modo demo: usa el botón "Entrar en modo demo".');
      await run(async () => adopt(await authApi.login({ email, password })));
    },

    signInG3: async (email, password) => get().signInWithEmail(email, password),

    registerCompanyG3: async (input) => {
      await run(async () =>
        adopt(await authApi.registerCompany(input), { full_name: input.ownerName, role: 'admin' }),
      );
    },

    requestPasswordReset: async (email) => {
      if (isDemo) throw new Error('Modo demo: en demo no enviamos correos.');
      await authApi.forgotPassword(email);
    },

    signInAsDemo: () => {
      set({ session: demoSession(), profile: { ...demoProfile } });
    },

    signOut: async () => {
      if (!isDemo) await tokenStore.clear();
      set({ session: null, profile: null });
    },

    refreshProfile: async () => {
      const session = get().session;
      if (!session) return;
      set({ profile: await getMyProfile(session.user) });
    },
  };
});
