/**
 * Flujo end-to-end: registro de compañía → recibir token → cargar suscripción
 * → tier sincronizado → has(feature) refleja el plan recibido del backend.
 */
import { authApi } from '@/api/g3/auth';
import { tokenStore } from '@/api/g3/client';
import { useSubscriptionStore } from '@/stores/subscription';
import { Feature } from '@/constants/tiers';
import { fixtures } from '../helpers/fixtures';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';

describe('E2E — onboarding y tier sync', () => {
  let teardown: () => void;

  beforeEach(async () => {
    tokenStore.setInMemory(null);
    useSubscriptionStore.setState({ tier: 'free', subscription: null, initialized: false });
  });
  afterEach(() => teardown?.());

  test('registerCompany → tokens guardados → /subscriptions/me sincroniza tier free', async () => {
    const m = makeFetchMock()
      .on('POST /api/auth/register-company', { status: 201, body: fixtures.session('free') })
      .on('GET /api/subscriptions/me', { status: 200, body: fixtures.subscription('free') });
    teardown = installGlobalFetchMock(m);

    const session = await authApi.registerCompany({
      companyName: 'Transportes Acme',
      contactEmail: 'owner@acme.mx',
      ownerName: 'Pedro Pérez',
      password: 'super-secret-32-chars-min-aaaaaaaa',
    });

    expect(session.user.tier).toBe('free');
    expect((await tokenStore.load())?.accessToken).toBeTruthy();

    await useSubscriptionStore.getState().syncFromBackend();

    const state = useSubscriptionStore.getState();
    expect(state.tier).toBe('free');
    expect(state.subscription?.priceMxn).toBe(0);
    expect(state.has(Feature.BasicLogbook)).toBe(true);
    expect(state.has(Feature.AIOcrEvidence)).toBe(false); // free no incluye
    expect(state.has(Feature.AIAssistantChat)).toBe(false); // free no incluye Pro+
  });

  test('login con cuenta Pro → has() devuelve true para todas las features de Pro', async () => {
    const m = makeFetchMock()
      .on('POST /api/auth/login', { status: 200, body: fixtures.session('pro') })
      .on('GET /api/subscriptions/me', { status: 200, body: fixtures.subscription('pro') });
    teardown = installGlobalFetchMock(m);

    await authApi.login({ email: 'pro@acme.mx', password: 'x' });
    await useSubscriptionStore.getState().syncFromBackend();

    const s = useSubscriptionStore.getState();
    expect(s.tier).toBe('pro');
    expect(s.has(Feature.AIAssistantChat)).toBe(true);
    expect(s.has(Feature.AIInspectionAnalysis)).toBe(true);
    expect(s.has(Feature.DriverScoring)).toBe(true);
    expect(s.has(Feature.AIOcrEvidence)).toBe(true);
  });
});
