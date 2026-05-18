import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StubAIProvider } from './providers/stub.provider';
import { VertexAIProvider } from './providers/vertex.provider';
import type {
  AIProvider, AiContext,
  ClassifyEventInput, ExtractEvidenceInput, RouteIncidentInput,
  AssistantReplyInput, InspectionPhotoInput, DriverInsightsInput,
} from './types';
import { EventsService } from '../events/events.service';

/**
 * Router de proveedores AI. Selecciona el provider activo en boot
 * (`AI_PROVIDER` env var) y delega cada llamada. Si el provider real
 * falla, hace fallback al stub para no romper la UX del chofer.
 *
 * Cada llamada se publica al bus de eventos para alimentar el data lake
 * con el contexto y la respuesta — datos clave para Fase 5 (scoring +
 * servicios financieros).
 */
@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private provider: AIProvider;

  constructor(
    private readonly cfg: ConfigService,
    private readonly stub: StubAIProvider,
    private readonly vertex: VertexAIProvider,
    private readonly events: EventsService,
  ) {
    const sel = this.cfg.get<string>('AI_PROVIDER', 'stub');
    this.provider = sel === 'vertex' ? this.vertex : this.stub;
    this.logger.log(`AI provider activo: ${this.provider.name()}`);
  }

  private async wrap<T>(method: string, fn: () => Promise<T>, ctx: AiContext): Promise<T> {
    try {
      const result = await fn();
      void this.events.publishDomainEvent(`ai.${method}.ok`, { companyId: ctx.companyId });
      return result;
    } catch (err) {
      this.logger.warn(`${method} falló, fallback a stub: ${(err as Error).message}`);
      void this.events.publishDomainEvent(`ai.${method}.fallback`, { companyId: ctx.companyId });
      // Fallback transparente
      return (this.stub as unknown as Record<string, (c: AiContext, i: unknown) => Promise<T>>)[method](ctx, undefined);
    }
  }

  classifyLogbookEvent(ctx: AiContext, i: ClassifyEventInput) {
    return this.wrap('classifyLogbookEvent', () => this.provider.classifyLogbookEvent(ctx, i), ctx);
  }
  extractEvidence(ctx: AiContext, i: ExtractEvidenceInput) {
    return this.wrap('extractEvidence', () => this.provider.extractEvidence(ctx, i), ctx);
  }
  routeIncident(ctx: AiContext, i: RouteIncidentInput) {
    return this.wrap('routeIncident', () => this.provider.routeIncident(ctx, i), ctx);
  }
  assistantReply(ctx: AiContext, i: AssistantReplyInput) {
    return this.wrap('assistantReply', () => this.provider.assistantReply(ctx, i), ctx);
  }
  analyzeInspectionPhoto(ctx: AiContext, i: InspectionPhotoInput) {
    return this.wrap('analyzeInspectionPhoto', () => this.provider.analyzeInspectionPhoto(ctx, i), ctx);
  }
  driverInsights(ctx: AiContext, i: DriverInsightsInput) {
    return this.wrap('driverInsights', () => this.provider.driverInsights(ctx, i), ctx);
  }
}
