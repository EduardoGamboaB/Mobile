/**
 * Flujo end-to-end: usuario Free intenta usar feature gated → backend devuelve
 * 402 → cliente dispara onUpgradeRequired → simulamos checkout → backend
 * actualiza tier → /subscriptions/me devuelve nuevo tier → store sincroniza.
 */
import { tripsApi } from '@/api/g3/trips';
import { tractorsApi } from '@/api/g3/tractors';
import { subscriptionsApi } from '@/api/g3/subscriptions';
import { onUpgradeRequired, tokenStore } from '@/api/g3/client';
import { useSubscriptionStore } from '@/stores/subscription';
import { G3ApiError } from '@/api/g3/types';
import { fixtures } from '../helpers/fixtures';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';

describe('E2E — flujo de upgrade 402 → checkout → tier sincronizado', () => {
  let teardown: () => void;

  beforeEach(() => {
    tokenStore.setInMemory({ accessToken: 'tok-free', refreshToken: 'rfr-free' });
    useSubscriptionStore.setState({ tier: 'free', subscription: null });
  });
  afterEach(() => teardown?.());

  test('Free user → releasePayment 402 → checkout → backend sub actualiza → sync', async () => {
    const upgradeEvents: unknown[] = [];
    onUpgradeRequired((p) => upgradeEvents.push(p));

    const m = makeFetchMock()
      .on('POST /api/trips/trp_1/release-payment', {
        status: 402,
        body: fixtures.upgradeRequired('ai_ocr_evidence', 'starter'),
      })
      .on('POST /api/subscriptions/checkout', {
        status: 200,
        body: { checkoutUrl: 'https://checkout.stripe.com/c/123', sessionId: 'cs_123' },
      })
      .on('GET /api/subscriptions/me', {
        status: 200,
        body: fixtures.subscription('starter'),
      });
    teardown = installGlobalFetchMock(m);

    // 1) Intento gated falla con 402
    let caught: G3ApiError | undefined;
    try {
      await tripsApi.releasePayment('trp_1');
    } catch (e) {
      caught = e as G3ApiError;
    }
    expect(caught?.status).toBe(402);
    expect(caught?.body.suggestedUpgrade).toBe('starter');

    // 2) Handler fue disparado con el payload de upgrade
    expect(upgradeEvents).toHaveLength(1);
    expect((upgradeEvents[0] as { suggestedUpgrade: string }).suggestedUpgrade).toBe('starter');

    // 3) Usuario decide upgrade → cliente pide checkout
    const checkout = await subscriptionsApi.createCheckout({
      tier: 'starter',
      units: 1,
      successUrl: 'g3logistics://billing/success',
      cancelUrl: 'g3logistics://billing/cancel',
    });
    expect(checkout.checkoutUrl).toContain('checkout.stripe.com');

    // 4) Stripe procesa el pago → webhook actualiza la sub → app sincroniza
    await useSubscriptionStore.getState().syncFromBackend();

    expect(useSubscriptionStore.getState().tier).toBe('starter');
    expect(useSubscriptionStore.getState().subscription?.status).toBe('active');
  });

  test('Pro user → livePositions OK; downgrade a Free → 402 al siguiente intento', async () => {
    useSubscriptionStore.setState({ tier: 'pro', subscription: fixtures.subscription('pro') });

    const m = makeFetchMock()
      .on('GET /api/tractors/live/positions', {
        status: 200,
        body: [
          {
            tractorId: 'trc_1',
            unitNumber: 'T-001',
            lat: 19.4,
            lng: -99.1,
            speedKph: 80,
            headingDeg: 90,
            lastSeenAt: '2026-05-18T08:00:00Z',
          },
        ],
      })
      .on('POST /api/subscriptions/change-plan', {
        status: 200,
        body: fixtures.subscription('free'),
      })
      .on('GET /api/subscriptions/me', { status: 200, body: fixtures.subscription('free') })
      .on('GET /api/tractors/live/positions', {
        status: 402,
        body: fixtures.upgradeRequired('ai_assistant_chat', 'pro'),
      });
    teardown = installGlobalFetchMock(m);

    const live1 = await tractorsApi.livePositions();
    expect(live1[0].speedKph).toBe(80);

    await subscriptionsApi.changePlan({ tier: 'free' });
    await useSubscriptionStore.getState().syncFromBackend();
    expect(useSubscriptionStore.getState().tier).toBe('free');

    await expect(tractorsApi.livePositions()).rejects.toMatchObject({
      status: 402,
    });
  });
});
