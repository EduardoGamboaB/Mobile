/**
 * Tiers G3 — réplica del catálogo del mobile.
 * En producción esto vendrá de un paquete compartido / SDK común
 * sirviendo backend + mobile + admin desde una sola fuente.
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

export const TierPrice: Record<TierValue, number | null> = {
  free: 0,
  starter: 349,
  pro: 899,
  business: 2_499,
  enterprise: null,
};

export const TIER_RANK: Record<TierValue, number> = {
  free: 0, starter: 1, pro: 2, business: 3, enterprise: 4,
};

export const Feature = {
  TripsManagement:     'trips_management',
  EvidenceValidation:  'evidence_validation',
  PaymentAuthorization:'payment_authorization',
  /** Rentabilidad por viaje (US-25) · misma feature que @g3/contracts (Starter+). */
  EarningsDashboard:   'earnings_dashboard',
  DriverManagement:    'driver_management',
  FleetMap:            'fleet_map',
  Scoring:             'scoring',
  AIInsights:          'ai_insights',
  AdvancedAnalytics:   'advanced_analytics',
  MultiUser:           'multi_user',
  ERPIntegration:      'erp_integration',
  APIAccess:           'api_access',
  CustomReports:       'custom_reports',
  DataLakeExport:      'data_lake_export',
  PredictiveModels:    'predictive_models',
} as const;
export type FeatureValue = (typeof Feature)[keyof typeof Feature];

const free: FeatureValue[] = [
  Feature.TripsManagement,
  Feature.DriverManagement,
];
const starter: FeatureValue[] = [
  ...free,
  Feature.EvidenceValidation,
  Feature.PaymentAuthorization,
  Feature.EarningsDashboard,
];
const pro: FeatureValue[] = [
  ...starter,
  Feature.FleetMap,
  Feature.Scoring,
  Feature.AIInsights,
];
const business: FeatureValue[] = [
  ...pro,
  Feature.AdvancedAnalytics,
  Feature.MultiUser,
  Feature.ERPIntegration,
  Feature.APIAccess,
  Feature.CustomReports,
];
const enterprise: FeatureValue[] = [
  ...business,
  Feature.DataLakeExport,
  Feature.PredictiveModels,
];

export const FEATURES_BY_TIER: Record<TierValue, FeatureValue[]> = {
  free, starter, pro, business, enterprise,
};

export const TIER_BULLETS: Record<TierValue, string[]> = {
  free: [
    'Gestión de viajes y choferes',
    'Vista de bitácora',
    'Reportes básicos',
    'Hasta 1 unidad',
  ],
  starter: [
    'Todo lo de Free',
    'Validación de evidencias',
    'Autorización de pagos',
    'Rentabilidad por viaje',
    'Hasta 3 unidades',
  ],
  pro: [
    'Todo lo de Starter',
    'Mapa de flotilla en vivo',
    'Scoring chofer y unidad',
    'AI Insights operativos',
  ],
  business: [
    'Todo lo de Pro',
    'API + integración ERP',
    'Multi-usuario con roles',
    'Reportes a medida',
  ],
  enterprise: [
    'Todo lo de Business',
    'Exportación a Data Lake',
    'Modelos predictivos',
    'Soporte dedicado',
  ],
};

export const TierAudience: Record<TierValue, string> = {
  free: 'Para probar la plataforma',
  starter: 'Hombre-camión / 1 a 3 unidades',
  pro: 'Pequeña flotilla (hasta 5 unidades)',
  business: 'Mediana flotilla (hasta 30 unidades)',
  enterprise: 'Flotilla enterprise · cargadores grandes',
};
