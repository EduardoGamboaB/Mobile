import { NotImplementedException } from '@nestjs/common';
import type { IntegrationSource } from '@g3/contracts';
import type { IntegrationResolver } from '@g3/integrations';
import type { BillingProvider, CheckoutInput, CheckoutResult } from './billing.provider';

export interface StripeCredentials {
  source: Exclude<IntegrationSource, 'none'>;
  publishableKey: string | null;
  secretKey: string;
  webhookSecret: string | null;
}

/**
 * Cobro con Stripe leyendo las credenciales del servicio integrations
 * (alcance plataforma) con respaldo a STRIPE_* del entorno (lo hace el
 * IntegrationsClient).
 *
 * - Sin configuración → `fallback` (FakeStripeProvider: dev/tests).
 * - Con configuración → `realFactory(creds)`. Mientras no exista el
 *   adaptador real de Stripe Checkout responde 501 en lugar de simular
 *   un cobro con llaves reales cargadas.
 */
export class IntegrationBillingProvider implements BillingProvider {
  constructor(
    private readonly resolver: IntegrationResolver,
    private readonly fallback: BillingProvider,
    private readonly realFactory?: (creds: StripeCredentials) => BillingProvider,
  ) {}

  /** Credenciales efectivas (`null` si no hay). También sirve al webhook (webhookSecret). */
  async stripeCredentials(): Promise<StripeCredentials | null> {
    const r = await this.resolver.resolve(null, 'payments');
    if (r.source === 'none' || r.provider !== 'stripe' || !r.secrets.secretKey) return null;
    return {
      source: r.source,
      publishableKey: typeof r.settings.publishableKey === 'string' ? r.settings.publishableKey : null,
      secretKey: r.secrets.secretKey,
      webhookSecret: r.secrets.webhookSecret ?? null,
    };
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const creds = await this.stripeCredentials();
    if (!creds) return this.fallback.createCheckout(input);
    if (!this.realFactory) {
      throw new NotImplementedException(
        `Stripe está configurado (fuente: ${creds.source}) pero el adaptador real de Checkout aún no está implementado`,
      );
    }
    return this.realFactory(creds).createCheckout(input);
  }
}
