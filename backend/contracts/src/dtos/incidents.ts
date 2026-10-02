/**
 * Centro de incidentes — un incidente nace de un reporte del chofer en
 * G3 Drive, del botón SOS, de una regla de alerta (p.ej. exceso de
 * velocidad leído de la telemetría) o de captura manual en G3 Admin.
 * Se asigna, se comenta, se le liga evidencia y se mide contra un SLA;
 * si el SLA vence, se escala por push y WhatsApp.
 */

export const INCIDENT_TYPES = [
  'mechanical',
  'checkpoint',
  'accident',
  'delay_loading',
  'delay_unloading',
  'client_issue',
  'theft_attempt',
  'sos',
  'speeding',
  'device_offline',
  'other',
] as const;
export type IncidentType = (typeof INCIDENT_TYPES)[number];

export const INCIDENT_URGENCIES = ['low', 'medium', 'high', 'critical'] as const;
export type IncidentUrgency = (typeof INCIDENT_URGENCIES)[number];

export type IncidentStatus = 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
export type IncidentSource = 'driver_report' | 'sos' | 'rule' | 'manual';

/** Minutos para acusar recibo y para resolver, por urgencia. */
export interface SlaTargets {
  ackMinutes: number;
  resolveMinutes: number;
}

export const DEFAULT_SLA: Readonly<Record<IncidentUrgency, SlaTargets>> = {
  critical: { ackMinutes: 5, resolveMinutes: 120 },
  high: { ackMinutes: 15, resolveMinutes: 480 },
  medium: { ackMinutes: 60, resolveMinutes: 1440 },
  low: { ackMinutes: 240, resolveMinutes: 4320 },
};

export interface IncidentCommentDto {
  id: string;
  incidentId: string;
  /** null en entradas del sistema (cambios de estado, escalamientos). */
  authorId: string | null;
  kind: 'comment' | 'system';
  body: string;
  createdAt: string;
}

export interface IncidentDto {
  id: string;
  companyId: string;
  /** INC-{año}-{seq} por compañía. */
  folio: string;
  /** Idempotencia de la cola offline de Drive. */
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
  /** Nivel de escalamiento alcanzado (0 = sin escalar). */
  escalationLevel: number;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentWithSlaDto extends IncidentDto {
  sla: {
    ackBreached: boolean;
    resolveBreached: boolean;
    /** Minutos restantes para el siguiente vencimiento (negativo = vencido). */
    minutesToNextDue: number | null;
  };
}

/** Lo que manda G3 Drive al reportar. */
export interface CreateIncidentDto {
  clientUuid: string;
  tripId: string | null;
  driverId: string;
  type: IncidentType;
  urgency: IncidentUrgency;
  description: string;
  occurredAt: string;
  locationText: string | null;
  lat: number | null;
  lng: number | null;
}

/** Botón SOS: siempre crítico. */
export interface SosDto {
  clientUuid: string;
  tripId: string | null;
  driverId: string;
  lat: number | null;
  lng: number | null;
  occurredAt: string;
}

export type NotificationChannel = 'push' | 'whatsapp';

/**
 * Regla de alerta: cuándo crear/escalar un incidente y a quién avisar.
 * - `incident_created`: al abrirse un incidente con urgencia ≥ minUrgency.
 * - `sla_breach`: al vencer el SLA de acuse o resolución.
 * - `speeding`: telemetría con velocidad > thresholdKph crea un incidente.
 * - `device_offline`: sin posición en `minutes` durante un viaje activo.
 */
export type AlertRuleTrigger =
  | { kind: 'incident_created'; minUrgency: IncidentUrgency; types?: IncidentType[] }
  | { kind: 'sla_breach'; stage: 'ack' | 'resolve' }
  | { kind: 'speeding'; thresholdKph: number }
  | { kind: 'device_offline'; minutes: number };

export interface AlertRuleDto {
  id: string;
  companyId: string;
  name: string;
  enabled: boolean;
  trigger: AlertRuleTrigger;
  channels: NotificationChannel[];
  /** Roles a notificar (owner, admin, dispatcher...). */
  notifyRoles: string[];
  createdAt: string;
}

/** Señal operativa que puede disparar reglas (p.ej. desde la ingesta de telemetría). */
export interface OperationalSignalDto {
  kind: 'position';
  vehicleId: string;
  tripId: string | null;
  driverId: string | null;
  speedKph: number | null;
  lat: number;
  lng: number;
  recordedAt: string;
}
