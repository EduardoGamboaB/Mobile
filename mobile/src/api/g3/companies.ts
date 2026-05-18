import { api } from './client';
import type { CompanyDTO } from './types';

export const companiesApi = {
  me: () => api.get<CompanyDTO>('/companies/me'),
  update: (patch: Partial<Pick<CompanyDTO, 'name' | 'rfc' | 'contactEmail' | 'contactPhone'>>) =>
    api.patch<CompanyDTO>('/companies/me', patch),
};
