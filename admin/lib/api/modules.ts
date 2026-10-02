import { api, tokenStore } from './client';
import type {
  AlertDTO,
  AuthSession,
  CheckoutResponseDTO,
  CompanyDTO,
  DriverDTO,
  JwtTokens,
  LivePosition,
  SubscriptionDTO,
  TierCatalogEntry,
  TractorDTO,
  TrailerDTO,
  TripDTO,
  LogbookEntryDTO,
  EvidenceDTO,
  ExpensePolicyDTO,
  ProfitabilityQuery,
  ProfitabilityReportDTO,
  TripProfitabilityDTO,
  AIClassifyEventResult,
  AIExtractEvidenceResult,
  AIAssistantReplyResult,
  AIRouteIncidentResult,
  AIDriverInsightsResult,
} from './types';
import type { TierValue } from '../tiers';
import { isMfaChallenge, mfaLoginApi, MfaRequiredError } from './security';
import type { TripStatus } from '../contracts/tripStatus';

// =============== AUTH ===============
export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterCompanyInput {
  companyName: string;
  rfc?: string;
  contactEmail: string;
  contactPhone?: string;
  ownerName: string;
  password: string;
}

export const authApi = {
  /**
   * Login de un solo paso. Si la cuenta tiene MFA lanza `MfaRequiredError`
   * (con el reto); para el flujo completo usa `mfaLoginApi` (lib/api/security).
   */
  async login(input: LoginInput): Promise<AuthSession> {
    const res = await mfaLoginApi.login(input);
    if (isMfaChallenge(res)) throw new MfaRequiredError(res);
    return res;
  },
  async registerCompany(input: RegisterCompanyInput): Promise<AuthSession> {
    const res = await api.post<AuthSession>('/auth/register-company', input, { anonymous: true });
    tokenStore.save({ accessToken: res.accessToken, refreshToken: res.refreshToken });
    return res;
  },
  async refresh(refreshToken: string): Promise<JwtTokens> {
    const res = await api.post<JwtTokens>('/auth/refresh', { refreshToken }, { anonymous: true });
    tokenStore.save(res);
    return res;
  },
  logout() {
    tokenStore.clear();
  },
};

// =============== SUBSCRIPTIONS ===============
export const subscriptionsApi = {
  me: () => api.get<SubscriptionDTO>('/subscriptions/me'),
  catalog: () => api.get<TierCatalogEntry[]>('/subscriptions/catalog'),
  createCheckout: (input: {
    tier: TierValue;
    units: number;
    successUrl: string;
    cancelUrl: string;
  }) => api.post<CheckoutResponseDTO>('/subscriptions/checkout', input),
  changePlan: (input: { tier: TierValue; units?: number }) =>
    api.post<SubscriptionDTO>('/subscriptions/change-plan', input),
  cancel: () => api.post<SubscriptionDTO>('/subscriptions/cancel'),
};

// =============== COMPANIES ===============
export const companiesApi = {
  me: () => api.get<CompanyDTO>('/companies/me'),
  update: (patch: Partial<Pick<CompanyDTO, 'name' | 'rfc' | 'contactEmail' | 'contactPhone'>>) =>
    api.patch<CompanyDTO>('/companies/me', patch),
};

// =============== DRIVERS ===============
export interface CreateDriverInput {
  fullName: string;
  phone: string;
  email?: string;
  federalLicense?: string;
  licenseExpiresAt?: string;
}

export const driversApi = {
  list: () => api.get<DriverDTO[]>('/drivers'),
  get: (id: string) => api.get<DriverDTO>(`/drivers/${id}`),
  create: (input: CreateDriverInput) => api.post<DriverDTO>('/drivers', input),
  update: (id: string, patch: Partial<CreateDriverInput & { status: DriverDTO['status'] }>) =>
    api.patch<DriverDTO>(`/drivers/${id}`, patch),
  remove: (id: string) => api.delete<void>(`/drivers/${id}`),
};

// =============== TRACTORS ===============
export interface CreateTractorInput {
  unitNumber: string;
  plates: string;
  brand?: string;
  model?: string;
  year?: number;
}

export const tractorsApi = {
  list: () => api.get<TractorDTO[]>('/tractors'),
  get: (id: string) => api.get<TractorDTO>(`/tractors/${id}`),
  create: (input: CreateTractorInput) => api.post<TractorDTO>('/tractors', input),
  update: (id: string, patch: Partial<CreateTractorInput & { status: TractorDTO['status'] }>) =>
    api.patch<TractorDTO>(`/tractors/${id}`, patch),
  remove: (id: string) => api.delete<void>(`/tractors/${id}`),
  livePositions: () => api.get<LivePosition[]>('/tractors/live/positions'),
};

// =============== TRAILERS ===============
export interface CreateTrailerInput {
  unitNumber: string;
  plates: string;
  type: TrailerDTO['type'];
  capacityTons?: number;
}

export const trailersApi = {
  list: () => api.get<TrailerDTO[]>('/trailers'),
  get: (id: string) => api.get<TrailerDTO>(`/trailers/${id}`),
  create: (input: CreateTrailerInput) => api.post<TrailerDTO>('/trailers', input),
  update: (id: string, patch: Partial<CreateTrailerInput & { status: TrailerDTO['status'] }>) =>
    api.patch<TrailerDTO>(`/trailers/${id}`, patch),
  remove: (id: string) => api.delete<void>(`/trailers/${id}`),
};

// =============== TRIPS ===============
export interface CreateTripInput {
  origin: string;
  destination: string;
  scheduledAt?: string;
  estimatedUnloadAt?: string;
  clientName?: string;
  cargo?: string;
  driverId?: string;
  tractorId?: string;
  trailerId?: string;
  tons?: number;
  pricePerTon?: number;
  freightAmount?: number;
  driverCommission?: number;
  estimatedTolls?: number;
  estimatedDiesel?: number;
  notes?: string;
}

export type { TripStatus };

export const tripsApi = {
  list: (filters?: { status?: TripStatus; driverId?: string }) =>
    api.get<TripDTO[]>('/trips', { query: filters }),
  get: (id: string) => api.get<TripDTO>(`/trips/${id}`),
  create: (input: CreateTripInput) => api.post<TripDTO>('/trips', input),
  update: (id: string, patch: Partial<CreateTripInput>) =>
    api.patch<TripDTO>(`/trips/${id}`, patch),
  setStatus: (id: string, status: TripStatus) =>
    api.patch<TripDTO>(`/trips/${id}/status`, { status }),
  releasePayment: (id: string) => api.post<TripDTO>(`/trips/${id}/release-payment`),
  logbook: (id: string) => api.get<LogbookEntryDTO[]>(`/trips/${id}/logbook`),
  evidences: (id: string) => api.get<EvidenceDTO[]>(`/trips/${id}/evidences`),
};

// =============== RENTABILIDAD (US-25) ===============
export const profitabilityApi = {
  /** Reporte del periodo: totales + una fila por viaje. */
  report: (query: ProfitabilityQuery = {}) =>
    api.get<ProfitabilityReportDTO>('/trips/profitability', {
      query: query as Record<string, string | undefined>,
    }),
  /** Desglose de un viaje (detalle del viaje). */
  trip: (id: string) => api.get<TripProfitabilityDTO>(`/trips/${id}/profitability`),
};

// =============== POLÍTICA DE GASTOS ===============
export type ExpensePolicyInput = Pick<
  ExpensePolicyDTO,
  'allowManualExpense' | 'manualMaxAmount' | 'requireReceipt'
>;

export const expensePolicyApi = {
  get: () => api.get<ExpensePolicyDTO>('/expense-policy'),
  put: (input: ExpensePolicyInput) => api.put<ExpensePolicyDTO>('/expense-policy', input),
};

// =============== ALERTS ===============
export interface CreateAlertInput {
  level: AlertDTO['level'];
  type: AlertDTO['type'];
  message: string;
}

export const alertsApi = {
  list: (filters?: { resolved?: boolean; level?: AlertDTO['level'] }) =>
    api.get<AlertDTO[]>('/alerts', { query: filters }),
  create: (input: CreateAlertInput) => api.post<AlertDTO>('/alerts', input),
  resolve: (id: string) => api.patch<AlertDTO>(`/alerts/${id}`, { resolved: true }),
};

// =============== AI ===============
export const aiApi = {
  classifyLogbookEvent: (input: { text?: string; photoUri?: string }) =>
    api.post<AIClassifyEventResult>('/ai/classify-logbook', input),
  extractEvidence: (input: { photoUri: string; hintType?: string }) =>
    api.post<AIExtractEvidenceResult>('/ai/extract-evidence', input),
  routeIncident: (input: { description: string; photoUri?: string }) =>
    api.post<AIRouteIncidentResult>('/ai/route-incident', input),
  assistantReply: (input: {
    history: { id: string; role: string; content: string; createdAt: string }[];
    tripContext?: { folio: string; status: string; destination: string };
  }) => api.post<AIAssistantReplyResult>('/ai/assistant-reply', input),
  analyzeInspectionPhoto: (input: { checkpointId: string; photoUri: string }) =>
    api.post<{
      pass: boolean;
      findings: { severity: 'info' | 'warning' | 'critical'; note: string }[];
      confidence: number;
    }>('/ai/analyze-inspection-photo', input),
  driverInsights: (input: { driverId: string; rangeDays: number }) =>
    api.post<AIDriverInsightsResult>('/ai/driver-insights', input),
};
