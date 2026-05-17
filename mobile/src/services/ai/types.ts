/**
 * G3 AI-First — contratos de los agentes de IA que asisten al chofer.
 *
 * Cada agente tiene una interfaz estable y un stub local (`stubXxx`). En V2
 * el stub se reemplaza por una llamada al modelo (OpenAI/Anthropic + visión)
 * o por un Edge Function de Supabase. Las pantallas consumen siempre la
 * interfaz pública (`ai.classifyLogbookEvent`, `ai.extractEvidence`, etc.)
 * y nunca conocen el proveedor.
 *
 * Objetivos:
 *  - Reducir capturas manuales: el chofer toma una foto y la IA llena campos.
 *  - Triaje en tiempo real: sugerir urgencia/tipo de incidencia.
 *  - Asistente de chat para despacho.
 *  - Detección de daños en inspección pre-viaje.
 *  - Insights de rendimiento (rentabilidad, consumo).
 */

import type {
  LogbookEventValue,
  IncidentTypeValue,
  IncidentUrgencyValue,
  EvidenceTypeValue,
} from '@/constants/enums';

/** ---------------- Clasificador de eventos de bitácora ---------------- */
export interface ClassifyEventInput {
  /** Comentario libre del chofer; texto transcrito de nota de voz, etc. */
  text?: string;
  /** URI local de una foto tomada (ticket, ubicación, etc.). */
  photoUri?: string;
  /** Coordenadas para inferir contexto (caseta cercana, gasolinera...). */
  coords?: { lat: number; lng: number };
}
export interface ClassifyEventResult {
  eventType: LogbookEventValue;
  /** 0..1 — qué tan seguro está el modelo. */
  confidence: number;
  /** Sugerencias precapturadas que la UI puede prellenar. */
  suggested: Partial<{
    locationText: string;
    odometerKm: number;
    expenseAmount: number;
    expenseConcept: string;
    comments: string;
  }>;
}

/** ---------------- OCR de evidencias (carta porte, báscula, ticket) ---------------- */
export interface ExtractEvidenceInput {
  photoUri: string;
  hintType?: EvidenceTypeValue;
}
export interface ExtractEvidenceResult {
  detectedType: EvidenceTypeValue;
  /** Datos estructurados extraídos. Campos opcionales por tipo. */
  fields: Partial<{
    folio: string;
    tons: number;
    liters: number;
    amount: number;
    plates: string;
    issuedAt: string; // ISO
    counterpartyName: string;
    rawText: string;
  }>;
  confidence: number;
}

/** ---------------- Router de incidencias ---------------- */
export interface RouteIncidentInput {
  description: string;
  photoUri?: string;
  coords?: { lat: number; lng: number };
}
export interface RouteIncidentResult {
  type: IncidentTypeValue;
  urgency: IncidentUrgencyValue;
  /** Quién debe ser notificado primero. */
  routeTo: ('dispatcher' | 'admin' | 'mechanic' | 'security')[];
  /** Acciones sugeridas. */
  recommendedActions: string[];
  confidence: number;
}

/** ---------------- Asistente de chat para despacho ---------------- */
export type ChatRole = 'user' | 'assistant' | 'dispatcher';
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}
export interface AssistantReplyInput {
  history: ChatMessage[];
  /** Contexto del viaje activo si aplica. */
  tripContext?: {
    folio: string;
    status: string;
    destination: string;
  };
}
export interface AssistantReplyResult {
  reply: string;
  /** Bandera de escalación: si true, ofrecer hablar con humano. */
  shouldEscalate: boolean;
}

/** ---------------- Analizador de inspección pre-viaje ---------------- */
export interface InspectionPhotoInput {
  /** Punto del check-list al que pertenece la foto. */
  checkpointId: string;
  photoUri: string;
}
export interface InspectionPhotoResult {
  /** Pasa la inspección automáticamente. */
  pass: boolean;
  /** Daños o anomalías detectadas. */
  findings: { severity: 'info' | 'warning' | 'critical'; note: string }[];
  confidence: number;
}

/** ---------------- Insights de desempeño ---------------- */
export interface DriverInsightsInput {
  driverId: string;
  /** ventana de análisis en días */
  rangeDays: number;
}
export interface DriverInsightsResult {
  /** Mini textos accionables, ej: "Tu consumo subió 8% vs mes pasado". */
  insights: { kind: 'info' | 'warning' | 'praise'; text: string }[];
}

/** Contrato público del módulo AI. */
export interface AIService {
  classifyLogbookEvent(input: ClassifyEventInput): Promise<ClassifyEventResult>;
  extractEvidence(input: ExtractEvidenceInput): Promise<ExtractEvidenceResult>;
  routeIncident(input: RouteIncidentInput): Promise<RouteIncidentResult>;
  assistantReply(input: AssistantReplyInput): Promise<AssistantReplyResult>;
  analyzeInspectionPhoto(input: InspectionPhotoInput): Promise<InspectionPhotoResult>;
  driverInsights(input: DriverInsightsInput): Promise<DriverInsightsResult>;
}
