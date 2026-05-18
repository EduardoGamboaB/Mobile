import { subscriptionsApi } from '@/api/g3/subscriptions';
import { tokenStore } from '@/api/g3/client';
import { fixtures } from '../helpers/fixtures';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';

describe('subscriptionsApi', () => {
  let teardown: () => void;
  beforeEach(() => {
    tokenStore.setInMemory({ accessToken: 'tok', refreshToken: 'rfr' });
  });
  afterEach(() => teardown?.());

  test('me devuelve la suscripción activa', async () => {
    const m = makeFetchMock().on('GET /api/subscriptions/me', {
      status: 200,
      body: fixtures.subscription('pro'),
    });
    teardown = installGlobalFetchMock(m);

    const sub = await subscriptionsApi.me();
    expect(sub.tier).toBe('pro');
    expect(sub.status).toBe('active');
  });

  test('catalog devuelve los tiers disponibles', async () => {
    const m = makeFetchMock().on('GET /api/subscriptions/catalog', {
      status: 200,
      body: fixtures.catalog(),
    });
    teardown = installGlobalFetchMock(m);

    const cat = await subscriptionsApi.catalog();
    expect(cat).toHaveLength(3);
    expect(cat[0].tier).toBe('free');
    expect(cat.find((t) => t.tier === 'pro')?.priceMxn).toBe(899);
  });

  test('createCheckout pasa tier + URLs y devuelve sessionId', async () => {
    const m = makeFetchMock().on('POST /api/subscriptions/checkout', {
      status: 200,
      body: { checkoutUrl: 'https://checkout.stripe.com/c/abc', sessionId: 'cs_abc' },
    });
    teardown = installGlobalFetchMock(m);

    const r = await subscriptionsApi.createCheckout({
      tier: 'pro',
      units: 3,
      successUrl: 'g3logistics://billing/success',
      cancelUrl: 'g3logistics://billing/cancel',
    });

    expect(r.checkoutUrl).toMatch(/checkout\.stripe\.com/);
    expect((m.calls[0].body as { tier: string }).tier).toBe('pro');
  });

  test('cancel marca cancelAtPeriodEnd=true', async () => {
    const m = makeFetchMock().on('POST /api/subscriptions/cancel', {
      status: 200,
      body: { ...fixtures.subscription('pro'), cancelAtPeriodEnd: true },
    });
    teardown = installGlobalFetchMock(m);

    const r = await subscriptionsApi.cancel();
    expect(r.cancelAtPeriodEnd).toBe(true);
  });
});
