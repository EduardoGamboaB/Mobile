'use client';
import { create } from 'zustand';
import { Tier, FEATURES_BY_TIER, type TierValue, type FeatureValue } from './tiers';
import { authApi } from './api/modules';
import { subscriptionsApi } from './api/modules';
import { isLive, tokenStore } from './api';
import { G3ApiError, type SubscriptionDTO } from './api/types';

const TIER_KEY = 'g3admin.tier.v1';
const NIGHT_KEY = 'g3admin.night.v1';
const AUTH_KEY = 'g3admin.auth.v1';

function readLS(k: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(k);
}
function writeLS(k: string, v: string | null) {
  if (typeof window === 'undefined') return;
  if (v == null) window.localStorage.removeItem(k);
  else window.localStorage.setItem(k, v);
}

interface AppState {
  /* auth */
  authed: boolean;
  userEmail: string | null;
  signIn: () => void;
  signOut: () => void;
  signInG3: (email: string, password: string) => Promise<void>;

  /* subscription tier */
  tier: TierValue;
  subscription: SubscriptionDTO | null;
  setTier: (t: TierValue) => void;
  syncFromBackend: () => Promise<void>;
  has: (f: FeatureValue) => boolean;

  /* theme */
  night: boolean;
  setNight: (v: boolean) => void;

  hydrate: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  authed: false,
  userEmail: null,
  signIn: () => {
    writeLS(AUTH_KEY, '1');
    set({ authed: true });
  },
  signOut: () => {
    writeLS(AUTH_KEY, null);
    tokenStore.clear();
    set({ authed: false, userEmail: null, subscription: null });
  },
  signInG3: async (email, password) => {
    const res = await authApi.login({ email, password });
    writeLS(AUTH_KEY, '1');
    writeLS(TIER_KEY, res.user.tier);
    set({ authed: true, userEmail: res.user.email, tier: res.user.tier });
    await get().syncFromBackend();
  },

  tier: Tier.Pro,
  subscription: null,
  setTier: (t) => {
    writeLS(TIER_KEY, t);
    set({ tier: t });
  },
  syncFromBackend: async () => {
    if (!isLive) return;
    try {
      const sub = await subscriptionsApi.me();
      set({ subscription: sub, tier: sub.tier });
      writeLS(TIER_KEY, sub.tier);
    } catch (e) {
      if (e instanceof G3ApiError && e.isUnauthorized) return;
      throw e;
    }
  },
  has: (f) => FEATURES_BY_TIER[get().tier].includes(f),

  night: false,
  setNight: (v) => {
    writeLS(NIGHT_KEY, v ? '1' : '0');
    set({ night: v });
  },

  hydrate: () => {
    const t = readLS(TIER_KEY) as TierValue | null;
    const n = readLS(NIGHT_KEY);
    const a = readLS(AUTH_KEY);
    set({
      tier: t && t in FEATURES_BY_TIER ? t : Tier.Pro,
      night: n === '1',
      authed: a === '1',
    });
    if (isLive && a === '1') {
      // best-effort: si hay tokens, refrescamos la sub
      get()
        .syncFromBackend()
        .catch(() => undefined);
    }
  },
}));

export const useFeature = (f: FeatureValue) =>
  useAppStore((s) => FEATURES_BY_TIER[s.tier].includes(f));
