import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AIProvider, AiContext,
  ClassifyEventInput, ClassifyEventResult,
  ExtractEvidenceInput, ExtractEvidenceResult,
  RouteIncidentInput, RouteIncidentResult,
  AssistantReplyInput, AssistantReplyResult,
  InspectionPhotoInput, InspectionPhotoResult,
  DriverInsightsInput, DriverInsightsResult,
} from '../types';

/**
 * Provider Vertex AI / Gemini.
 *
 * Esta clase es el **adapter** — la integración real con `@google-cloud/vertexai`
 * se conecta cuando habilitemos la API y agreguemos la dependencia. Mientras
 * tanto, lanza una excepción explícita que apunta al setup correcto.
 *
 * Setup para activar:
 *   1. Habilitar Vertex AI API en el proyecto GCP
 *   2. Otorgar al service account `g3-backend@` el rol `roles/aiplatform.user`
 *   3. `npm install @google-cloud/vertexai`
 *   4. Reemplazar los `throw` con llamadas reales (los prompts ya están
 *      definidos como constantes abajo para no perderlos)
 */
@Injectable()
export class VertexAIProvider implements AIProvider {
  private readonly logger = new Logger(VertexAIProvider.name);
  constructor(private readonly cfg: ConfigService) {}

  name(): string { return 'vertex'; }

  /** Prompts cuidadosamente diseñados — mantener fuera del código de negocio. */
  private readonly PROMPTS = {
    classifyLogbook: `Eres el clasificador de bitácora G3 Drive. Dado el texto del chofer y opcionalmente una foto de ticket/lugar, devuelve JSON con eventType (uno de: departure/loading/stop/toll/diesel/incident/arrival/unloading/closing), confidence 0..1, y campos sugeridos (locationText, odometerKm, expenseAmount, expenseConcept, comments). Sólo JSON, sin prosa.`,
    extractEvidence: `Eres un OCR experto en documentos de transporte mexicano (carta porte CFDI 4.0, ticket de báscula, diesel, caseta). Extrae folio, toneladas, litros, monto, placas, fecha, nombre de contraparte. Devuelve JSON con detectedType y fields. Sólo JSON.`,
    routeIncident: `Eres el router de incidencias de transporte. Clasifica la descripción y devuelve JSON con type, urgency (low/medium/high/critical), routeTo (array de dispatcher/admin/mechanic/security) y recommendedActions (array de acciones cortas en imperativo). Sólo JSON.`,
    assistantReply: `Eres el asistente IA del despachador G3. Lee el contexto del viaje y los últimos mensajes. Responde con tono operativo, conciso, en máximo 2 frases. Marca shouldEscalate=true si involucra dinero o seguridad humana.`,
    inspectionPhoto: `Eres el auditor visual G3 conforme a NOM-068-SCT-2-2014. Analiza la foto del checkpoint indicado y reporta findings con severity (info/warning/critical) y note (1 frase). Devuelve también pass=false si hay finding critical.`,
    driverInsights: `Eres el analista de desempeño del chofer. Mira sus métricas (puntualidad, km/L, incidentes, score histórico). Devuelve hasta 3 insights accionables con kind (info/warning/praise) y text corto.`,
  };

  private unimplemented(method: string): never {
    this.logger.warn(`${method} → Vertex AI no inicializado; el provider stub lo está manejando`);
    throw new Error(
      `Vertex provider activado pero no implementado. ` +
      `Habilita Vertex AI API + npm install @google-cloud/vertexai y reemplaza los throw en ${method}.`,
    );
  }

  classifyLogbookEvent(_c: AiContext, _i: ClassifyEventInput): Promise<ClassifyEventResult> {
    this.unimplemented('classifyLogbookEvent');
  }
  extractEvidence(_c: AiContext, _i: ExtractEvidenceInput): Promise<ExtractEvidenceResult> {
    this.unimplemented('extractEvidence');
  }
  routeIncident(_c: AiContext, _i: RouteIncidentInput): Promise<RouteIncidentResult> {
    this.unimplemented('routeIncident');
  }
  assistantReply(_c: AiContext, _i: AssistantReplyInput): Promise<AssistantReplyResult> {
    this.unimplemented('assistantReply');
  }
  analyzeInspectionPhoto(_c: AiContext, _i: InspectionPhotoInput): Promise<InspectionPhotoResult> {
    this.unimplemented('analyzeInspectionPhoto');
  }
  driverInsights(_c: AiContext, _i: DriverInsightsInput): Promise<DriverInsightsResult> {
    this.unimplemented('driverInsights');
  }
}
