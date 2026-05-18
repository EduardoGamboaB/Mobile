import { api } from './client';
import type { TripDTO } from './types';

export interface CreateTripInput {
  origin: string;
  destination: string;
  scheduledAt?: string;
  driverId?: string;
  tractorId?: string;
  trailerId?: string;
  freightAmount?: number;
}

export type TripStatus = TripDTO['status'];

export const tripsApi = {
  list: (filters?: { status?: TripStatus; driverId?: string }) =>
    api.get<TripDTO[]>('/trips', { query: filters }),
  get: (id: string) => api.get<TripDTO>(`/trips/${id}`),
  create: (input: CreateTripInput) => api.post<TripDTO>('/trips', input),
  update: (id: string, patch: Partial<CreateTripInput>) =>
    api.patch<TripDTO>(`/trips/${id}`, patch),
  setStatus: (id: string, status: TripStatus) =>
    api.patch<TripDTO>(`/trips/${id}/status`, { status }),
  /** Gated por Feature.PaymentAuthorization (Starter+) — devuelve 402 si el tier no alcanza */
  releasePayment: (id: string) => api.post<TripDTO>(`/trips/${id}/release-payment`),
};
