/**
 * Verifica el switch `ai` — cuando hay G3_API_URL configurado y el usuario
 * tiene el tier adecuado, las llamadas IA salen al backend. Si el backend
 * está caído, queremos detectarlo limpio (no que el stub se cuele).
 */
import { ai } from '@/services/ai';
import { aiHttp } from '@/api/g3/ai';
import { stubAI } from '@/services/ai/stubProvider';
import { tokenStore } from '@/api/g3/client';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';

describe('E2E — switch live/demo del módulo IA', () => {
  let teardown: () => void;
  beforeEach(() => tokenStore.setInMemory({ accessToken: 'tok', refreshToken: 'rfr' }));
  afterEach(() => teardown?.());

  test('en live mode `ai` apunta al cliente HTTP, no al stub', () => {
    // El test runner configura EXPO_PUBLIC_G3_API_URL — el módulo lo lee en boot
    expect(ai).toBe(aiHttp);
    expect(ai).not.toBe(stubAI);
  });

  test('routing real: ai.classifyLogbookEvent llega al backend', async () => {
    const m = makeFetchMock().on('POST /api/ai/classify-logbook', {
      status: 200,
      body: {
        eventType: 'toll',
        confidence: 0.78,
        suggested: { locationText: 'Caseta Tepotzotlán', expenseAmount: 95 },
      },
    });
    teardown = installGlobalFetchMock(m);

    const r = await ai.classifyLogbookEvent({ text: 'Pago caseta 95 pesos' });

    expect(r.eventType).toBe('toll');
    expect(m.calls).toHaveLength(1);
    expect(m.calls[0].url).toBe('https://api.g3.test/api/ai/classify-logbook');
  });

  test('stub sigue funcionando en aislamiento (modo demo)', async () => {
    // El stub no hace HTTP — la llamada debe completar sin tocar fetch
    const r = await stubAI.classifyLogbookEvent({ text: 'Carga diesel 180 L' });
    expect(typeof r.confidence).toBe('number');
    expect(r.eventType).toBeTruthy();
  });
});
