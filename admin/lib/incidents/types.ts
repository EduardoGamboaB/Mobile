/** Espejo de `backend/contracts/src/dtos/incidents.ts`. */
export type IncidentType =
  | 'mechanical' | 'checkpoint' | 'accident' | 'delay_loading' | 'delay_unloading'
  | 'client_issue' | 'theft_attempt' | 'sos' | 'speeding' | 'device_offline' | 'other';
export type IncidentUrgency = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
export type IncidentSource = 'driver_report' | 'sos' | 'rule' | 'manual';
export type NotificationChannel = 'push' | 'whatsapp';

export interface IncidentDTO {
  id: string;
  companyId: string;
  folio: string;
  clientUuid: string | null;
  source: IncidentSource;
  type: IncidentType;
  urgency: IncidentUrgency;
  status: IncidentStatus;
  title: string;
  description: string;
  tripId: string | null;
  driverId: string | null;
  vehicleId: string | null;
  assigneeId: string | null;
  occurredAt: string;
  locationText: string | null;
  lat: number | null;
  lng: number | null;
  evidenceIds: string[];
  slaAckDueAt: string;
  slaResolveDueAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  escalationLevel: number;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentWithSlaDTO extends IncidentDTO {
  sla: { ackBreached: boolean; resolveBreached: boolean; minutesToNextDue: number | null };
}

export interface IncidentCommentDTO {
  id: string;
  incidentId: string;
  authorId: string | null;
  kind: 'comment' | 'system';
  body: string;
  createdAt: string;
}

export type AlertRuleTrigger =
  | { kind: 'incident_created'; minUrgency: IncidentUrgency; types?: IncidentType[] }
  | { kind: 'sla_breach'; stage: 'ack' | 'resolve' }
  | { kind: 'speeding'; thresholdKph: number }
  | { kind: 'device_offline'; minutes: number };

export interface AlertRuleDTO {
  id: string;
  companyId: string;
  name: string;
  enabled: boolean;
  trigger: AlertRuleTrigger;
  channels: NotificationChannel[];
  notifyRoles: string[];
  createdAt: string;
}

export type AlertRuleInput = Pick<AlertRuleDTO, 'name' | 'enabled' | 'trigger' | 'channels' | 'notifyRoles'>;

export interface IncidentSummary {
  open: number;
  critical: number;
  breached: number;
  unassigned: number;
}
