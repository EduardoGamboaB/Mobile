import { aiHttp } from '@/api/g3/ai';
import { tokenStore } from '@/api/g3/client';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';
import { fixtures } from '../helpers/fixtures';

describe('aiHttp (cliente HTTP de los 6 agentes IA)', () => {
  let teardown: () => void;
  beforeEach(() => tokenStore.setInMemory({ accessToken: 'tok', refreshToken: 'rfr' }));
  afterEach(() => teardown?.());

  test('classifyLogbookEvent llama a /api/ai/classify-logbook', async () => {
    const m = makeFetchMock().on('POST /api/ai/classify-logbook', {
      status: 200,
      body: {
        eventType: 'fuel',
        confidence: 0.92,
        suggested: { expenseAmount: 3600, expenseConcept: 'Diesel 180 L' },
      },
    });
    teardown = installGlobalFetchMock(m);

    const r = await aiHttp.classifyLogbookEvent({ text: 'Carga diesel 180 L en Pemex' });
    expect(r.eventType).toBe('fuel');
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  test('extractEvidence llama a /api/ai/extract-evidence', async () => {
    const m = makeFetchMock().on('POST /api/ai/extract-evidence', {
      status: 200,
      body: {
        detectedType: 'weighbridge_ticket',
        fields: { folio: 'B-12345', tons: 28.4, plates: 'XXX-12-34' },
        confidence: 0.88,
      },
    });
    teardown = installGlobalFetchMock(m);

    const r = await aiHttp.extractEvidence({ photoUri: 'file://x.jpg' });
    expect(r.detectedType).toBe('weighbridge_ticket');
    expect(r.fields.tons).toBe(28.4);
  });

  test('assistantReply con tier Free → 402 (Pro+)', async () => {
    const m = makeFetchMock().on('POST /api/ai/assistant-reply', {
      status: 402,
      body: fixtures.upgradeRequired('ai_assistant_chat', 'pro'),
    });
    teardown = installGlobalFetchMock(m);

    await expect(
      aiHttp.assistantReply({
        history: [
          { id: '1', role: 'user', content: 'Hola', createdAt: new Date().toISOString() },
        ],
      }),
    ).rejects.toMatchObject({ status: 402, body: { suggestedUpgrade: 'pro' } });
  });

  test('analyzeInspectionPhoto detecta findings críticos', async () => {
    const m = makeFetchMock().on('POST /api/ai/analyze-inspection-photo', {
      status: 200,
      body: {
        pass: false,
        confidence: 0.91,
        findings: [
          { severity: 'critical', note: 'Llanta delantera izquierda con desgaste irregular' },
        ],
      },
    });
    teardown = installGlobalFetchMock(m);

    const r = await aiHttp.analyzeInspectionPhoto({
      checkpointId: 'tires_front',
      photoUri: 'file://t.jpg',
    });
    expect(r.pass).toBe(false);
    expect(r.findings[0].severity).toBe('critical');
  });

  test('routeIncident regresa urgencia y destinatarios', async () => {
    const m = makeFetchMock().on('POST /api/ai/route-incident', {
      status: 200,
      body: {
        type: 'mechanical',
        urgency: 'high',
        routeTo: ['dispatcher', 'mechanic'],
        recommendedActions: ['Detener marcha', 'Pedir grúa'],
        confidence: 0.83,
      },
    });
    teardown = installGlobalFetchMock(m);

    const r = await aiHttp.routeIncident({ description: 'Humo del motor' });
    expect(r.urgency).toBe('high');
    expect(r.routeTo).toContain('mechanic');
  });

  test('driverInsights devuelve insights accionables', async () => {
    const m = makeFetchMock().on('POST /api/ai/driver-insights', {
      status: 200,
      body: {
        insights: [
          { kind: 'warning', text: 'Tu consumo de diesel subió 8% vs mes pasado' },
          { kind: 'praise', text: '0 incidencias en los últimos 14 días' },
        ],
      },
    });
    teardown = installGlobalFetchMock(m);

    const r = await aiHttp.driverInsights({ driverId: 'drv_test_1', rangeDays: 30 });
    expect(r.insights).toHaveLength(2);
  });
});
