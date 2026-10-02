import type { TierValue, FeatureValue } from '@/constants/tiers';
import type { TripPaymentStatus, TripStatus } from '@/contracts/tripStatus';

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
    /** Solo usuarios chofer: registro de chofer vinculado. */
    driverId?: string;
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

/** Espejo de `TripDto` de @g3/contracts — vocabulario único de estados. */
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
  scheduledAt: string | null;
  estimatedUnloadAt: string | null;
  tons: number | null;
  pricePerTon: number | null;
  freightAmount: number | null;
  driverCommission: number | null;
  estimatedTolls: number | null;
  estimatedDiesel: number | null;
  notes: string | null;
  startedAt: string | null;
  /** Precierre: entrega con el cliente final; retorno en vacío a matriz. */
  preClosedAt: string | null;
  /** Cierre: la unidad llegó a matriz. */
  closedAt: string | null;
  cancelledAt: string | null;
  paymentStatus: TripPaymentStatus;
  paymentReleasedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LogbookEntryDTO {
  id: string;
  companyId: string;
  clientUuid: string;
  tripId: string;
  driverId: string;
  eventType: string;
  occurredAt: string;
  locationText: string | null;
  lat: number | null;
  lng: number | null;
  odometerKm: number | null;
  fuel: string | null;
  expenseAmount: number | null;
  expenseConcept: string | null;
  expenseHasReceipt: boolean;
  comments: string | null;
  createdAt: string;
}

export interface EvidenceDTO {
  id: string;
  companyId: string;
  clientUuid: string;
  tripId: string | null;
  logbookId: string | null;
  incidentId: string | null;
  driverId: string;
  type: string;
  storagePath: string;
  mimeType: string | null;
  sizeBytes: number | null;
  lat: number | null;
  lng: number | null;
  takenAt: string | null;
  createdAt: string;
}

export interface UploadUrlDTO {
  uploadUrl: string;
  storagePath: string;
  expiresAt: string;
}

export interface ExpensePolicyDTO {
  companyId: string;
  allowManualExpense: boolean;
  manualMaxAmount: number | null;
  requireReceipt: boolean;
  updatedAt: string;
}

export interface IncidentDTO {
  id: string;
  companyId: string;
  folio: string;
  clientUuid: string | null;
  source: 'driver_report' | 'sos' | 'rule' | 'manual';
  type: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
  title: string;
  description: string;
  tripId: string | null;
  driverId: string | null;
  vehicleId: string | null;
  assigneeId: string | null;
  occurredAt: string;
  locationText: string | null;
  lat: number | null;
  lng: number | null;
  evidenceIds: string[];
  slaAckDueAt: string;
  slaResolveDueAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  escalationLevel: number;
  createdAt: string;
  updatedAt: string;
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

export interface CheckoutResponseDTO {
  checkoutUrl: string;
  sessionId: string;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  /** Sólo en 402 — payload de upgrade */
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
