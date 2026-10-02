/**
 * Eventos de dominio publicados a Pub/Sub.
 * Cualquier servicio que suscribe a `g3-domain-events` debe ser capaz de
 * deserializar estos shapes. Versionar con cuidado.
 */
import type { TierValue } from '../tiers';

export const DomainTopic = {
  Events: 'g3-domain-events',
  Alerts: 'g3-alerts',
} as const;

export interface DomainEnvelope<T> {
  type: string;
  version: 1;
  occurredAt: string;
  companyId: string;
  data: T;
}

export interface SubscriptionStartedEvent {
  subscriptionId: string;
  companyId: string;
  tier: TierValue;
}
export interface SubscriptionUpgradedEvent {
  subscriptionId: string;
  companyId: string;
  fromTier: TierValue;
  toTier: TierValue;
}
export interface TripCreatedEvent {
  tripId: string;
  folio: string;
  companyId: string;
}
export interface TripStatusChangedEvent {
  tripId: string;
  fromStatus: string;
  toStatus: string;
}
export interface TripPaymentReleasedEvent {
  tripId: string;
  amount: number | null;
}
export interface AIInvocationEvent {
  method: string;
  fallback: boolean;
  latencyMs: number;
}
export * from './telemetry';
