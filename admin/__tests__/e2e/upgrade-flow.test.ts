/**
 * E2E del flujo de upgrade desde el admin:
 * Free intenta acceder a FleetMap → 402 → handler dispara modal →
 * usuario decide upgrade → checkout → backend confirma → tier sincronizado.
 */
import { useAppStore } from '../../lib/store';
import { tractorsApi, subscriptionsApi } from '../../lib/api/modules';
import { tokenStore, onUpgradeRequired } from '../../lib/api/client';
import { Feature } from '../../lib/tiers';
import { fixtures } from '../helpers/fixtures';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';

describe('E2E — upgrade gating end-to-end', () => {
  let teardown: () => void;

  beforeEach(() => {
    tokenStore.setInMemory({ accessToken: 'tok-free', refreshToken: 'rfr' });
    window.localStorage.clear();
    useAppStore.setState({
      authed: true,
      tier: 'free',
      subscription: fixtures.subscription('free'),
      userEmail: 'free@acme.mx',
    });
  });
  afterEach(() => teardown?.());

  test('Free → tractorsApi.livePositions 402 → checkout → /me → tier=pro', async () => {
    const captured: unknown[] = [];
    onUpgradeRequired((p) => captured.push(p));

    const m = makeFetchMock()
      .on('GET /api/tractors/live/positions', {
        status: 402,
        body: fixtures.upgradeRequired('fleet_map', 'pro'),
      })
      .on('POST /api/subscriptions/checkout', {
        status: 200,
        body: { checkoutUrl: 'https://checkout.stripe.com/c/admin-x', sessionId: 'cs_admin_x' },
      })
      .on('GET /api/subscriptions/me', { status: 200, body: fixtures.subscription('pro') });
    teardown = installGlobalFetchMock(m);

    // 1) Estado inicial: free, has(FleetMap)=false
    expect(useAppStore.getState().has(Feature.FleetMap)).toBe(false);

    // 2) Intentar abrir el monitor → 402
    await expect(tractorsApi.livePositions()).rejects.toMatchObject({ status: 402 });
    expect(captured).toHaveLength(1);

    // 3) Checkout
    const checkout = await subscriptionsApi.createCheckout({
      tier: 'pro',
      units: 3,
      successUrl: 'http://admin.g3.test/billing/success',
      cancelUrl: 'http://admin.g3.test/billing/cancel',
    });
    expect(checkout.sessionId).toBe('cs_admin_x');

    // 4) Webhook procesado → re-sync
    await useAppStore.getState().syncFromBackend();

    expect(useAppStore.getState().tier).toBe('pro');
    expect(useAppStore.getState().has(Feature.FleetMap)).toBe(true);
    expect(useAppStore.getState().has(Feature.AIInsights)).toBe(true);
    expect(useAppStore.getState().has(Feature.AdvancedAnalytics)).toBe(false); // sigue siendo Business+
  });

  test('multi-tenant: dos sesiones consecutivas con companyId distinto', async () => {
    const m = makeFetchMock()
      // primera sesión: compañía A
      .on('POST /api/auth/login', {
        status: 200,
        body: {
          ...fixtures.session('pro'),
          user: {
            ...fixtures.session('pro').user,
            companyId: 'cmp_A',
            email: 'a@acme.mx',
          },
        },
      })
      .on('GET /api/subscriptions/me', { status: 200, body: fixtures.subscription('pro') })
      // segunda sesión: compañía B en starter
      .on('POST /api/auth/login', {
        status: 200,
        body: {
          ...fixtures.session('starter'),
          user: {
            ...fixtures.session('starter').user,
            companyId: 'cmp_B',
            email: 'b@beta.mx',
          },
        },
      })
      .on('GET /api/subscriptions/me', { status: 200, body: fixtures.subscription('starter') });
    teardown = installGlobalFetchMock(m);

    await useAppStore.getState().signInG3('a@acme.mx', 'x');
    expect(useAppStore.getState().tier).toBe('pro');
    expect(useAppStore.getState().userEmail).toBe('a@acme.mx');

    useAppStore.getState().signOut();
    expect(useAppStore.getState().authed).toBe(false);
    expect(tokenStore.load()).toBeNull();

    await useAppStore.getState().signInG3('b@beta.mx', 'x');
    expect(useAppStore.getState().tier).toBe('starter');
    expect(useAppStore.getState().userEmail).toBe('b@beta.mx');
    expect(useAppStore.getState().has(Feature.FleetMap)).toBe(false); // starter no incluye
    expect(useAppStore.getState().has(Feature.PaymentAuthorization)).toBe(true);
  });
});
