'use client';
import { create } from 'zustand';
import { Tier, FEATURES_BY_TIER, type TierValue, type FeatureValue } from './tiers';
import { authApi } from './api/modules';
import { subscriptionsApi } from './api/modules';
import { isLive, tokenStore } from './api';
import { G3ApiError, type AuthSession, type SubscriptionDTO } from './api/types';

const TIER_KEY = 'g3admin.tier.v1';
const NIGHT_KEY = 'g3admin.night.v1';
const AUTH_KEY = 'g3admin.auth.v1';
const EXPENSE_POLICY_KEY = 'g3admin.expensePolicy.v1';

/**
 * Regla de gastos de la compañía. Gobierna lo que el chofer puede capturar
 * en G3 Drive: gastos manuales sin foto de ticket solo si la regla lo
 * permite (y hasta el tope configurado).
 */
export interface ExpensePolicy {
  /** Permite gastos capturados a mano sin comprobante. */
  allowManualExpense: boolean;
  /** Tope por gasto manual sin comprobante; null = sin tope. */
  manualMaxAmount: number | null;
  /** Si true, todo gasto exige foto de ticket (anula lo anterior). */
  requireReceipt: boolean;
}

export const DEFAULT_EXPENSE_POLICY: ExpensePolicy = {
  allowManualExpense: true,
  manualMaxAmount: 300,
  requireReceipt: false,
};

type ExpensePolicyListener = (before: ExpensePolicy, after: ExpensePolicy) => void;
const expensePolicyListeners = new Set<ExpensePolicyListener>();
/** Suscripción a cambios de la regla de gastos (la bitácora de auditoría la usa). */
export function onExpensePolicyChanged(fn: ExpensePolicyListener): () => void {
  expensePolicyListeners.add(fn);
  return () => expensePolicyListeners.delete(fn);
}

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
  userRole: AuthSession['user']['role'] | null;
  signIn: () => void;
  /** Cierra el login (password, MFA o SSO) con la sesión emitida por el backend. */
  completeSignIn: (session: AuthSession) => Promise<void>;
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

  /* regla de gastos (aplica a G3 Drive) */
  expensePolicy: ExpensePolicy;
  setExpensePolicy: (p: Partial<ExpensePolicy>) => void;

  hydrate: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  authed: false,
  userEmail: null,
  userRole: null,
  signIn: () => {
    writeLS(AUTH_KEY, '1');
    set({ authed: true });
  },
  signOut: () => {
    writeLS(AUTH_KEY, null);
    tokenStore.clear();
    set({ authed: false, userEmail: null, userRole: null, subscription: null });
  },
  completeSignIn: async (session) => {
    writeLS(AUTH_KEY, '1');
    writeLS(TIER_KEY, session.user.tier);
    set({ authed: true, userEmail: session.user.email, userRole: session.user.role, tier: session.user.tier });
    await get().syncFromBackend();
  },
  signInG3: async (email, password) => {
    // Si la cuenta tiene MFA lanza MfaRequiredError: usar useSecurityStore.beginLogin.
    const res = await authApi.login({ email, password });
    await get().completeSignIn(res);
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

  expensePolicy: DEFAULT_EXPENSE_POLICY,
  setExpensePolicy: (p) => {
    const before = get().expensePolicy;
    const merged = { ...before, ...p };
    writeLS(EXPENSE_POLICY_KEY, JSON.stringify(merged));
    set({ expensePolicy: merged });
    expensePolicyListeners.forEach((fn) => fn(before, merged));
  },

  hydrate: () => {
    const t = readLS(TIER_KEY) as TierValue | null;
    const n = readLS(NIGHT_KEY);
    const a = readLS(AUTH_KEY);
    let policy = DEFAULT_EXPENSE_POLICY;
    try {
      const raw = readLS(EXPENSE_POLICY_KEY);
      if (raw) policy = { ...DEFAULT_EXPENSE_POLICY, ...JSON.parse(raw) };
    } catch {
      /* política corrupta en LS: usar default */
    }
    set({
      tier: t && t in FEATURES_BY_TIER ? t : Tier.Pro,
      night: n === '1',
      authed: a === '1',
      expensePolicy: policy,
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
