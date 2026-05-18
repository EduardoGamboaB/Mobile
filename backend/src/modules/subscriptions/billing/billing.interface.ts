import { TierValue } from '../../../shared/tiers';

/**
 * Contrato del proveedor de billing. Hoy lo implementa Stripe; en V2
 * se puede agregar Conekta para México sin tocar el resto del código.
 */
export interface BillingProvider {
  /** Garantiza que la compañía exista como customer en el proveedor. */
  ensureCustomer(companyId: string, name: string, email: string): Promise<string>;

  /**
   * Crea una sesión de checkout para que el cliente complete el pago.
   * Devuelve URL a la que se redirige al usuario.
   */
  createCheckout(input: {
    customerId: string;
    tier: TierValue;
    units: number;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string; sessionId: string }>;

  /** Cancela al final del periodo actual. */
  cancelAtPeriodEnd(stripeSubscriptionId: string): Promise<void>;

  /** Cambio de plan (proration). */
  changePlan(input: {
    stripeSubscriptionId: string;
    newPriceId: string;
    units: number;
  }): Promise<void>;
}
