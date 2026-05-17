import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/api/supabase';
import { getMyProfile } from '@/api/profiles';
import type { Profile } from '@/models';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  bootstrap: () => Promise<void>;
  signInWithPhone: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: false,
  initialized: false,

  bootstrap: async () => {
    set({ loading: true });
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      try {
        const profile = await getMyProfile(data.session.user.id);
        set({ session: data.session, profile });
      } catch (e) {
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
    set({ loading: true });
    const { error } = await supabase.auth.signInWithOtp({ phone });
    set({ loading: false });
    if (error) throw error;
  },

  verifyOtp: async (phone, token) => {
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
    set({ loading: true });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ loading: false });
      throw error;
    }
    const profile = data.session ? await getMyProfile(data.session.user.id) : null;
    set({ session: data.session, profile, loading: false });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },

  refreshProfile: async () => {
    const session = get().session;
    if (!session) return;
    const profile = await getMyProfile(session.user.id);
    set({ profile });
  },
}));
