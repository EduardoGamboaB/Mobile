import { AIService } from '../src/ai.service';
import { StubAIProvider } from '../src/providers/stub.provider';
import { RecordingEventBus } from '../src/event.bus';

class FlakyProvider extends StubAIProvider {
  fail = true;
  async classifyLogbookEvent(input: { text?: string }) {
    if (this.fail) throw new Error('Vertex unavailable');
    return super.classifyLogbookEvent(input);
  }
}

function build(provider = new StubAIProvider()) {
  const bus = new RecordingEventBus();
  const svc = new AIService(provider, new StubAIProvider(), bus);
  return { svc, bus, provider };
}

describe('AIService.classifyLogbookEvent', () => {
  test('happy path: usa el provider primario y emite ai.ok', async () => {
    const { svc, bus } = build();
    const r = await svc.classifyLogbookEvent({ text: 'Carga diesel 180 L' });
    expect(r.eventType).toBeTruthy();
    expect(r.confidence).toBeGreaterThan(0);
    expect(bus.events.find((e) => e.type === 'ai.classifyLogbookEvent.ok')).toBeDefined();
  });

  test('cuando primary tira, hace fallback transparente al stub y emite .fallback', async () => {
    const flaky = new FlakyProvider();
    const { svc, bus } = build(flaky);
    const r = await svc.classifyLogbookEvent({ text: 'caseta 95' });
    expect(r.eventType).toBeTruthy(); // viene del fallback
    expect(bus.events.find((e) => e.type === 'ai.classifyLogbookEvent.fallback')).toBeDefined();
  });
});

describe('AIService.extractEvidence', () => {
  test('detecta tipo de evidencia', async () => {
    const { svc } = build();
    const r = await svc.extractEvidence({ photoUri: 'file://x.jpg' });
    expect(r.detectedType).toBeTruthy();
    expect(typeof r.confidence).toBe('number');
  });
});

describe('AIService.routeIncident', () => {
  test('clasifica urgencia y destinatarios', async () => {
    const { svc } = build();
    const r = await svc.routeIncident({ description: 'humo del motor' });
    expect(r.urgency).toBeTruthy();
    expect(r.routeTo.length).toBeGreaterThan(0);
  });
});

describe('AIService.assistantReply', () => {
  test('devuelve reply y bandera de escalación', async () => {
    const { svc } = build();
    const r = await svc.assistantReply({
      history: [{ id: '1', role: 'user', content: '¿En qué te ayudo?', createdAt: 'now' }],
    });
    expect(typeof r.reply).toBe('string');
    expect(typeof r.shouldEscalate).toBe('boolean');
  });
});

describe('AIService.analyzeInspectionPhoto', () => {
  test('devuelve pass + findings', async () => {
    const { svc } = build();
    const r = await svc.analyzeInspectionPhoto({ checkpointId: 'tires_front', photoUri: 'f' });
    expect(typeof r.pass).toBe('boolean');
    expect(Array.isArray(r.findings)).toBe(true);
  });
});

describe('AIService.driverInsights', () => {
  test('devuelve insights con kind', async () => {
    const { svc } = build();
    const r = await svc.driverInsights({ driverId: 'd1', rangeDays: 30 });
    expect(Array.isArray(r.insights)).toBe(true);
    expect(r.insights[0]).toHaveProperty('kind');
  });
});
