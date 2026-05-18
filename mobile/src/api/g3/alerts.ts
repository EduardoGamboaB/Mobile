import { api } from './client';
import type { AlertDTO } from './types';

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
