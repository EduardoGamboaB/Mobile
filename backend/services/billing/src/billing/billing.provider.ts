import type { TierValue } from '@g3/contracts';

export interface CheckoutInput {
  companyId: string;
  tier: TierValue;
  units: number;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  checkoutUrl: string;
  sessionId: string;
}

export interface BillingProvider {
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
}
