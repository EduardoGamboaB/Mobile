import {
  TRIP_STATUSES,
  TRIP_STATUS_LABEL_ES,
  nextTripStatus,
  type TripStatus as TripStatusType,
} from '@/contracts/tripStatus';

/**
 * Estados del viaje — vocabulario ÚNICO compartido con el backend y G3 Admin
 * (fuente: backend/contracts/src/trip-status.ts, copiado en src/contracts/).
 */
export const TripStatus = {
  Draft: 'draft',
  Scheduled: 'scheduled',
  Loading: 'loading',
  InTransit: 'in_transit',
  Unloading: 'unloading',
  /** Entrega realizada con el cliente final; la unidad regresa en vacío a matriz. */
  PreClosed: 'pre_closed',
  Closed: 'closed',
  Cancelled: 'cancelled',
} as const satisfies Record<string, TripStatusType>;
export type TripStatusValue = TripStatusType;

export const TripStatusLabel: Record<TripStatusValue, string> = { ...TRIP_STATUS_LABEL_ES };

export const nextStatus = Object.fromEntries(
  TRIP_STATUSES.map((s) => [s, nextTripStatus(s)]),
) as Record<TripStatusValue, TripStatusValue | null>;

/**
 * Texto del botón de avance por estado destino. El precierre y el cierre
 * llevan CTA explícito porque son el corazón del flujo entrega → retorno
 * en vacío → matriz.
 */
export const TripAdvanceCta: Partial<Record<TripStatusValue, string>> = {
  pre_closed: 'Precerrar viaje · entrega realizada',
  closed:     'Cerrar viaje · llegué a matriz',
};

export const LogbookEvent = {
  Departure: 'departure',
  Loading: 'loading',
  Stop: 'stop',
  Toll: 'toll',
  Diesel: 'diesel',
  Incident: 'incident',
  Arrival: 'arrival',
  Unloading: 'unloading',
  Closing: 'closing',
} as const;
export type LogbookEventValue = (typeof LogbookEvent)[keyof typeof LogbookEvent];

export const LogbookEventLabel: Record<LogbookEventValue, string> = {
  departure: 'Salida',
  loading:   'Carga',
  stop:      'Parada',
  toll:      'Caseta',
  diesel:    'Diesel',
  incident:  'Incidencia',
  arrival:   'Llegada',
  unloading: 'Descarga',
  closing:   'Cierre',
};

/**
 * Nombre lógico del ícono outline por evento (se mapea a un componente SVG
 * en `src/components/common/EventIcon.tsx`).
 */
export const LogbookEventIcon: Record<LogbookEventValue, string> = {
  departure: 'navArrow',
  loading:   'package',
  stop:      'pause',
  toll:      'cone',
  diesel:    'fuel',
  incident:  'alert',
  arrival:   'flag',
  unloading: 'package',
  closing:   'checkCircle',
};

export const FuelLevel = {
  Full: 'full',
  ThreeQuarters: 'three_quarters',
  Half: 'half',
  Quarter: 'quarter',
  Empty: 'empty',
} as const;
export type FuelLevelValue = (typeof FuelLevel)[keyof typeof FuelLevel];

export const FuelLevelLabel: Record<FuelLevelValue, string> = {
  full: 'Lleno',
  three_quarters: '3/4',
  half: '1/2',
  quarter: '1/4',
  empty: 'Vacío',
};

export const IncidentType = {
  Mechanical: 'mechanical',
  Checkpoint: 'checkpoint',
  Accident: 'accident',
  DelayLoading: 'delay_loading',
  DelayUnloading: 'delay_unloading',
  ClientIssue: 'client_issue',
  TheftAttempt: 'theft_attempt',
  /** Generados por el sistema (botón SOS y reglas de telemetría), no seleccionables al reportar. */
  Sos: 'sos',
  Speeding: 'speeding',
  DeviceOffline: 'device_offline',
  Other: 'other',
} as const;
export type IncidentTypeValue = (typeof IncidentType)[keyof typeof IncidentType];

/** Tipos que el chofer puede elegir al reportar (los de sistema se excluyen). */
export const REPORTABLE_INCIDENT_TYPES: IncidentTypeValue[] = Object.values(IncidentType).filter(
  (t) => t !== 'sos' && t !== 'speeding' && t !== 'device_offline',
);

export const IncidentTypeLabel: Record<IncidentTypeValue, string> = {
  mechanical:      'Falla mecánica',
  checkpoint:      'Retén / inspección',
  accident:        'Accidente',
  delay_loading:   'Retraso en carga',
  delay_unloading: 'Retraso en descarga',
  client_issue:    'Problema con cliente',
  theft_attempt:   'Robo / extorsión',
  sos:             'SOS',
  speeding:        'Exceso de velocidad',
  device_offline:  'GPS sin señal',
  other:           'Otro',
};

export const IncidentTypeIcon: Record<IncidentTypeValue, string> = {
  mechanical:      'settings',
  checkpoint:      'badge',
  accident:        'alert',
  delay_loading:   'clock',
  delay_unloading: 'clock',
  client_issue:    'user',
  theft_attempt:   'lock',
  sos:             'alert',
  speeding:        'alert',
  device_offline:  'info',
  other:           'info',
};

export const IncidentUrgency = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
  Critical: 'critical',
} as const;
export type IncidentUrgencyValue = (typeof IncidentUrgency)[keyof typeof IncidentUrgency];

export const IncidentUrgencyLabel: Record<IncidentUrgencyValue, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
};

export const EvidenceType = {
  BillOfLading: 'bill_of_lading',
  ScaleTicket: 'scale_ticket',
  LoadingPhoto: 'loading_photo',
  UnloadingPhoto: 'unloading_photo',
  DieselTicket: 'diesel_ticket',
  TollTicket: 'toll_ticket',
  DeliveryProof: 'delivery_proof',
  Other: 'other',
} as const;
export type EvidenceTypeValue = (typeof EvidenceType)[keyof typeof EvidenceType];

export const EvidenceTypeLabel: Record<EvidenceTypeValue, string> = {
  bill_of_lading:   'Carta porte',
  scale_ticket:     'Báscula',
  loading_photo:    'Foto de carga',
  unloading_photo:  'Foto de descarga',
  diesel_ticket:    'Ticket de diesel',
  toll_ticket:      'Ticket de caseta',
  delivery_proof:   'Prueba de entrega',
  other:            'Otro',
};

export const EvidenceTypeIcon: Record<EvidenceTypeValue, string> = {
  bill_of_lading:  'file',
  scale_ticket:    'scale',
  loading_photo:   'package',
  unloading_photo: 'package',
  diesel_ticket:   'fuel',
  toll_ticket:     'receipt',
  delivery_proof:  'checkCircle',
  other:           'file',
};

export const UserRole = {
  Driver: 'driver',
  Dispatcher: 'dispatcher',
  Admin: 'admin',
} as const;
export type UserRoleValue = (typeof UserRole)[keyof typeof UserRole];
