'use client';
import { create } from 'zustand';
import { Tier, FEATURES_BY_TIER, type TierValue, type FeatureValue } from './tiers';

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
  signIn: () => void;
  signOut: () => void;

  /* subscription tier */
  tier: TierValue;
  setTier: (t: TierValue) => void;
  has: (f: FeatureValue) => boolean;

  /* theme */
  night: boolean;
  setNight: (v: boolean) => void;

  hydrate: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  authed: false,
  signIn: () => {
    writeLS(AUTH_KEY, '1');
    set({ authed: true });
  },
  signOut: () => {
    writeLS(AUTH_KEY, null);
    set({ authed: false });
  },

  tier: Tier.Pro,
  setTier: (t) => {
    writeLS(TIER_KEY, t);
    set({ tier: t });
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
  },
}));

export const useFeature = (f: FeatureValue) =>
  useAppStore((s) => FEATURES_BY_TIER[s.tier].includes(f));
