/**
 * Tiers G3 — fuente única de verdad.
 *
 * Este archivo se extrae a un paquete `@g3/contracts` (npm interno o
 * Artifact Registry de GCP) consumido por:
 *   - mobile (G3 Drive)
 *   - admin web (G3 Admin · FrontEnd)
 *   - backend (este repo)
 *
 * Cambios aquí impactan a los 3 productos. La verificación de feature
 * flags en el backend es la fuente autoritativa: el cliente puede
 * mostrar U/X como guía, pero el servidor SIEMPRE valida con este
 * mismo catálogo antes de responder.
 */

export const Tier = {
  Free: 'free',
  Starter: 'starter',
  Pro: 'pro',
  Business: 'business',
  Enterprise: 'enterprise',
} as const;
export type TierValue = (typeof Tier)[keyof typeof Tier];

export const TIER_RANK: Record<TierValue, number> = {
  free: 0, starter: 1, pro: 2, business: 3, enterprise: 4,
};

export const TIER_LABEL: Record<TierValue, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
  enterprise: 'Enterprise',
};

/** Precio MXN por unidad por mes (null = cotización). */
export const TIER_PRICE_MXN: Record<TierValue, number | null> = {
  free: 0,
  starter: 349,
  pro: 899,
  business: 2_499,
  enterprise: null,
};

/** Límites duros por tier (validados a nivel servicio). */
export const TIER_LIMITS: Record<TierValue, { units: number | null; users: number | null; tripsPerMonth: number | null }> = {
  free:       { units: 1,    users: 1,    tripsPerMonth: 20 },
  starter:    { units: 3,    users: 2,    tripsPerMonth: 100 },
  pro:        { units: 5,    users: 5,    tripsPerMonth: 500 },
  business:   { units: 30,   users: 20,   tripsPerMonth: 5_000 },
  enterprise: { units: null, users: null, tripsPerMonth: null },
};

/* ===================================================================
 * FEATURES — la unidad mínima de gating.
 * Las features cubren tanto el frontend (admin + mobile) como el
 * backend (endpoints / capacidades).
 * =================================================================== */
export const Feature = {
  // Operación básica
  BasicLogbook:         'basic_logbook',
  TripsManagement:      'trips_management',
  EvidenceUpload:       'evidence_upload',
  IncidentReport:       'incident_report',
  OfflineSync:          'offline_sync',
  PreTripInspection:    'pre_trip_inspection_nom068',

  // Admin básico
  DriverManagement:     'driver_management',
  EvidenceValidation:   'evidence_validation',

  // Pagos (Starter+)
  PaymentAuthorization: 'payment_authorization',
  EarningsDashboard:    'earnings_dashboard',
  WhatsAppIntegration:  'whatsapp_integration',
  AIOcrEvidence:        'ai_ocr_evidence',

  // Pro+
  AIAssistantChat:      'ai_assistant_chat',
  AIInspectionAnalysis: 'ai_inspection_analysis',
  AILogbookClassifier:  'ai_logbook_classifier',
  AIIncidentRouter:     'ai_incident_router',
  AIInsights:           'ai_insights',
  DriverScoring:        'driver_scoring',
  UnitScoring:          'unit_scoring',
  SmartAlerts:          'smart_alerts',
  MultiUnit:            'multi_unit',
  MaintenanceTracking:  'maintenance_tracking',
  FleetMap:             'fleet_map',

  // Business+
  APIAccess:            'api_access',
  ERPIntegration:       'erp_integration',
  MultiUser:            'multi_user',
  AdvancedAnalytics:    'advanced_analytics',
  CustomReports:        'custom_reports',

  // Enterprise
  DataLakeExport:       'data_lake_export',
  CustomWorkflows:      'custom_workflows',
  PredictiveModels:     'predictive_models',
  DedicatedSupport:     'dedicated_support',
} as const;
export type FeatureValue = (typeof Feature)[keyof typeof Feature];

const free: FeatureValue[] = [
  Feature.BasicLogbook, Feature.TripsManagement, Feature.EvidenceUpload,
  Feature.IncidentReport, Feature.OfflineSync, Feature.PreTripInspection,
  Feature.DriverManagement,
];
const starter: FeatureValue[] = [
  ...free,
  Feature.EvidenceValidation, Feature.PaymentAuthorization,
  Feature.EarningsDashboard, Feature.WhatsAppIntegration, Feature.AIOcrEvidence,
];
const pro: FeatureValue[] = [
  ...starter,
  Feature.AIAssistantChat, Feature.AIInspectionAnalysis,
  Feature.AILogbookClassifier, Feature.AIIncidentRouter, Feature.AIInsights,
  Feature.DriverScoring, Feature.UnitScoring, Feature.SmartAlerts,
  Feature.MultiUnit, Feature.MaintenanceTracking, Feature.FleetMap,
];
const business: FeatureValue[] = [
  ...pro,
  Feature.APIAccess, Feature.ERPIntegration, Feature.MultiUser,
  Feature.AdvancedAnalytics, Feature.CustomReports,
];
const enterprise: FeatureValue[] = [
  ...business,
  Feature.DataLakeExport, Feature.CustomWorkflows,
  Feature.PredictiveModels, Feature.DedicatedSupport,
];

export const FEATURES_BY_TIER: Record<TierValue, FeatureValue[]> = {
  free, starter, pro, business, enterprise,
};

/** ¿El tier dado incluye la feature? */
export function tierHas(tier: TierValue, feature: FeatureValue): boolean {
  return FEATURES_BY_TIER[tier].includes(feature);
}

/** Tier mínimo requerido para usar la feature. */
export function minTierFor(feature: FeatureValue): TierValue {
  const order: TierValue[] = ['free', 'starter', 'pro', 'business', 'enterprise'];
  for (const t of order) {
    if (FEATURES_BY_TIER[t].includes(feature)) return t;
  }
  return 'enterprise';
}

/** ¿Subiendo de tier? */
export function isUpgrade(from: TierValue, to: TierValue): boolean {
  return TIER_RANK[to] > TIER_RANK[from];
}
