export const TripStatus = {
  Scheduled: 'scheduled',
  Loading: 'loading',
  InTransit: 'in_transit',
  Unloading: 'unloading',
  /** Entrega realizada con el cliente final; la unidad regresa en vacío a matriz. */
  PreClosed: 'pre_closed',
  Finished: 'finished',
  Cancelled: 'cancelled',
} as const;
export type TripStatusValue = (typeof TripStatus)[keyof typeof TripStatus];

export const TripStatusLabel: Record<TripStatusValue, string> = {
  scheduled:  'Programado',
  loading:    'Cargando',
  in_transit: 'En tránsito',
  unloading:  'Descargando',
  pre_closed: 'Precerrado',
  finished:   'Cerrado',
  cancelled:  'Cancelado',
};

export const nextStatus: Record<TripStatusValue, TripStatusValue | null> = {
  scheduled:  'loading',
  loading:    'in_transit',
  in_transit: 'unloading',
  unloading:  'pre_closed',
  pre_closed: 'finished',
  finished:   null,
  cancelled:  null,
};

/**
 * Texto del botón de avance por estado destino. El precierre y el cierre
 * llevan CTA explícito porque son el corazón del flujo entrega → retorno
 * en vacío → matriz.
 */
export const TripAdvanceCta: Partial<Record<TripStatusValue, string>> = {
  pre_closed: 'Precerrar viaje · entrega realizada',
  finished:   'Cerrar viaje · llegué a matriz',
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
  Other: 'other',
} as const;
export type IncidentTypeValue = (typeof IncidentType)[keyof typeof IncidentType];

export const IncidentTypeLabel: Record<IncidentTypeValue, string> = {
  mechanical:      'Falla mecánica',
  checkpoint:      'Retén / inspección',
  accident:        'Accidente',
  delay_loading:   'Retraso en carga',
  delay_unloading: 'Retraso en descarga',
  client_issue:    'Problema con cliente',
  theft_attempt:   'Robo / extorsión',
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
