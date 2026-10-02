import type { TierValue } from '../tiers';

export type UserRole = 'owner' | 'admin' | 'dispatcher' | 'driver' | 'viewer';

export interface RegisterCompanyDto {
  companyName: string;
  rfc?: string;
  contactEmail: string;
  contactPhone?: string;
  ownerName: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshDto {
  refreshToken: string;
}

export interface AuthSessionDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    companyId: string;
    tier: TierValue;
    /** Solo usuarios chofer: registro de chofer vinculado (servicio drivers). */
    driverId?: string;
  };
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  companyId: string;
  tier: TierValue;
  /** Solo usuarios chofer: id del registro de chofer al que está vinculado. */
  driverId?: string;
  iat?: number;
  exp?: number;
}
