import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tier, type TierValue, FEATURES_BY_TIER, type FeatureValue } from '@/constants/tiers';
import { isLive } from '@/api/g3/config';
import { subscriptionsApi } from '@/api/g3/subscriptions';
import { G3ApiError, type SubscriptionDTO } from '@/api/g3/types';

const KEY = 'g3.subscription.tier.v1';

interface SubscriptionState {
  tier: TierValue;
  subscription: SubscriptionDTO | null;
  initialized: boolean;
  /** Carga el tier persistido (default free). En live mode también lo sincroniza desde el backend. */
  bootstrap: () => Promise<void>;
  /** Cambia el tier localmente (en producción esto vendría del backend tras checkout). */
  setTier: (t: TierValue) => Promise<void>;
  /** Re-sincroniza desde el backend (después de un checkout, p.ej.). */
  syncFromBackend: () => Promise<void>;
  /** Devuelve true si el tier actual incluye la feature. */
  has: (f: FeatureValue) => boolean;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  tier: Tier.Free,
  subscription: null,
  initialized: false,

  bootstrap: async () => {
    const v = (await AsyncStorage.getItem(KEY)) as TierValue | null;
    set({ tier: v && v in FEATURES_BY_TIER ? v : Tier.Free });
    if (isLive) {
      try {
        await get().syncFromBackend();
      } catch {
        /* offline / no auth — el tier local sirve hasta que el usuario haga login */
      }
    }
    set({ initialized: true });
  },

  setTier: async (t) => {
    set({ tier: t });
    await AsyncStorage.setItem(KEY, t);
  },

  syncFromBackend: async () => {
    if (!isLive) return;
    try {
      const sub = await subscriptionsApi.me();
      set({ subscription: sub, tier: sub.tier });
      await AsyncStorage.setItem(KEY, sub.tier);
    } catch (e) {
      if (e instanceof G3ApiError && e.isUnauthorized) return;
      throw e;
    }
  },

  has: (f) => FEATURES_BY_TIER[get().tier].includes(f),
}));

/** Hook utilitario para chequear feature flags en componentes. */
export const useFeature = (f: FeatureValue): boolean =>
  useSubscriptionStore((s) => FEATURES_BY_TIER[s.tier].includes(f));

export const useTier = (): TierValue => useSubscriptionStore((s) => s.tier);
