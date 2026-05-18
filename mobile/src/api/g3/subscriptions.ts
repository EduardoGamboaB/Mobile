import type { TierValue } from '@/constants/tiers';
import { api } from './client';
import type { CheckoutResponseDTO, SubscriptionDTO, TierCatalogEntry } from './types';

export const subscriptionsApi = {
  me: () => api.get<SubscriptionDTO>('/subscriptions/me'),
  catalog: () => api.get<TierCatalogEntry[]>('/subscriptions/catalog'),
  createCheckout: (input: { tier: TierValue; units: number; successUrl: string; cancelUrl: string }) =>
    api.post<CheckoutResponseDTO>('/subscriptions/checkout', input),
  changePlan: (input: { tier: TierValue; units?: number }) =>
    api.post<SubscriptionDTO>('/subscriptions/change-plan', input),
  cancel: () => api.post<SubscriptionDTO>('/subscriptions/cancel'),
};
