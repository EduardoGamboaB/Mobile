import type {
  AlertRuleTrigger,
  IncidentDTO,
  IncidentStatus,
  IncidentType,
  IncidentUrgency,
  IncidentWithSlaDTO,
} from './types';

/** Igual que `DEFAULT_SLA` del backend (minutos). */
export const DEFAULT_SLA: Record<IncidentUrgency, { ackMinutes: number; resolveMinutes: number }> = {
  critical: { ackMinutes: 5, resolveMinutes: 120 },
  high: { ackMinutes: 15, resolveMinutes: 480 },
  medium: { ackMinutes: 60, resolveMinutes: 1440 },
  low: { ackMinutes: 240, resolveMinutes: 4320 },
};

export const URGENCY_RANK: Record<IncidentUrgency, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export const URGENCY_LABEL: Record<IncidentUrgency, string> = {
  low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica',
};

export const STATUS_LABEL: Record<IncidentStatus, string> = {
  open: 'Abierto', acknowledged: 'Acusado', in_progress: 'En atención', resolved: 'Resuelto', closed: 'Cerrado',
};

export const TYPE_LABEL: Record<IncidentType, string> = {
  mechanical: 'Falla mecánica', checkpoint: 'Retén / inspección', accident: 'Accidente',
  delay_loading: 'Retraso en carga', delay_unloading: 'Retraso en descarga', client_issue: 'Problema con cliente',
  theft_attempt: 'Robo / extorsión', sos: 'SOS del operador', speeding: 'Exceso de velocidad',
  device_offline: 'GPS sin señal en viaje activo', other: 'Incidente',
};

/** Ciclo de atención (mismo que el backend). */
export const NEXT_STATUSES: Record<IncidentStatus, IncidentStatus[]> = {
  open: ['acknowledged', 'in_progress', 'resolved'],
  acknowledged: ['in_progress', 'resolved'],
  in_progress: ['resolved'],
  resolved: ['closed', 'in_progress'],
  closed: [],
};

export function isDone(i: Pick<IncidentDTO, 'status'>) {
  return i.status === 'resolved' || i.status === 'closed';
}

export function withSla(i: IncidentDTO, now: Date = new Date()): IncidentWithSlaDTO {
  const t = now.getTime();
  const ackAt = i.acknowledgedAt ? Date.parse(i.acknowledgedAt) : t;
  const resolveAt = i.resolvedAt ? Date.parse(i.resolvedAt) : t;
  const nextDue = isDone(i) ? null : !i.acknowledgedAt ? i.slaAckDueAt : i.slaResolveDueAt;
  return {
    ...i,
    sla: {
      ackBreached: ackAt > Date.parse(i.slaAckDueAt),
      resolveBreached: resolveAt > Date.parse(i.slaResolveDueAt),
      minutesToNextDue: nextDue ? Math.round((Date.parse(nextDue) - t) / 60_000) : null,
    },
  };
}

/** Pendientes primero; dentro, SLA vencido, urgencia y vencimiento más próximo. */
export function byPriority(a: IncidentWithSlaDTO, b: IncidentWithSlaDTO) {
  const d = Number(isDone(a)) - Number(isDone(b));
  if (d) return d;
  const br = Number(!(a.sla.ackBreached || a.sla.resolveBreached)) - Number(!(b.sla.ackBreached || b.sla.resolveBreached));
  if (br) return br;
  if (a.urgency !== b.urgency) return URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency];
  return (a.sla.minutesToNextDue ?? Infinity) - (b.sla.minutesToNextDue ?? Infinity);
}

/** "vence en 12 min" / "vencido hace 1 h 5 min". */
export function formatDue(minutes: number | null): string {
  if (minutes == null) return '—';
  const abs = Math.abs(minutes);
  const txt = abs >= 60 ? `${Math.floor(abs / 60)} h${abs % 60 ? ` ${abs % 60} min` : ''}` : `${abs} min`;
  return minutes >= 0 ? `vence en ${txt}` : `vencido hace ${txt}`;
}

export function describeTrigger(t: AlertRuleTrigger): string {
  switch (t.kind) {
    case 'incident_created':
      return `Incidente ${t.types?.length ? t.types.map((x) => TYPE_LABEL[x]).join(', ') : 'de cualquier tipo'} con urgencia ≥ ${URGENCY_LABEL[t.minUrgency]}`;
    case 'sla_breach':
      return t.stage === 'ack' ? 'SLA de acuse vencido' : 'SLA de resolución vencido';
    case 'speeding':
      return `Velocidad > ${t.thresholdKph} km/h (telemetría)`;
    case 'device_offline':
      return `GPS sin señal > ${t.minutes} min en viaje activo`;
  }
}
