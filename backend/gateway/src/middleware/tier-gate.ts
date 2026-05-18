import { Feature, type FeatureValue } from '@g3/contracts';

export interface GateRule {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  pattern: RegExp;
  requires: FeatureValue[];
}

/**
 * Tabla de gating: el gateway evalúa esto antes de proxar al servicio interno.
 * Sólo aquí se decide qué tier necesita cada ruta — los servicios confían en
 * los headers x-company-id / x-tier inyectados.
 */
export const GATE_TABLE: GateRule[] = [
  // Fleet map (Pro+)
  { method: 'GET', pattern: /^\/api\/tractors\/live\/positions$/, requires: [Feature.FleetMap] },
  // Trip payment release (Starter+)
  { method: 'POST', pattern: /^\/api\/trips\/[^/]+\/release-payment$/, requires: [Feature.PaymentAuthorization] },
  // AI agents
  { method: 'POST', pattern: /^\/api\/ai\/classify-logbook$/, requires: [Feature.AILogbookClassifier] },
  { method: 'POST', pattern: /^\/api\/ai\/extract-evidence$/, requires: [Feature.EvidenceOcr] },
  { method: 'POST', pattern: /^\/api\/ai\/route-incident$/, requires: [Feature.AIIncidentRouter] },
  { method: 'POST', pattern: /^\/api\/ai\/assistant-reply$/, requires: [Feature.AIAssistantChat] },
  { method: 'POST', pattern: /^\/api\/ai\/analyze-inspection-photo$/, requires: [Feature.AIInspectionPhoto] },
  { method: 'POST', pattern: /^\/api\/ai\/driver-insights$/, requires: [Feature.DriverScoring] },
];

export function matchGate(method: string, path: string): GateRule | null {
  const m = method.toUpperCase();
  return GATE_TABLE.find((g) => g.method === m && g.pattern.test(path)) ?? null;
}
