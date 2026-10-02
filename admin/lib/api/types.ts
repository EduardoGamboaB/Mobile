import type { TierValue, FeatureValue } from '../tiers';
import type { TripPaymentStatus, TripStatus } from '../contracts/tripStatus';

export interface JwtTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSession extends JwtTokens {
  user: {
    id: string;
    email: string;
    role: 'owner' | 'admin' | 'dispatcher' | 'driver' | 'viewer';
    companyId: string;
    tier: TierValue;
  };
}

export interface SubscriptionDTO {
  id: string;
  tier: TierValue;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';
  units: number;
  priceMxn: number | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface TierCatalogEntry {
  tier: TierValue;
  priceMxn: number | null;
  limits: { units: number; users: number; tripsPerMonth: number };
  features: FeatureValue[];
}

export interface CompanyDTO {
  id: string;
  name: string;
  rfc: string | null;
  contactEmail: string;
  contactPhone: string | null;
  createdAt: string;
}

export interface DriverDTO {
  id: string;
  companyId: string;
  fullName: string;
  phone: string;
  email: string | null;
  federalLicense: string | null;
  licenseExpiresAt: string | null;
  status: 'pending' | 'active' | 'inactive';
  createdAt: string;
}

export interface TractorDTO {
  id: string;
  companyId: string;
  unitNumber: string;
  plates: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  status: 'available' | 'in_trip' | 'maintenance' | 'inactive';
  lastLat: number | null;
  lastLng: number | null;
  lastSeenAt: string | null;
}

export interface TrailerDTO {
  id: string;
  companyId: string;
  unitNumber: string;
  plates: string;
  type:
    | 'jaula_42'
    | 'caja_53'
    | 'caja_48'
    | 'refrigerado'
    | 'tolva'
    | 'tanque'
    | 'plataforma'
    | 'lowboy';
  capacityTons: number | null;
  status: 'available' | 'in_trip' | 'maintenance' | 'inactive';
}

/**
 * Espejo de `TripDto` de @g3/contracts (backend/contracts/src/dtos/operations.ts).
 * Estados: vocabulario único de `lib/contracts/tripStatus.ts`; el pago es
 * `paymentStatus`, no un estado.
 */
export interface TripDTO {
  id: string;
  companyId: string;
  folio: string;
  status: TripStatus;
  driverId: string | null;
  tractorId: string | null;
  trailerId: string | null;
  clientName: string | null;
  cargo: string | null;
  origin: string;
  destination: string;
  /** Fecha programada de carga. */
  scheduledAt: string | null;
  estimatedUnloadAt: string | null;
  tons: number | null;
  pricePerTon: number | null;
  /** Importe del flete (lo que se le cobra al cliente). */
  freightAmount: number | null;
  /** Comisión del chofer por el viaje (MXN). */
  driverCommission: number | null;
  estimatedTolls: number | null;
  estimatedDiesel: number | null;
  notes: string | null;
  /** Inicio de carga. */
  startedAt: string | null;
  /** Precierre: entrega con el cliente final; la unidad regresa en vacío. */
  preClosedAt: string | null;
  /** Cierre: la unidad llegó a matriz. */
  closedAt: string | null;
  cancelledAt: string | null;
  paymentStatus: TripPaymentStatus;
  paymentReleasedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LogbookEvent =
  | 'departure'
  | 'loading'
  | 'stop'
  | 'toll'
  | 'diesel'
  | 'incident'
  | 'arrival'
  | 'unloading'
  | 'closing';

/** Espejo de `LogbookEntryDto`. */
export interface LogbookEntryDTO {
  id: string;
  companyId: string;
  clientUuid: string;
  tripId: string;
  driverId: string;
  eventType: LogbookEvent;
  occurredAt: string;
  locationText: string | null;
  lat: number | null;
  lng: number | null;
  odometerKm: number | null;
  fuel: 'full' | 'three_quarters' | 'half' | 'quarter' | 'empty' | null;
  expenseAmount: number | null;
  expenseConcept: string | null;
  /** true si el gasto trae foto de ticket. */
  expenseHasReceipt: boolean;
  comments: string | null;
  createdAt: string;
}

export type EvidenceType =
  | 'bill_of_lading'
  | 'scale_ticket'
  | 'loading_photo'
  | 'unloading_photo'
  | 'diesel_ticket'
  | 'toll_ticket'
  | 'delivery_proof'
  | 'incident_photo'
  | 'other';

/** Espejo de `EvidenceDto` (GET /trips/:id/evidences). */
export interface EvidenceDTO {
  id: string;
  companyId: string;
  clientUuid: string;
  tripId: string | null;
  logbookId: string | null;
  incidentId: string | null;
  driverId: string;
  type: EvidenceType;
  /** Ruta en Cloud Storage (bucket privado); se lee con URL firmada. */
  storagePath: string;
  mimeType: string | null;
  sizeBytes: number | null;
  lat: number | null;
  lng: number | null;
  takenAt: string | null;
  createdAt: string;
}

/** Espejo de `ExpensePolicyDto` (GET/PUT /expense-policy). */
export interface ExpensePolicyDTO {
  companyId: string;
  allowManualExpense: boolean;
  manualMaxAmount: number | null;
  requireReceipt: boolean;
  updatedAt: string;
}

// ── Rentabilidad por viaje (US-25) · espejo de dtos/profitability.ts ──────

export type ProfitabilityMarginBand = 'healthy' | 'thin' | 'low' | 'unknown';
export type ProfitabilityRevenueSource = 'freight' | 'tons_x_price';
export type ProfitabilityDataIssue =
  | 'missing_revenue'
  | 'missing_commission'
  | 'expense_without_amount'
  | 'missing_estimates';
export type ProfitabilityExpenseKind = 'tolls' | 'diesel';

export interface ExpenseComparisonDTO {
  estimated: number | null;
  actual: number;
  variance: number | null;
  variancePct: number | null;
  deviated: boolean;
}

export interface TripProfitabilityDTO {
  tripId: string;
  folio: string;
  status: TripStatus;
  paymentStatus: TripPaymentStatus;
  driverId: string | null;
  tractorId: string | null;
  clientName: string | null;
  origin: string;
  destination: string;
  tripDate: string;
  revenue: number | null;
  revenueSource: ProfitabilityRevenueSource | null;
  tolls: ExpenseComparisonDTO;
  diesel: ExpenseComparisonDTO;
  otherExpenses: number;
  driverCommission: number | null;
  totalCost: number;
  profit: number | null;
  marginPct: number | null;
  marginBand: ProfitabilityMarginBand;
  expensesWithoutReceipt: number;
  expensesWithoutReceiptCount: number;
  expenseEntries: number;
  deviations: ProfitabilityExpenseKind[];
  dataIssues: ProfitabilityDataIssue[];
}

export interface ProfitabilityTotalsDTO {
  trips: number;
  tripsComputed: number;
  tripsWithIssues: number;
  tripsDeviated: number;
  revenue: number;
  tolls: number;
  diesel: number;
  otherExpenses: number;
  driverCommission: number;
  estimatedTolls: number;
  estimatedDiesel: number;
  operatingExpenses: number;
  profit: number;
  marginPct: number | null;
  marginBand: ProfitabilityMarginBand;
  expensesWithoutReceipt: number;
  expensesWithoutReceiptCount: number;
}

export interface ProfitabilityQuery {
  from?: string;
  to?: string;
  driverId?: string;
  tractorId?: string;
  /** Uno o varios estados separados por coma. */
  status?: string;
}

export interface ProfitabilityReportDTO {
  filters: ProfitabilityQuery;
  totals: ProfitabilityTotalsDTO;
  rows: TripProfitabilityDTO[];
  generatedAt: string;
}

export interface AlertDTO {
  id: string;
  companyId: string;
  level: 'info' | 'warning' | 'critical';
  type:
    | 'license_expiring'
    | 'maintenance_due'
    | 'sos'
    | 'route_deviation'
    | 'late_arrival'
    | 'other';
  message: string;
  resolved: boolean;
  createdAt: string;
}

export interface LivePosition {
  tractorId: string;
  unitNumber: string;
  lat: number;
  lng: number;
  speedKph: number | null;
  headingDeg: number | null;
  lastSeenAt: string;
}

export interface CheckoutResponseDTO {
  checkoutUrl: string;
  sessionId: string;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  currentTier?: TierValue;
  missingFeatures?: FeatureValue[];
  suggestedUpgrade?: TierValue;
  upgradeUrl?: string;
}

export class G3ApiError extends Error {
  readonly status: number;
  readonly body: ApiError;
  constructor(status: number, body: ApiError) {
    super(body.message ?? body.error ?? `HTTP ${status}`);
    this.status = status;
    this.body = body;
    this.name = 'G3ApiError';
  }
  get isUpgradeRequired(): boolean {
    return this.status === 402;
  }
  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

export interface AIClassifyEventResult {
  eventType: string;
  confidence: number;
  suggested: Record<string, unknown>;
}

export interface AIExtractEvidenceResult {
  detectedType: string;
  fields: Record<string, unknown>;
  confidence: number;
}

export interface AIAssistantReplyResult {
  reply: string;
  shouldEscalate: boolean;
}

export interface AIRouteIncidentResult {
  type: string;
  urgency: 'low' | 'medium' | 'high';
  routeTo: string[];
  recommendedActions: string[];
  confidence: number;
}

export interface AIDriverInsightsResult {
  insights: { kind: 'info' | 'warning' | 'praise'; text: string }[];
}
