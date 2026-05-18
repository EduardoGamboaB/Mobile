import { Injectable } from '@nestjs/common';
import type {
  AIProvider,
  AiContext,
  ClassifyEventInput, ClassifyEventResult,
  ExtractEvidenceInput, ExtractEvidenceResult,
  RouteIncidentInput, RouteIncidentResult,
  AssistantReplyInput, AssistantReplyResult,
  InspectionPhotoInput, InspectionPhotoResult,
  DriverInsightsInput, DriverInsightsResult,
} from '../types';

/**
 * Provider local determinista — útil para tests, dev sin claves y como
 * fallback si el proveedor externo está caído.
 */
@Injectable()
export class StubAIProvider implements AIProvider {
  name(): string { return 'stub'; }

  async classifyLogbookEvent(_c: AiContext, i: ClassifyEventInput): Promise<ClassifyEventResult> {
    const t = (i.text ?? '').toLowerCase();
    if (/diesel|litros|pemex/.test(t)) return { eventType: 'diesel', confidence: 0.82, suggested: { expenseConcept: 'diesel' } };
    if (/caseta|peaje/.test(t))         return { eventType: 'toll', confidence: 0.78, suggested: { expenseConcept: 'caseta' } };
    if (/carga|báscula/.test(t))        return { eventType: 'loading', confidence: 0.7, suggested: {} };
    if (/descarg|entreg/.test(t))       return { eventType: 'unloading', confidence: 0.7, suggested: {} };
    if (/falla|reten|robo|accident/.test(t)) return { eventType: 'incident', confidence: 0.75, suggested: {} };
    return { eventType: 'stop', confidence: 0.5, suggested: {} };
  }

  async extractEvidence(_c: AiContext, i: ExtractEvidenceInput): Promise<ExtractEvidenceResult> {
    return {
      detectedType: i.hintType ?? 'bill_of_lading',
      fields: {
        folio: 'G3-2026-00123', tons: 28, plates: 'XY-12-345',
        counterpartyName: 'Cementos Mexicanos', issuedAt: new Date().toISOString(),
        rawText: 'CARTA PORTE 2026-00123 · 28 ton · Tula → Tampico',
      },
      confidence: 0.7,
    };
  }

  async routeIncident(_c: AiContext, i: RouteIncidentInput): Promise<RouteIncidentResult> {
    const t = i.description.toLowerCase();
    if (/robo|extorsi/.test(t)) return { type: 'theft_attempt', urgency: 'critical', routeTo: ['security','dispatcher','admin'], recommendedActions: ['Activar botón de pánico si tu seguridad lo permite','Busca lugar seguro'], confidence: 0.85 };
    if (/accident|colisi|choque|volcadura/.test(t)) return { type: 'accident', urgency: 'critical', routeTo: ['dispatcher','admin'], recommendedActions: ['Llama al 911','Coloca triángulos a 50 y 100 m'], confidence: 0.9 };
    if (/falla|frenos|presi[oó]n|motor/.test(t)) return { type: 'mechanical', urgency: 'high', routeTo: ['mechanic','dispatcher'], recommendedActions: ['Orillarse a lugar seguro','Adjuntar foto del problema'], confidence: 0.8 };
    if (/reten|inspecci[oó]n/.test(t)) return { type: 'checkpoint', urgency: 'low', routeTo: ['dispatcher'], recommendedActions: ['Cooperar y registrar hora de salida'], confidence: 0.75 };
    return { type: 'other', urgency: 'medium', routeTo: ['dispatcher'], recommendedActions: ['Describe con detalle para que despacho actúe'], confidence: 0.5 };
  }

  async assistantReply(_c: AiContext, i: AssistantReplyInput): Promise<AssistantReplyResult> {
    const last = i.history[i.history.length - 1]?.content.toLowerCase() ?? '';
    if (/eta|cuando lleg/.test(last)) return { reply: `Tu ETA al destino es ~${i.tripContext ? '18:00' : '—'}. ¿Quieres que avise al cliente?`, shouldEscalate: false };
    if (/pago|deposit/.test(last))    return { reply: 'El pago se libera entre 3 y 5 días hábiles tras validar la POD.', shouldEscalate: true };
    return { reply: 'Recibido. Estoy revisando con despacho y te respondo en breve.', shouldEscalate: true };
  }

  async analyzeInspectionPhoto(_c: AiContext, i: InspectionPhotoInput): Promise<InspectionPhotoResult> {
    if (i.checkpointId.startsWith('tires-'))
      return { pass: true, findings: [{ severity: 'info', note: 'Profundidad de cocada estimada 4.2 mm.' }], confidence: 0.78 };
    if (i.checkpointId === 'emer-extinguisher')
      return { pass: true, findings: [{ severity: 'info', note: 'Manómetro en zona verde.' }, { severity: 'warning', note: 'Etiqueta de recarga vence en 38 días.' }], confidence: 0.82 };
    if (i.checkpointId === 'cargo-secure')
      return { pass: true, findings: [{ severity: 'info', note: 'Cinchos tensos.' }, { severity: 'warning', note: 'Verifica esquina trasera derecha.' }], confidence: 0.74 };
    return { pass: true, findings: [], confidence: 0.6 };
  }

  async driverInsights(_c: AiContext, _i: DriverInsightsInput): Promise<DriverInsightsResult> {
    return { insights: [
      { kind: 'praise',  text: '97% de entregas a tiempo este mes. Bien hecho.' },
      { kind: 'info',    text: 'Rendimiento de diesel mejoró 0.2 km/L vs mes pasado.' },
      { kind: 'warning', text: 'Renueva tu licencia federal: vence en 20 días.' },
    ]};
  }
}
