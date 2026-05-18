import { BillingService } from '../src/billing.service';
import { InMemorySubscriptionRepo } from '../src/repos/in-memory.subscription.repo';
import { FakeStripeProvider } from '../src/billing/fake.stripe.provider';
import { RecordingEventBus } from '../src/event.bus';

function build() {
  const repo = new InMemorySubscriptionRepo();
  const stripe = new FakeStripeProvider();
  const bus = new RecordingEventBus();
  const service = new BillingService(repo, stripe, bus);
  return { service, repo, stripe, bus };
}

describe('BillingService.startTrial', () => {
  test('crea suscripción free para nueva compañía y publica subscription.started', async () => {
    const { service, repo, bus } = build();

    const sub = await service.startTrial('cmp_1');

    expect(sub.tier).toBe('free');
    expect(sub.status).toBe('active');
    expect(sub.priceMxn).toBe(0);
    expect(sub.units).toBe(1);
    expect(await repo.findByCompanyId('cmp_1')).toMatchObject({ tier: 'free' });
    expect(bus.events.find((e) => e.type === 'subscription.started')).toBeDefined();
  });

  test('startTrial es idempotente — no duplica si ya existe', async () => {
    const { service } = build();
    const a = await service.startTrial('cmp_1');
    const b = await service.startTrial('cmp_1');
    expect(b.id).toBe(a.id);
  });
});

describe('BillingService.getMine', () => {
  test('devuelve la suscripción activa del companyId', async () => {
    const { service } = build();
    await service.startTrial('cmp_X');

    const sub = await service.getMine('cmp_X');
    expect(sub.tier).toBe('free');
  });

  test('lanza si no hay suscripción (no debería pasar tras registro)', async () => {
    const { service } = build();
    await expect(service.getMine('cmp_inexistente')).rejects.toThrow(/no encontrada/i);
  });
});

describe('BillingService.catalog', () => {
  test('devuelve los 5 tiers con features y precios', async () => {
    const { service } = build();
    const cat = await service.catalog();
    expect(cat.map((e) => e.tier)).toEqual(['free', 'starter', 'pro', 'business', 'enterprise']);
    expect(cat.find((e) => e.tier === 'pro')?.priceMxn).toBe(899);
    expect(cat.find((e) => e.tier === 'free')?.features).toContain('logbook');
  });
});

describe('BillingService.createCheckout', () => {
  test('Free → upgrade a Pro: devuelve checkoutUrl de Stripe', async () => {
    const { service, stripe } = build();
    await service.startTrial('cmp_2');

    const r = await service.createCheckout('cmp_2', {
      tier: 'pro',
      units: 3,
      successUrl: 'app://billing/success',
      cancelUrl: 'app://billing/cancel',
    });

    expect(r.checkoutUrl).toMatch(/^https:\/\/checkout\./);
    expect(r.sessionId).toBeTruthy();
    expect(stripe.calls).toHaveLength(1);
    expect(stripe.calls[0].tier).toBe('pro');
  });

  test('upgrade a Enterprise no llega a Stripe — devuelve mensaje de cotización', async () => {
    const { service, stripe } = build();
    await service.startTrial('cmp_3');

    await expect(
      service.createCheckout('cmp_3', {
        tier: 'enterprise',
        units: 100,
        successUrl: 's',
        cancelUrl: 'c',
      }),
    ).rejects.toThrow(/cotizaci[oó]n/i);

    expect(stripe.calls).toHaveLength(0);
  });
});

describe('BillingService.applyTier (handler del webhook Stripe)', () => {
  test('actualiza tier y emite subscription.upgraded con fromTier/toTier', async () => {
    const { service, repo, bus } = build();
    await service.startTrial('cmp_4'); // free

    await service.applyTier('cmp_4', 'pro', {
      stripeSubscriptionId: 'sub_stripe_xxx',
      currentPeriodEnd: '2026-12-31T00:00:00Z',
    });

    const sub = await repo.findByCompanyId('cmp_4');
    expect(sub?.tier).toBe('pro');
    expect(sub?.stripeSubscriptionId).toBe('sub_stripe_xxx');

    const evt = bus.events.find((e) => e.type === 'subscription.upgraded');
    expect(evt?.data).toMatchObject({ fromTier: 'free', toTier: 'pro' });
  });

  test('downgrade emite subscription.downgraded', async () => {
    const { service, bus } = build();
    await service.startTrial('cmp_5');
    await service.applyTier('cmp_5', 'pro', { stripeSubscriptionId: 'x', currentPeriodEnd: null });

    bus.events.length = 0;
    await service.applyTier('cmp_5', 'starter', {
      stripeSubscriptionId: 'x',
      currentPeriodEnd: null,
    });

    expect(bus.events.find((e) => e.type === 'subscription.downgraded')).toBeDefined();
  });
});

describe('BillingService.cancel', () => {
  test('marca cancelAtPeriodEnd=true y emite evento', async () => {
    const { service, bus } = build();
    await service.startTrial('cmp_6');
    await service.applyTier('cmp_6', 'pro', { stripeSubscriptionId: 's', currentPeriodEnd: null });

    const sub = await service.cancel('cmp_6');
    expect(sub.cancelAtPeriodEnd).toBe(true);
    expect(bus.events.find((e) => e.type === 'subscription.cancel_scheduled')).toBeDefined();
  });
});
