import type {
  AIProvider,
  AssistantReplyInput,
  ClassifyEventInput,
  DriverInsightsInput,
  ExtractEvidenceInput,
  InspectionPhotoInput,
  RouteIncidentInput,
} from './types';
import type { EventBus } from './event.bus';

/**
 * Router de los 6 agentes IA. Envuelve cada llamada con fallback transparente
 * al stub si el provider primario falla — emite ai.<method>.{ok|fallback}.
 */
export class AIService {
  constructor(
    private readonly primary: AIProvider,
    private readonly fallback: AIProvider,
    private readonly bus: EventBus,
  ) {}

  classifyLogbookEvent(i: ClassifyEventInput) {
    return this.wrap('classifyLogbookEvent', () => this.primary.classifyLogbookEvent(i), () => this.fallback.classifyLogbookEvent(i));
  }
  extractEvidence(i: ExtractEvidenceInput) {
    return this.wrap('extractEvidence', () => this.primary.extractEvidence(i), () => this.fallback.extractEvidence(i));
  }
  routeIncident(i: RouteIncidentInput) {
    return this.wrap('routeIncident', () => this.primary.routeIncident(i), () => this.fallback.routeIncident(i));
  }
  assistantReply(i: AssistantReplyInput) {
    return this.wrap('assistantReply', () => this.primary.assistantReply(i), () => this.fallback.assistantReply(i));
  }
  analyzeInspectionPhoto(i: InspectionPhotoInput) {
    return this.wrap('analyzeInspectionPhoto', () => this.primary.analyzeInspectionPhoto(i), () => this.fallback.analyzeInspectionPhoto(i));
  }
  driverInsights(i: DriverInsightsInput) {
    return this.wrap('driverInsights', () => this.primary.driverInsights(i), () => this.fallback.driverInsights(i));
  }

  private async wrap<T>(method: string, primary: () => Promise<T>, fb: () => Promise<T>): Promise<T> {
    const t0 = Date.now();
    try {
      const r = await primary();
      await this.bus.publish({
        type: `ai.${method}.ok`,
        occurredAt: new Date().toISOString(),
        companyId: '*',
        data: { latencyMs: Date.now() - t0 },
      });
      return r;
    } catch (e) {
      const r = await fb();
      await this.bus.publish({
        type: `ai.${method}.fallback`,
        occurredAt: new Date().toISOString(),
        companyId: '*',
        data: { latencyMs: Date.now() - t0, error: String((e as Error).message) },
      });
      return r;
    }
  }
}
