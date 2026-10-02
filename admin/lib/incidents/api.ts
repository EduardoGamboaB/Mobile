import { api } from '../api/client';
import type {
  AlertRuleDTO,
  AlertRuleInput,
  IncidentCommentDTO,
  IncidentDTO,
  IncidentStatus,
  IncidentSummary,
  IncidentType,
  IncidentUrgency,
  IncidentWithSlaDTO,
} from './types';

export interface IncidentFilter {
  status?: IncidentStatus;
  urgency?: IncidentUrgency;
  assigneeId?: string;
  breached?: boolean;
}

export interface ManualIncidentInput {
  type: IncidentType;
  urgency: IncidentUrgency;
  description: string;
  tripId?: string | null;
  vehicleId?: string | null;
  locationText?: string | null;
}

export interface IncidentDetail {
  incident: IncidentWithSlaDTO;
  comments: IncidentCommentDTO[];
}

/** Lo que la pantalla necesita del centro de incidentes (implementación HTTP o demo). */
export interface IncidentsBackend {
  list(filter?: IncidentFilter): Promise<IncidentWithSlaDTO[]>;
  summary(): Promise<IncidentSummary>;
  get(id: string): Promise<IncidentDetail>;
  createManual(input: ManualIncidentInput): Promise<IncidentDTO>;
  acknowledge(id: string): Promise<IncidentDTO>;
  start(id: string): Promise<IncidentDTO>;
  resolve(id: string, note: string): Promise<IncidentDTO>;
  close(id: string): Promise<IncidentDTO>;
  reopen(id: string): Promise<IncidentDTO>;
  assign(id: string, assigneeId: string | null): Promise<IncidentDTO>;
  comment(id: string, body: string): Promise<IncidentCommentDTO>;
  listRules(): Promise<AlertRuleDTO[]>;
  createRule(input: AlertRuleInput): Promise<AlertRuleDTO>;
  updateRule(id: string, patch: Partial<AlertRuleInput>): Promise<AlertRuleDTO>;
  deleteRule(id: string): Promise<void>;
  updateMyContact(input: { pushToken?: string | null; whatsapp?: string | null }): Promise<unknown>;
}

export const incidentsHttp: IncidentsBackend = {
  list: (filter = {}) =>
    api.get<IncidentWithSlaDTO[]>('/incidents', {
      query: {
        status: filter.status,
        urgency: filter.urgency,
        assigneeId: filter.assigneeId,
        breached: filter.breached === undefined ? undefined : String(filter.breached),
      },
    }),
  summary: () => api.get<IncidentSummary>('/incidents/summary'),
  get: (id) => api.get<IncidentDetail>(`/incidents/${id}`),
  createManual: (input) => api.post<IncidentDTO>('/incidents/manual', input),
  acknowledge: (id) => api.post<IncidentDTO>(`/incidents/${id}/ack`),
  start: (id) => api.post<IncidentDTO>(`/incidents/${id}/start`),
  resolve: (id, note) => api.post<IncidentDTO>(`/incidents/${id}/resolve`, { note }),
  close: (id) => api.post<IncidentDTO>(`/incidents/${id}/close`),
  reopen: (id) => api.post<IncidentDTO>(`/incidents/${id}/reopen`),
  assign: (id, assigneeId) => api.patch<IncidentDTO>(`/incidents/${id}/assign`, { assigneeId }),
  comment: (id, body) => api.post<IncidentCommentDTO>(`/incidents/${id}/comments`, { body }),
  listRules: () => api.get<AlertRuleDTO[]>('/alert-rules'),
  createRule: (input) => api.post<AlertRuleDTO>('/alert-rules', input),
  updateRule: (id, patch) => api.patch<AlertRuleDTO>(`/alert-rules/${id}`, patch),
  deleteRule: (id) => api.delete<void>(`/alert-rules/${id}`),
  updateMyContact: (input) => api.put('/notification-contacts/me', input),
};
