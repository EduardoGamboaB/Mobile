export interface ClassifyEventInput { text?: string; photoUri?: string; coords?: { lat: number; lng: number } }
export interface ClassifyEventResult {
  eventType: string;
  confidence: number;
  suggested: Record<string, unknown>;
}

export interface ExtractEvidenceInput { photoUri: string; hintType?: string }
export interface ExtractEvidenceResult {
  detectedType: string;
  fields: Record<string, unknown>;
  confidence: number;
}

export interface RouteIncidentInput { description: string; photoUri?: string }
export interface RouteIncidentResult {
  type: string;
  urgency: 'low' | 'medium' | 'high';
  routeTo: ('dispatcher' | 'admin' | 'mechanic' | 'security')[];
  recommendedActions: string[];
  confidence: number;
}

export interface ChatMessage { id: string; role: 'user' | 'assistant' | 'dispatcher'; content: string; createdAt: string }
export interface AssistantReplyInput {
  history: ChatMessage[];
  tripContext?: { folio: string; status: string; destination: string };
}
export interface AssistantReplyResult { reply: string; shouldEscalate: boolean }

export interface InspectionPhotoInput { checkpointId: string; photoUri: string }
export interface InspectionPhotoResult {
  pass: boolean;
  findings: { severity: 'info' | 'warning' | 'critical'; note: string }[];
  confidence: number;
}

export interface DriverInsightsInput { driverId: string; rangeDays: number }
export interface DriverInsightsResult {
  insights: { kind: 'info' | 'warning' | 'praise'; text: string }[];
}

export interface AIProvider {
  classifyLogbookEvent(i: ClassifyEventInput): Promise<ClassifyEventResult>;
  extractEvidence(i: ExtractEvidenceInput): Promise<ExtractEvidenceResult>;
  routeIncident(i: RouteIncidentInput): Promise<RouteIncidentResult>;
  assistantReply(i: AssistantReplyInput): Promise<AssistantReplyResult>;
  analyzeInspectionPhoto(i: InspectionPhotoInput): Promise<InspectionPhotoResult>;
  driverInsights(i: DriverInsightsInput): Promise<DriverInsightsResult>;
}
