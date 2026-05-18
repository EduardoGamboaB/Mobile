/**
 * Contratos de los 6 agentes G3 AI-First.
 *
 * Mismo modelo que el mobile (`services/ai/types.ts`) — debe permanecer
 * sincronizado. Cuando el paquete `@g3/contracts` esté publicado, los
 * 3 productos importarán de allí.
 */

import type { TierValue } from '../../shared/tiers';

export interface ClassifyEventInput {
  text?: string;
  photoUri?: string;
  coords?: { lat: number; lng: number };
}
export interface ClassifyEventResult {
  eventType: 'departure' | 'loading' | 'stop' | 'toll' | 'diesel' | 'incident' | 'arrival' | 'unloading' | 'closing';
  confidence: number;
  suggested: Partial<{
    locationText: string;
    odometerKm: number;
    expenseAmount: number;
    expenseConcept: string;
    comments: string;
  }>;
}

export interface ExtractEvidenceInput {
  photoUri: string;
  hintType?:
    | 'bill_of_lading' | 'scale_ticket' | 'loading_photo' | 'unloading_photo'
    | 'diesel_ticket' | 'toll_ticket' | 'delivery_proof' | 'other';
}
export interface ExtractEvidenceResult {
  detectedType: ExtractEvidenceInput['hintType'];
  fields: Partial<{
    folio: string; tons: number; liters: number; amount: number;
    plates: string; issuedAt: string; counterpartyName: string; rawText: string;
  }>;
  confidence: number;
}

export interface RouteIncidentInput {
  description: string;
  photoUri?: string;
  coords?: { lat: number; lng: number };
}
export interface RouteIncidentResult {
  type: 'mechanical' | 'checkpoint' | 'accident' | 'delay_loading' | 'delay_unloading' | 'client_issue' | 'theft_attempt' | 'other';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  routeTo: ('dispatcher' | 'admin' | 'mechanic' | 'security')[];
  recommendedActions: string[];
  confidence: number;
}

export type ChatRole = 'user' | 'assistant' | 'dispatcher';
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}
export interface AssistantReplyInput {
  history: ChatMessage[];
  tripContext?: { folio: string; status: string; destination: string };
}
export interface AssistantReplyResult {
  reply: string;
  shouldEscalate: boolean;
}

export interface InspectionPhotoInput {
  checkpointId: string;
  photoUri: string;
}
export interface InspectionPhotoResult {
  pass: boolean;
  findings: { severity: 'info' | 'warning' | 'critical'; note: string }[];
  confidence: number;
}

export interface DriverInsightsInput {
  driverId: string;
  rangeDays: number;
}
export interface DriverInsightsResult {
  insights: { kind: 'info' | 'warning' | 'praise'; text: string }[];
}

export interface AiContext {
  companyId: string;
  tier: TierValue;
}

export interface AIProvider {
  name(): string;
  classifyLogbookEvent(ctx: AiContext, input: ClassifyEventInput): Promise<ClassifyEventResult>;
  extractEvidence(ctx: AiContext, input: ExtractEvidenceInput): Promise<ExtractEvidenceResult>;
  routeIncident(ctx: AiContext, input: RouteIncidentInput): Promise<RouteIncidentResult>;
  assistantReply(ctx: AiContext, input: AssistantReplyInput): Promise<AssistantReplyResult>;
  analyzeInspectionPhoto(ctx: AiContext, input: InspectionPhotoInput): Promise<InspectionPhotoResult>;
  driverInsights(ctx: AiContext, input: DriverInsightsInput): Promise<DriverInsightsResult>;
}
