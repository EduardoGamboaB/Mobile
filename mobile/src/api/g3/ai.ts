import { api } from './client';
import type {
  AIService,
  AssistantReplyInput,
  AssistantReplyResult,
  ClassifyEventInput,
  ClassifyEventResult,
  DriverInsightsInput,
  DriverInsightsResult,
  ExtractEvidenceInput,
  ExtractEvidenceResult,
  InspectionPhotoInput,
  InspectionPhotoResult,
  RouteIncidentInput,
  RouteIncidentResult,
} from '@/services/ai/types';

/**
 * Implementación HTTP del contrato AIService.
 * Cada método mapea 1:1 a un endpoint del backend.
 * El backend ya hace fallback al stub si Vertex falla, así que aquí
 * no necesitamos manejar errores de modelo — sólo errores de red/tier.
 */
export const aiHttp: AIService = {
  classifyLogbookEvent: (input: ClassifyEventInput) =>
    api.post<ClassifyEventResult>('/ai/classify-logbook', input),

  extractEvidence: (input: ExtractEvidenceInput) =>
    api.post<ExtractEvidenceResult>('/ai/extract-evidence', input),

  routeIncident: (input: RouteIncidentInput) =>
    api.post<RouteIncidentResult>('/ai/route-incident', input),

  assistantReply: (input: AssistantReplyInput) =>
    api.post<AssistantReplyResult>('/ai/assistant-reply', input),

  analyzeInspectionPhoto: (input: InspectionPhotoInput) =>
    api.post<InspectionPhotoResult>('/ai/analyze-inspection-photo', input),

  driverInsights: (input: DriverInsightsInput) =>
    api.post<DriverInsightsResult>('/ai/driver-insights', input),
};
