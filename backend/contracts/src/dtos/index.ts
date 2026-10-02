import type { TierValue } from '../tiers';

export * from './auth';
export * from './operations';
export * from './incidents';

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

/**
 * Política de gastos por compañía — administrada desde G3 Admin.
 * Gobierna si el chofer puede registrar gastos manuales sin comprobante
 * fotografiado y hasta qué monto.
 */
export interface ExpensePolicyDto {
  companyId: string;
  /** Permite gastos capturados a mano sin foto de ticket. */
  allowManualExpense: boolean;
  /** Tope por gasto manual sin comprobante; null = sin tope. */
  manualMaxAmount: number | null;
  /** Si true, todo gasto exige foto de ticket (anula lo anterior). */
  requireReceipt: boolean;
  updatedAt: string;
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
export * from './telemetry';
