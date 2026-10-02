import { api } from './client';
import type { DriverDTO } from './types';

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
  /** Perfil del chofer autenticado. */
  me: () => api.get<DriverDTO>('/drivers/me'),
  updateMe: (patch: { phone?: string; email?: string | null }) => api.patch<DriverDTO>('/drivers/me', patch),
  remove: (id: string) => api.delete<void>(`/drivers/${id}`),
};
