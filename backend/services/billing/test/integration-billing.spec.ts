import { IntegrationsClient, StaticIntegrationResolver } from '@g3/integrations';
import { FakeStripeProvider } from '../src/billing/fake.stripe.provider';
import { IntegrationBillingProvider } from '../src/billing/integration.billing.provider';
import type { CheckoutInput } from '../src/billing/billing.provider';

const input: CheckoutInput = { companyId: 'cmp_a', tier: 'starter' as CheckoutInput['tier'], units: 3, successUrl: 'https://ok', cancelUrl: 'https://no' };
const stripe = {
  source: 'platform' as const,
  provider: 'stripe',
  settings: { publishableKey: 'pk_test_1' },
  secrets: { secretKey: 'sk_test_1', webhookSecret: 'whsec_1' },
};

describe('IntegrationBillingProvider', () => {
  test('sin configuración → FakeStripeProvider', async () => {
    const fake = new FakeStripeProvider();
    const p = new IntegrationBillingProvider(new StaticIntegrationResolver(), fake);
    expect((await p.createCheckout(input)).sessionId).toMatch(/^cs_test_/);
    expect(fake.calls).toHaveLength(1);
    expect(await p.stripeCredentials()).toBeNull();
  });

  test('lee Stripe de plataforma (companyId null) y usa el adaptador real', async () => {
    const resolver = new StaticIntegrationResolver({ '|payments|default': stripe });
    const seen: string[] = [];
    const p = new IntegrationBillingProvider(resolver, new FakeStripeProvider(), (c) => ({
      createCheckout: async () => {
        seen.push(c.secretKey);
        return { checkoutUrl: 'https://checkout.stripe.com/c/x', sessionId: 'cs_live_x' };
      },
    }));
    expect(await p.createCheckout(input)).toEqual({ checkoutUrl: 'https://checkout.stripe.com/c/x', sessionId: 'cs_live_x' });
    expect(seen).toEqual(['sk_test_1']);
    expect(resolver.calls[0]).toEqual({ companyId: null, category: 'payments', slot: 'default' });
    expect(await p.stripeCredentials()).toEqual({ source: 'platform', publishableKey: 'pk_test_1', secretKey: 'sk_test_1', webhookSecret: 'whsec_1' });
  });

  test('configurado sin adaptador real → 501 (no simula cobros con llaves reales)', async () => {
    const p = new IntegrationBillingProvider(new StaticIntegrationResolver({ '|payments|default': stripe }), new FakeStripeProvider());
    await expect(p.createCheckout(input)).rejects.toMatchObject({ status: 501 });
  });

  test('respaldo STRIPE_* del entorno sin servicio integrations', async () => {
    const client = new IntegrationsClient({ env: { STRIPE_SECRET_KEY: 'sk_test_env', STRIPE_WEBHOOK_SECRET: 'whsec_env' } });
    const p = new IntegrationBillingProvider(client, new FakeStripeProvider());
    expect(await p.stripeCredentials()).toMatchObject({ source: 'env', secretKey: 'sk_test_env', webhookSecret: 'whsec_env' });
  });
});
