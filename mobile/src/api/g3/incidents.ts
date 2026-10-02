import { api } from './client';
import type { IncidentDTO } from './types';

export interface NewIncidentDTO {
  clientUuid: string;
  tripId: string | null;
  driverId: string;
  type: string;
  urgency: IncidentDTO['urgency'];
  description: string;
  occurredAt: string;
  locationText: string | null;
  lat: number | null;
  lng: number | null;
}

export interface SosDTO {
  clientUuid: string;
  tripId: string | null;
  driverId: string;
  lat: number | null;
  lng: number | null;
  occurredAt: string;
}

export const incidentsApi = {
  /** Incidentes reportados por el chofer autenticado. */
  mine: () => api.get<IncidentDTO[]>('/incidents/mine'),
  /** Alta idempotente por clientUuid (la cola offline reintenta). */
  report: (input: NewIncidentDTO) => api.post<IncidentDTO>('/incidents', input),
  /** Botón SOS: abre un incidente crítico y dispara el escalamiento. */
  sos: (input: SosDTO) => api.post<IncidentDTO>('/incidents/sos', input),
};
