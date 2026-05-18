import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/api/supabase';
import { getMyProfile } from '@/api/profiles';
import { isDemo, DEMO_USER_ID, demoProfile } from '@/demo';
import type { Profile } from '@/models';
import { isLive } from '@/api/g3/config';
import { authApi, type RegisterCompanyInput } from '@/api/g3/auth';
import { tokenStore } from '@/api/g3/client';
import { useSubscriptionStore } from '@/stores/subscription';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  bootstrap: () => Promise<void>;
  signInWithPhone: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInG3: (email: string, password: string) => Promise<void>;
  registerCompanyG3: (input: RegisterCompanyInput) => Promise<void>;
  signInAsDemo: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

/** Sesión falsa para modo demo — basta para que la app considere al usuario autenticado. */
const demoSession = (): Session =>
  ({
    access_token: 'demo-token',
    refresh_token: 'demo-refresh',
    expires_in: 3_600,
    token_type: 'bearer',
    user: {
      id: DEMO_USER_ID,
      aud: 'demo',
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  }) as unknown as Session;

export const useAuthStore = create<AuthState>((set, get) => ({
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
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      try {
        const profile = await getMyProfile(data.session.user.id);
        set({ session: data.session, profile });
      } catch {
        set({ session: data.session, profile: null });
      }
    }
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const profile = await getMyProfile(session.user.id).catch(() => null);
        set({ session, profile });
      } else {
        set({ session: null, profile: null });
      }
    });
    set({ loading: false, initialized: true });
  },

  signInWithPhone: async (phone) => {
    if (isDemo) throw new Error('Modo demo: usa el botón "Entrar en modo demo".');
    set({ loading: true });
    const { error } = await supabase.auth.signInWithOtp({ phone });
    set({ loading: false });
    if (error) throw error;
  },

  verifyOtp: async (phone, token) => {
    if (isDemo) throw new Error('Modo demo: usa el botón "Entrar en modo demo".');
    set({ loading: true });
    const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    if (error) {
      set({ loading: false });
      throw error;
    }
    const profile = data.session ? await getMyProfile(data.session.user.id) : null;
    set({ session: data.session, profile, loading: false });
  },

  signInWithEmail: async (email, password) => {
    if (isDemo) throw new Error('Modo demo: usa el botón "Entrar en modo demo".');
    set({ loading: true });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ loading: false });
      throw error;
    }
    const profile = data.session ? await getMyProfile(data.session.user.id) : null;
    set({ session: data.session, profile, loading: false });
  },

  signInG3: async (email, password) => {
    set({ loading: true });
    try {
      const res = await authApi.login({ email, password });
      const g3Session = {
        access_token: res.accessToken,
        refresh_token: res.refreshToken,
        expires_in: 3_600,
        token_type: 'bearer',
        user: {
          id: res.user.id,
          aud: 'g3',
          email: res.user.email,
          app_metadata: { role: res.user.role, companyId: res.user.companyId },
          user_metadata: {},
          created_at: new Date().toISOString(),
        },
      } as unknown as Session;
      set({
        session: g3Session,
        profile: {
          ...demoProfile,
          id: res.user.id,
          email: res.user.email,
          role: res.user.role === 'driver' ? 'driver' : 'admin',
        } as Profile,
        loading: false,
      });
      await useSubscriptionStore.getState().syncFromBackend();
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  registerCompanyG3: async (input) => {
    set({ loading: true });
    try {
      const res = await authApi.registerCompany(input);
      const g3Session = {
        access_token: res.accessToken,
        refresh_token: res.refreshToken,
        expires_in: 3_600,
        token_type: 'bearer',
        user: {
          id: res.user.id,
          aud: 'g3',
          email: res.user.email,
          app_metadata: { role: res.user.role, companyId: res.user.companyId },
          user_metadata: {},
          created_at: new Date().toISOString(),
        },
      } as unknown as Session;
      set({
        session: g3Session,
        profile: {
          ...demoProfile,
          id: res.user.id,
          email: res.user.email,
          full_name: input.ownerName,
          role: 'admin',
        } as Profile,
        loading: false,
      });
      await useSubscriptionStore.getState().syncFromBackend();
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  signInAsDemo: () => {
    set({ session: demoSession(), profile: { ...demoProfile } });
  },

  signOut: async () => {
    if (isLive) await tokenStore.clear();
    if (isDemo) {
      set({ session: null, profile: null });
      return;
    }
    await supabase.auth.signOut().catch(() => undefined);
    set({ session: null, profile: null });
  },

  refreshProfile: async () => {
    const session = get().session;
    if (!session) return;
    const profile = await getMyProfile(session.user.id);
    set({ profile });
  },
}));
