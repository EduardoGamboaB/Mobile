/**
 * DTOs de la operación del viaje — lo que G3 Drive captura y G3 Admin
 * consume. Reemplazan las tablas `trips`, `logbook_entries` y `evidences`
 * del Supabase V1: el backend NestJS es la única fuente de verdad.
 */
import type { TripPaymentStatus, TripStatus } from '../trip-status';

export interface TripDto {
  id: string;
  companyId: string;
  folio: string;
  status: TripStatus;
  driverId: string | null;
  tractorId: string | null;
  trailerId: string | null;
  clientName: string | null;
  cargo: string | null;
  origin: string;
  destination: string;
  /** Fecha programada de carga. */
  scheduledAt: string | null;
  estimatedUnloadAt: string | null;
  tons: number | null;
  pricePerTon: number | null;
  /** Importe del flete (lo que se le cobra al cliente). */
  freightAmount: number | null;
  /** Comisión del chofer por el viaje (MXN). */
  driverCommission: number | null;
  estimatedTolls: number | null;
  estimatedDiesel: number | null;
  notes: string | null;
  /** Inicio de carga. */
  startedAt: string | null;
  /** Precierre: entrega con el cliente final; la unidad regresa en vacío. */
  preClosedAt: string | null;
  /** Cierre: la unidad llegó a matriz. */
  closedAt: string | null;
  cancelledAt: string | null;
  paymentStatus: TripPaymentStatus;
  paymentReleasedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const LOGBOOK_EVENTS = [
  'departure',
  'loading',
  'stop',
  'toll',
  'diesel',
  'incident',
  'arrival',
  'unloading',
  'closing',
] as const;
export type LogbookEvent = (typeof LOGBOOK_EVENTS)[number];

/** Eventos de bitácora que representan un gasto del viaje. */
export const EXPENSE_LOGBOOK_EVENTS: readonly LogbookEvent[] = ['toll', 'diesel', 'stop'];

export type FuelLevel = 'full' | 'three_quarters' | 'half' | 'quarter' | 'empty';

export interface LogbookEntryDto {
  id: string;
  companyId: string;
  /** Generado en el dispositivo: hace idempotente el reenvío desde la cola offline. */
  clientUuid: string;
  tripId: string;
  driverId: string;
  eventType: LogbookEvent;
  occurredAt: string;
  locationText: string | null;
  lat: number | null;
  lng: number | null;
  odometerKm: number | null;
  fuel: FuelLevel | null;
  expenseAmount: number | null;
  expenseConcept: string | null;
  /** true si el gasto trae foto de ticket. */
  expenseHasReceipt: boolean;
  comments: string | null;
  createdAt: string;
}

export type CreateLogbookEntryDto = Omit<LogbookEntryDto, 'id' | 'companyId' | 'tripId' | 'createdAt'>;

export type EvidenceType =
  | 'bill_of_lading'
  | 'scale_ticket'
  | 'loading_photo'
  | 'unloading_photo'
  | 'diesel_ticket'
  | 'toll_ticket'
  | 'delivery_proof'
  | 'incident_photo'
  | 'other';

export interface EvidenceDto {
  id: string;
  companyId: string;
  clientUuid: string;
  tripId: string | null;
  logbookId: string | null;
  incidentId: string | null;
  driverId: string;
  type: EvidenceType;
  /** Ruta en Cloud Storage (bucket privado); se lee con URL firmada. */
  storagePath: string;
  mimeType: string | null;
  sizeBytes: number | null;
  lat: number | null;
  lng: number | null;
  takenAt: string | null;
  createdAt: string;
}

export type CreateEvidenceDto = Omit<EvidenceDto, 'id' | 'companyId' | 'createdAt'>;

export interface UploadUrlDto {
  /** URL firmada PUT de corta vida para subir el archivo. */
  uploadUrl: string;
  storagePath: string;
  expiresAt: string;
}
