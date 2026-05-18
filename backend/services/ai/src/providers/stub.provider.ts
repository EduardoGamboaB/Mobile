import type {
  AIProvider,
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
} from '../types';

/**
 * Stub determinista — sirve para dev/test y como fallback cuando Vertex falla.
 * Implementa heurísticas básicas sobre texto/contexto.
 */
export class StubAIProvider implements AIProvider {
  async classifyLogbookEvent(i: ClassifyEventInput): Promise<ClassifyEventResult> {
    const t = (i.text ?? '').toLowerCase();
    if (/diesel|gasolina|combustible/.test(t)) {
      return { eventType: 'fuel', confidence: 0.86, suggested: { expenseConcept: 'Diesel' } };
    }
    if (/caseta|peaje/.test(t)) {
      return { eventType: 'toll', confidence: 0.81, suggested: { expenseConcept: 'Caseta' } };
    }
    if (/comida|alimento/.test(t)) {
      return { eventType: 'meal', confidence: 0.7, suggested: {} };
    }
    return { eventType: 'note', confidence: 0.5, suggested: {} };
  }

  async extractEvidence(_i: ExtractEvidenceInput): Promise<ExtractEvidenceResult> {
    return {
      detectedType: 'waybill',
      fields: { folio: 'CP-STUB', amount: null, plates: null },
      confidence: 0.6,
    };
  }

  async routeIncident(i: RouteIncidentInput): Promise<RouteIncidentResult> {
    const d = i.description.toLowerCase();
    if (/humo|fuga|incendio|motor/.test(d)) {
      return {
        type: 'mechanical',
        urgency: 'high',
        routeTo: ['dispatcher', 'mechanic'],
        recommendedActions: ['Detener marcha', 'Pedir grúa', 'Llamar a base'],
        confidence: 0.78,
      };
    }
    if (/asalto|robo|sospechoso/.test(d)) {
      return {
        type: 'security',
        urgency: 'high',
        routeTo: ['security', 'admin'],
        recommendedActions: ['No abrir puertas', 'Compartir ubicación en vivo'],
        confidence: 0.82,
      };
    }
    return {
      type: 'other',
      urgency: 'low',
      routeTo: ['dispatcher'],
      recommendedActions: ['Documentar y continuar'],
      confidence: 0.55,
    };
  }

  async assistantReply(i: AssistantReplyInput): Promise<AssistantReplyResult> {
    const last = i.history[i.history.length - 1]?.content ?? '';
    return {
      reply: `Recibido. ${last.length > 100 ? 'Voy a coordinar con despacho.' : 'Sigo el viaje.'}`,
      shouldEscalate: /urgente|sos|grave/.test(last.toLowerCase()),
    };
  }

  async analyzeInspectionPhoto(i: InspectionPhotoInput): Promise<InspectionPhotoResult> {
    if (i.checkpointId.includes('tires')) {
      return {
        pass: true,
        findings: [{ severity: 'info', note: 'Desgaste dentro de norma' }],
        confidence: 0.7,
      };
    }
    return { pass: true, findings: [], confidence: 0.65 };
  }

  async driverInsights(_i: DriverInsightsInput): Promise<DriverInsightsResult> {
    return {
      insights: [
        { kind: 'praise', text: '0 incidencias en el periodo' },
        { kind: 'info', text: 'Consumo promedio 3.1 km/l' },
      ],
    };
  }
}
