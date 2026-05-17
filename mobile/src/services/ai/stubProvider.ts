/**
 * Stub local de los agentes de IA. Devuelve respuestas plausibles para que
 * la app funcione offline y en demo, sin proveedor LLM.
 *
 * Reemplazar por un provider real (OpenAI/Anthropic + Vision, o un Edge
 * Function Supabase con `gpt-4o`/`claude-sonnet`) en V2 sin tocar la UI.
 */

import type {
  AIService,
  ClassifyEventInput,
  ClassifyEventResult,
  ExtractEvidenceInput,
  ExtractEvidenceResult,
  RouteIncidentInput,
  RouteIncidentResult,
  AssistantReplyInput,
  AssistantReplyResult,
  InspectionPhotoInput,
  InspectionPhotoResult,
  DriverInsightsInput,
  DriverInsightsResult,
} from './types';
import { LogbookEvent } from '@/constants/enums';

const delay = <T>(v: T, ms = 300): Promise<T> =>
  new Promise((res) => setTimeout(() => res(v), ms));

function pickEventByText(text: string): ClassifyEventResult {
  const t = (text ?? '').toLowerCase();
  if (/diesel|combustible|pemex|litros/.test(t))
    return {
      eventType: LogbookEvent.Diesel,
      confidence: 0.82,
      suggested: { expenseConcept: 'diesel' },
    };
  if (/caseta|peaje|cobro/.test(t))
    return {
      eventType: LogbookEvent.Toll,
      confidence: 0.78,
      suggested: { expenseConcept: 'caseta' },
    };
  if (/cargand|loaded|báscula|bascula/.test(t))
    return { eventType: LogbookEvent.Loading, confidence: 0.7, suggested: {} };
  if (/descarg|unloaded|cliente recibe/.test(t))
    return { eventType: LogbookEvent.Unloading, confidence: 0.7, suggested: {} };
  if (/falla|incidencia|accident|reten|robo|extorsi/.test(t))
    return { eventType: LogbookEvent.Incident, confidence: 0.75, suggested: {} };
  if (/llegada|arrive|llegu/.test(t))
    return { eventType: LogbookEvent.Arrival, confidence: 0.7, suggested: {} };
  if (/cierre|finaliz|terminé|complet/.test(t))
    return { eventType: LogbookEvent.Closing, confidence: 0.7, suggested: {} };
  if (/salida|salí|parto|despac/.test(t))
    return { eventType: LogbookEvent.Departure, confidence: 0.7, suggested: {} };
  // default: parada
  return { eventType: LogbookEvent.Stop, confidence: 0.5, suggested: {} };
}

export const stubAI: AIService = {
  async classifyLogbookEvent(input: ClassifyEventInput) {
    if (input.text) return delay(pickEventByText(input.text));
    // sin texto y con foto: heurística simple por URI
    if (input.photoUri?.includes('diesel'))
      return delay({
        eventType: LogbookEvent.Diesel,
        confidence: 0.6,
        suggested: { expenseConcept: 'diesel' },
      });
    return delay({ eventType: LogbookEvent.Stop, confidence: 0.4, suggested: {} });
  },

  async extractEvidence(input: ExtractEvidenceInput) {
    return delay<ExtractEvidenceResult>({
      detectedType: input.hintType ?? 'bill_of_lading',
      fields: {
        folio: 'G3-2026-00123',
        tons: 28,
        plates: 'XY-12-345',
        counterpartyName: 'Cementos Mexicanos',
        issuedAt: new Date().toISOString(),
        rawText:
          'CARTA PORTE 2026-00123 · Cemento gris CPC-30R · 28.000 ton · Tula → Tampico',
      },
      confidence: 0.7,
    });
  },

  async routeIncident(input: RouteIncidentInput) {
    const t = input.description.toLowerCase();
    if (/robo|asalto|extorsi/.test(t))
      return delay<RouteIncidentResult>({
        type: 'theft_attempt',
        urgency: 'critical',
        routeTo: ['security', 'dispatcher', 'admin'],
        recommendedActions: [
          'Activar botón de pánico si tu seguridad lo permite',
          'No confrontes, busca lugar seguro',
        ],
        confidence: 0.85,
      });
    if (/accident|colisión|choque|volcadura/.test(t))
      return delay<RouteIncidentResult>({
        type: 'accident',
        urgency: 'critical',
        routeTo: ['dispatcher', 'admin'],
        recommendedActions: ['Llama al 911', 'Coloca triángulos a 50 y 100 m'],
        confidence: 0.9,
      });
    if (/falla|frenos|presión|motor|aceite/.test(t))
      return delay<RouteIncidentResult>({
        type: 'mechanical',
        urgency: 'high',
        routeTo: ['mechanic', 'dispatcher'],
        recommendedActions: ['Orillarse a lugar seguro', 'Adjuntar foto del problema'],
        confidence: 0.8,
      });
    if (/reten|inspeccion/.test(t))
      return delay<RouteIncidentResult>({
        type: 'checkpoint',
        urgency: 'low',
        routeTo: ['dispatcher'],
        recommendedActions: ['Cooperar y registrar la hora de salida'],
        confidence: 0.75,
      });
    return delay<RouteIncidentResult>({
      type: 'other',
      urgency: 'medium',
      routeTo: ['dispatcher'],
      recommendedActions: ['Describe con detalle para que despacho actúe'],
      confidence: 0.5,
    });
  },

  async assistantReply(input: AssistantReplyInput) {
    const last = input.history[input.history.length - 1]?.content ?? '';
    const t = last.toLowerCase();
    if (/etat|eta|cuando llegas|llego/.test(t)) {
      return delay({
        reply: `Tu ETA al destino es ~${input.tripContext ? '18:00' : '—'}. ¿Quieres que avise al cliente?`,
        shouldEscalate: false,
      });
    }
    if (/pago|cuando me pagan|deposito/.test(t)) {
      return delay({
        reply: 'El pago se libera entre 3 y 5 días hábiles después de validar la POD. ¿Hablas con admin?',
        shouldEscalate: true,
      });
    }
    return delay({
      reply: 'Recibido. Estoy revisando con despacho y te respondo en breve.',
      shouldEscalate: true,
    });
  },

  async analyzeInspectionPhoto(input: InspectionPhotoInput) {
    return delay<InspectionPhotoResult>({
      pass: true,
      findings: input.checkpointId.includes('llantas')
        ? [{ severity: 'info', note: 'Profundidad de cocada dentro del rango.' }]
        : [],
      confidence: 0.7,
    });
  },

  async driverInsights(input: DriverInsightsInput) {
    return delay<DriverInsightsResult>({
      insights: [
        { kind: 'praise', text: 'Llevas 97% de entregas a tiempo este mes. Bien hecho.' },
        { kind: 'info',   text: 'Tu rendimiento de diesel mejoró 0.2 km/L vs mes pasado.' },
        { kind: 'warning', text: 'Renueva tu licencia federal: vence en 20 días.' },
      ],
    });
  },
};
