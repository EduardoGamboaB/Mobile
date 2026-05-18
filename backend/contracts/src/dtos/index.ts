import type { TierValue } from '../tiers';

export * from './auth';

export interface CompanyDto {
  id: string;
  name: string;
  rfc: string | null;
  contactEmail: string;
  contactPhone: string | null;
  createdAt: string;
}

export interface SubscriptionDto {
  id: string;
  companyId: string;
  tier: TierValue;
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';
  units: number;
  priceMxn: number | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface CheckoutResponseDto {
  checkoutUrl: string;
  sessionId: string;
}

export interface DriverDto {
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

export interface TractorDto {
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

export interface TrailerDto {
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

export type TripStatus =
  | 'draft'
  | 'assigned'
  | 'in_transit'
  | 'arrived'
  | 'delivered'
  | 'paid'
  | 'canceled';

export interface TripDto {
  id: string;
  companyId: string;
  folio: string;
  status: TripStatus;
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

export interface AlertDto {
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
