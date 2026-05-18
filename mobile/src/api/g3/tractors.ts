import { api } from './client';
import type { TractorDTO } from './types';

export interface CreateTractorInput {
  unitNumber: string;
  plates: string;
  brand?: string;
  model?: string;
  year?: number;
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

export const tractorsApi = {
  list: () => api.get<TractorDTO[]>('/tractors'),
  get: (id: string) => api.get<TractorDTO>(`/tractors/${id}`),
  create: (input: CreateTractorInput) => api.post<TractorDTO>('/tractors', input),
  update: (id: string, patch: Partial<CreateTractorInput & { status: TractorDTO['status'] }>) =>
    api.patch<TractorDTO>(`/tractors/${id}`, patch),
  remove: (id: string) => api.delete<void>(`/tractors/${id}`),
  /** Gated por Feature.FleetMap (Pro+) — devuelve 402 si el tier no alcanza */
  livePositions: () => api.get<LivePosition[]>('/tractors/live/positions'),
};
