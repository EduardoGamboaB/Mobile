import { api } from './client';
import type {
  EvidenceDTO,
  ExpensePolicyDTO,
  LogbookEntryDTO,
  TripDTO,
  UploadUrlDTO,
} from './types';

export interface CreateTripInput {
  origin: string;
  destination: string;
  scheduledAt?: string;
  clientName?: string;
  cargo?: string;
  driverId?: string;
  tractorId?: string;
  trailerId?: string;
  freightAmount?: number;
  driverCommission?: number;
}

export type TripStatus = TripDTO['status'];

export type NewLogbookEntryDTO = Omit<LogbookEntryDTO, 'id' | 'companyId' | 'tripId' | 'createdAt'>;
export type NewEvidenceDTO = Omit<EvidenceDTO, 'id' | 'companyId' | 'createdAt'>;

export const tripsApi = {
  list: (filters?: { status?: TripStatus; driverId?: string }) =>
    api.get<TripDTO[]>('/trips', { query: filters }),
  /** Viajes del chofer autenticado: activos (incluye precierre) o historial. */
  mine: (scope: 'active' | 'history') => api.get<TripDTO[]>('/trips/mine', { query: { scope } }),
  get: (id: string) => api.get<TripDTO>(`/trips/${id}`),
  create: (input: CreateTripInput) => api.post<TripDTO>('/trips', input),
  update: (id: string, patch: Partial<CreateTripInput>) =>
    api.patch<TripDTO>(`/trips/${id}`, patch),
  setStatus: (id: string, status: TripStatus) =>
    api.patch<TripDTO>(`/trips/${id}/status`, { status }),
  /** Gated por Feature.PaymentAuthorization (Starter+) — devuelve 402 si el tier no alcanza */
  releasePayment: (id: string) => api.post<TripDTO>(`/trips/${id}/release-payment`),

  listLogbook: (tripId: string) => api.get<LogbookEntryDTO[]>(`/trips/${tripId}/logbook`),
  addLogbookEntry: (tripId: string, entry: NewLogbookEntryDTO) =>
    api.post<LogbookEntryDTO>(`/trips/${tripId}/logbook`, entry),

  listEvidences: (tripId: string) => api.get<EvidenceDTO[]>(`/trips/${tripId}/evidences`),
  evidenceUploadUrl: (tripId: string, input: { clientUuid: string; mimeType: string }) =>
    api.post<UploadUrlDTO>(`/trips/${tripId}/evidences/upload-url`, input),
  registerEvidence: (tripId: string, ev: NewEvidenceDTO) =>
    api.post<EvidenceDTO>(`/trips/${tripId}/evidences`, ev),
};

export const expensePolicyApi = {
  get: () => api.get<ExpensePolicyDTO>('/expense-policy'),
};
