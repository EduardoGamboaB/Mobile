import { v4 as uuid } from 'uuid';
import type { BillingProvider, CheckoutInput, CheckoutResult } from './billing.provider';

/**
 * Implementación fake usada en tests y modo dev. Imita las URLs de Stripe
 * pero no hace red. Mantiene `calls` para assertions.
 */
export class FakeStripeProvider implements BillingProvider {
  calls: CheckoutInput[] = [];

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    this.calls.push(input);
    const sessionId = `cs_test_${uuid().replace(/-/g, '').slice(0, 16)}`;
    return {
      checkoutUrl: `https://checkout.stripe.test/c/${sessionId}`,
      sessionId,
    };
  }
}
