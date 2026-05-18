import type { TierValue, FeatureValue } from '@/constants/tiers';

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

export interface TripDTO {
  id: string;
  companyId: string;
  folio: string;
  status:
    | 'draft'
    | 'assigned'
    | 'in_transit'
    | 'arrived'
    | 'delivered'
    | 'paid'
    | 'canceled';
  driverId: string | null;
  tractorId: string | null;
  trailerId: string | null;
  origin: string;
  destination: string;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  paymentReleasedAt: string | null;
  freightAmount: number | null;
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
