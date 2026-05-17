/**
 * Tiers comerciales G3 — Sistema Operativo del Transportista.
 * Diseñado para la curva hombre-camión → mediana flotilla → enterprise.
 *
 * El verdadero monetization play está en los datos: la suscripción es el
 * caballo de Troya para acumular el histórico que después monetizamos
 * a aseguradoras, financieras y arrendadoras (Fase 5).
 */

export const Tier = {
  Free: 'free',
  Starter: 'starter',
  Pro: 'pro',
  Business: 'business',
  Enterprise: 'enterprise',
} as const;
export type TierValue = (typeof Tier)[keyof typeof Tier];

export const TierLabel: Record<TierValue, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
  enterprise: 'Enterprise',
};

/** Pricing MXN por unidad por mes (free es por compañía). */
export const TierPrice: Record<TierValue, number | null> = {
  free: 0,
  starter: 349,
  pro: 899,
  business: 2_499,
  enterprise: null, // cotización
};

export interface TierMeta {
  tagline: string;
  audience: string;
  unitLimit: number | null; // null = ilimitado / contacto
  highlightColor: string;   // chip color
}

export const TierMetaInfo: Record<TierValue, TierMeta> = {
  free: {
    tagline: 'Bitácora digital, sin costo.',
    audience: 'Para probar la operación',
    unitLimit: 1,
    highlightColor: 'gray',
  },
  starter: {
    tagline: 'OCR + ingresos + dashboard para el hombre-camión.',
    audience: 'Hombre-camión',
    unitLimit: 1,
    highlightColor: 'blue',
  },
  pro: {
    tagline: 'IA, scoring y alertas inteligentes para pequeña flotilla.',
    audience: 'Pequeña flotilla (hasta 5 unidades)',
    unitLimit: 5,
    highlightColor: 'navy',
  },
  business: {
    tagline: 'APIs, ERP y multiusuario para mediana flotilla.',
    audience: 'Mediana flotilla (hasta 30 unidades)',
    unitLimit: 30,
    highlightColor: 'navy',
  },
  enterprise: {
    tagline: 'Custom, data lake propio y soporte dedicado.',
    audience: 'Flotillas enterprise · cargadores grandes',
    unitLimit: null,
    highlightColor: 'navy',
  },
};

/* ===================================================================
 * FEATURE FLAGS — el corazón del gating
 * =================================================================== */

export const Feature = {
  // Operación básica
  BasicLogbook:        'basic_logbook',
  TripsManagement:     'trips_management',
  EvidenceUpload:      'evidence_upload',
  IncidentReport:      'incident_report',
  OfflineSync:         'offline_sync',

  // Compliance
  PreTripInspection:   'pre_trip_inspection_nom068',

  // Inteligencia (Starter+)
  AIOcrEvidence:       'ai_ocr_evidence',
  EarningsDashboard:   'earnings_dashboard',
  WhatsAppIntegration: 'whatsapp_integration',

  // Inteligencia avanzada (Pro+)
  AIAssistantChat:     'ai_assistant_chat',
  AIInspectionAnalysis:'ai_inspection_analysis',
  AILogbookClassifier: 'ai_logbook_classifier',
  AIIncidentRouter:    'ai_incident_router',
  DriverScoring:       'driver_scoring',
  UnitScoring:         'unit_scoring',
  SmartAlerts:         'smart_alerts',
  MultiUnit:           'multi_unit',
  MaintenanceTracking: 'maintenance_tracking',

  // Enterprise reach (Business+)
  APIAccess:           'api_access',
  ERPIntegration:      'erp_integration',
  MultiUser:           'multi_user',
  AdvancedAnalytics:   'advanced_analytics',
  CustomReports:       'custom_reports',

  // Enterprise only
  DataLakeExport:      'data_lake_export',
  CustomWorkflows:     'custom_workflows',
  PredictiveModels:    'predictive_models',
  DedicatedSupport:    'dedicated_support',
} as const;
export type FeatureValue = (typeof Feature)[keyof typeof Feature];

export const FeatureLabel: Record<FeatureValue, string> = {
  basic_logbook:           'Bitácora básica',
  trips_management:        'Registro de viajes',
  evidence_upload:         'Subir evidencias (foto)',
  incident_report:         'Reporte de incidencias',
  offline_sync:            'Modo offline + sync',
  pre_trip_inspection_nom068: 'Inspección NOM-068',
  ai_ocr_evidence:         'OCR de carta porte y tickets',
  earnings_dashboard:      'Mis ingresos y pagos',
  whatsapp_integration:    'Notificaciones por WhatsApp',
  ai_assistant_chat:       'Asistente IA en chat',
  ai_inspection_analysis:  'Análisis IA de fotos de inspección',
  ai_logbook_classifier:   'Clasificador IA de bitácora',
  ai_incident_router:      'Router IA de incidencias',
  driver_scoring:          'Scoring del chofer',
  unit_scoring:            'Scoring de la unidad',
  smart_alerts:            'Alertas inteligentes',
  multi_unit:              'Multi-unidad',
  maintenance_tracking:    'Seguimiento de mantenimiento',
  api_access:              'API pública G3',
  erp_integration:         'Integración con ERP',
  multi_user:              'Multi-usuario / roles',
  advanced_analytics:      'Analítica avanzada',
  custom_reports:          'Reportes a medida',
  data_lake_export:        'Exportación a Data Lake',
  custom_workflows:        'Workflows personalizados',
  predictive_models:       'Modelos predictivos',
  dedicated_support:       'Soporte dedicado',
};

/** Mapeo tier → features incluidas (acumulativo). */
const free: FeatureValue[] = [
  Feature.BasicLogbook,
  Feature.TripsManagement,
  Feature.EvidenceUpload,
  Feature.IncidentReport,
  Feature.OfflineSync,
  Feature.PreTripInspection,
];

const starter: FeatureValue[] = [
  ...free,
  Feature.AIOcrEvidence,
  Feature.EarningsDashboard,
  Feature.WhatsAppIntegration,
];

const pro: FeatureValue[] = [
  ...starter,
  Feature.AIAssistantChat,
  Feature.AIInspectionAnalysis,
  Feature.AILogbookClassifier,
  Feature.AIIncidentRouter,
  Feature.DriverScoring,
  Feature.UnitScoring,
  Feature.SmartAlerts,
  Feature.MultiUnit,
  Feature.MaintenanceTracking,
];

const business: FeatureValue[] = [
  ...pro,
  Feature.APIAccess,
  Feature.ERPIntegration,
  Feature.MultiUser,
  Feature.AdvancedAnalytics,
  Feature.CustomReports,
];

const enterprise: FeatureValue[] = [
  ...business,
  Feature.DataLakeExport,
  Feature.CustomWorkflows,
  Feature.PredictiveModels,
  Feature.DedicatedSupport,
];

export const FEATURES_BY_TIER: Record<TierValue, FeatureValue[]> = {
  free, starter, pro, business, enterprise,
};

/** Orden jerárquico para upgrades. */
export const TIER_RANK: Record<TierValue, number> = {
  free: 0, starter: 1, pro: 2, business: 3, enterprise: 4,
};

export const minTierFor = (feature: FeatureValue): TierValue => {
  const order: TierValue[] = ['free', 'starter', 'pro', 'business', 'enterprise'];
  for (const t of order) {
    if (FEATURES_BY_TIER[t].includes(feature)) return t;
  }
  return 'enterprise';
};

/**
 * Bullets destacados por tier para la pantalla de planes.
 * Cuatro líneas máximo, en lenguaje del chofer / dueño de flotilla.
 */
export const TIER_BULLETS: Record<TierValue, string[]> = {
  free: [
    'Bitácora digital sin papel',
    'Inspección NOM-068 conforme',
    'Evidencia fotográfica',
    'Modo offline',
  ],
  starter: [
    'Todo lo de Free',
    'OCR de carta porte y tickets',
    'Mis ingresos y pagos',
    'Alertas por WhatsApp',
  ],
  pro: [
    'Todo lo de Starter',
    'Asistente IA en chat y bitácora',
    'Scoring del chofer y unidad',
    'Multi-unidad hasta 5',
  ],
  business: [
    'Todo lo de Pro',
    'API pública e integración ERP',
    'Multi-usuario con roles',
    'Hasta 30 unidades',
  ],
  enterprise: [
    'Todo lo de Business',
    'Data lake propio',
    'Workflows y modelos a medida',
    'Soporte dedicado',
  ],
};
