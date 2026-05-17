import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tier, type TierValue, FEATURES_BY_TIER, type FeatureValue } from '@/constants/tiers';

const KEY = 'g3.subscription.tier.v1';

interface SubscriptionState {
  tier: TierValue;
  initialized: boolean;
  /** Carga el tier persistido (default free). */
  bootstrap: () => Promise<void>;
  /** Cambia el tier (en producción esto vendría del backend tras checkout). */
  setTier: (t: TierValue) => Promise<void>;
  /** Devuelve true si el tier actual incluye la feature. */
  has: (f: FeatureValue) => boolean;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  tier: Tier.Free,
  initialized: false,
  bootstrap: async () => {
    const v = (await AsyncStorage.getItem(KEY)) as TierValue | null;
    set({ tier: v && v in FEATURES_BY_TIER ? v : Tier.Free, initialized: true });
  },
  setTier: async (t) => {
    set({ tier: t });
    await AsyncStorage.setItem(KEY, t);
  },
  has: (f) => FEATURES_BY_TIER[get().tier].includes(f),
}));

/** Hook utilitario para chequear feature flags en componentes. */
export const useFeature = (f: FeatureValue): boolean =>
  useSubscriptionStore((s) => FEATURES_BY_TIER[s.tier].includes(f));

export const useTier = (): TierValue => useSubscriptionStore((s) => s.tier);
