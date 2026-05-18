export const Tier = {
  Free: 'free',
  Starter: 'starter',
  Pro: 'pro',
  Business: 'business',
  Enterprise: 'enterprise',
} as const;
export type TierValue = (typeof Tier)[keyof typeof Tier];

export const TIER_PRICE_MXN: Record<TierValue, number | null> = {
  free: 0,
  starter: 349,
  pro: 899,
  business: 2499,
  enterprise: null,
};

export interface TierLimits {
  units: number;
  users: number;
  tripsPerMonth: number;
}

export const TIER_LIMITS: Record<TierValue, TierLimits> = {
  free: { units: 1, users: 1, tripsPerMonth: 20 },
  starter: { units: 3, users: 2, tripsPerMonth: 100 },
  pro: { units: 5, users: 5, tripsPerMonth: 500 },
  business: { units: 30, users: 20, tripsPerMonth: 5000 },
  enterprise: {
    units: Number.POSITIVE_INFINITY,
    users: Number.POSITIVE_INFINITY,
    tripsPerMonth: Number.POSITIVE_INFINITY,
  },
};

export const Feature = {
  // free
  Logbook: 'logbook',
  TripsBasic: 'trips_basic',
  EvidenceUpload: 'evidence_upload',
  IncidentReport: 'incident_report',
  // starter
  PaymentAuthorization: 'payment_authorization',
  EvidenceOcr: 'evidence_ocr',
  EarningsDashboard: 'earnings_dashboard',
  WhatsappNotifications: 'whatsapp_notifications',
  // pro
  FleetMap: 'fleet_map',
  AIAssistantChat: 'ai_assistant_chat',
  AILogbookClassifier: 'ai_logbook_classifier',
  AIIncidentRouter: 'ai_incident_router',
  AIInspectionPhoto: 'ai_inspection_photo',
  DriverScoring: 'driver_scoring',
  UnitScoring: 'unit_scoring',
  SmartAlerts: 'smart_alerts',
  // business
  MultiUser: 'multi_user',
  ApiAccess: 'api_access',
  ErpIntegration: 'erp_integration',
  AdvancedAnalytics: 'advanced_analytics',
  CustomReports: 'custom_reports',
  // enterprise
  DataLakeExport: 'data_lake_export',
  CustomWorkflows: 'custom_workflows',
  PredictiveModels: 'predictive_models',
  DedicatedSupport: 'dedicated_support',
} as const;
export type FeatureValue = (typeof Feature)[keyof typeof Feature];

const free: FeatureValue[] = [
  Feature.Logbook,
  Feature.TripsBasic,
  Feature.EvidenceUpload,
  Feature.IncidentReport,
];
const starter: FeatureValue[] = [
  ...free,
  Feature.PaymentAuthorization,
  Feature.EvidenceOcr,
  Feature.EarningsDashboard,
  Feature.WhatsappNotifications,
];
const pro: FeatureValue[] = [
  ...starter,
  Feature.FleetMap,
  Feature.AIAssistantChat,
  Feature.AILogbookClassifier,
  Feature.AIIncidentRouter,
  Feature.AIInspectionPhoto,
  Feature.DriverScoring,
  Feature.UnitScoring,
  Feature.SmartAlerts,
];
const business: FeatureValue[] = [
  ...pro,
  Feature.MultiUser,
  Feature.ApiAccess,
  Feature.ErpIntegration,
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
  free,
  starter,
  pro,
  business,
  enterprise,
};

const RANK: Record<TierValue, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  business: 3,
  enterprise: 4,
};

export const tierRank = (t: TierValue): number => RANK[t];

export const isAtLeast = (current: TierValue, required: TierValue): boolean =>
  RANK[current] >= RANK[required];

export const tierHas = (tier: TierValue, feature: FeatureValue): boolean =>
  FEATURES_BY_TIER[tier].includes(feature);

export const minTierFor = (feature: FeatureValue): TierValue => {
  for (const t of Object.values(Tier)) {
    if (tierHas(t, feature)) return t;
  }
  return Tier.Enterprise;
};
