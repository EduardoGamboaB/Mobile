import { api } from './client';
import type { TrailerDTO } from './types';

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
