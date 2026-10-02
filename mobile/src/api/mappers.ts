/**
 * Traducción entre los DTOs del backend G3 (camelCase, @g3/contracts) y los
 * modelos de pantalla de G3 Drive (snake_case, heredados de la V1). Así las
 * pantallas no cambian y el backend NestJS queda como única fuente de verdad.
 */
import type {
  EvidenceDTO,
  ExpensePolicyDTO,
  IncidentDTO,
  LogbookEntryDTO,
  TripDTO,
} from './g3/types';
import type { NewEvidenceDTO, NewLogbookEntryDTO } from './g3/trips';
import type { NewIncidentDTO } from './g3/incidents';
import type { Evidence, Incident, LogbookEntry, Trip } from '@/models';
import type { ExpensePolicy } from '@/domain/expensePolicy';
import type {
  EvidenceTypeValue,
  FuelLevelValue,
  IncidentTypeValue,
  LogbookEventValue,
} from '@/constants/enums';
import type { NewLogbookEntry } from './logbook';
import type { NewIncident } from './incidents';

export function tripFromDto(d: TripDTO): Trip {
  return {
    id: d.id,
    company_id: d.companyId,
    driver_id: d.driverId,
    folio: d.folio,
    client_name: d.clientName ?? '',
    cargo: d.cargo,
    origin: d.origin,
    destination: d.destination,
    load_date: d.scheduledAt,
    estimated_unload_date: d.estimatedUnloadAt,
    tons: d.tons,
    price_per_ton: d.pricePerTon,
    total_amount: d.freightAmount,
    driver_commission: d.driverCommission,
    estimated_tolls: d.estimatedTolls,
    estimated_diesel: d.estimatedDiesel,
    status: d.status,
    notes: d.notes,
    started_at: d.startedAt,
    pre_closed_at: d.preClosedAt,
    closed_at: d.closedAt,
    created_at: d.createdAt,
    updated_at: d.updatedAt,
  };
}

export function logbookFromDto(d: LogbookEntryDTO): LogbookEntry {
  return {
    id: d.id,
    client_uuid: d.clientUuid,
    trip_id: d.tripId,
    driver_id: d.driverId,
    event_type: d.eventType as LogbookEventValue,
    occurred_at: d.occurredAt,
    location_text: d.locationText,
    lat: d.lat,
    lng: d.lng,
    odometer_km: d.odometerKm,
    fuel: d.fuel as FuelLevelValue | null,
    expense_amount: d.expenseAmount,
    expense_concept: d.expenseConcept,
    expense_has_receipt: d.expenseHasReceipt,
    comments: d.comments,
    created_at: d.createdAt,
  };
}

export function logbookToDto(e: NewLogbookEntry): NewLogbookEntryDTO {
  return {
    clientUuid: e.client_uuid,
    driverId: e.driver_id,
    eventType: e.event_type,
    occurredAt: e.occurred_at,
    locationText: e.location_text ?? null,
    lat: e.lat ?? null,
    lng: e.lng ?? null,
    odometerKm: e.odometer_km ?? null,
    fuel: e.fuel ?? null,
    expenseAmount: e.expense_amount ?? null,
    expenseConcept: e.expense_concept ?? null,
    expenseHasReceipt: e.expense_has_receipt ?? false,
    comments: e.comments ?? null,
  };
}

/** En el backend un incidente tiene ciclo completo; para el chofer basta "resuelto o no". */
export function incidentFromDto(d: IncidentDTO): Incident {
  const resolved = d.status === 'resolved' || d.status === 'closed';
  return {
    id: d.id,
    client_uuid: d.clientUuid,
    trip_id: d.tripId,
    driver_id: d.driverId ?? '',
    type: d.type as IncidentTypeValue,
    description: d.description,
    occurred_at: d.occurredAt,
    location_text: d.locationText,
    lat: d.lat,
    lng: d.lng,
    urgency: d.urgency,
    resolved,
    resolved_at: d.resolvedAt ?? d.closedAt,
    created_at: d.createdAt,
  };
}

export function incidentToDto(i: NewIncident): NewIncidentDTO {
  return {
    clientUuid: i.client_uuid,
    tripId: i.trip_id ?? null,
    driverId: i.driver_id,
    type: i.type,
    urgency: i.urgency,
    description: i.description,
    occurredAt: i.occurred_at,
    locationText: i.location_text ?? null,
    lat: i.lat ?? null,
    lng: i.lng ?? null,
  };
}

export function evidenceFromDto(d: EvidenceDTO): Evidence {
  return {
    id: d.id,
    trip_id: d.tripId,
    logbook_id: d.logbookId,
    incident_id: d.incidentId,
    driver_id: d.driverId,
    type: d.type as EvidenceTypeValue,
    storage_path: d.storagePath,
    mime_type: d.mimeType,
    size_bytes: d.sizeBytes,
    lat: d.lat,
    lng: d.lng,
    taken_at: d.takenAt,
    created_at: d.createdAt,
  };
}

export function evidenceToDto(e: Omit<Evidence, 'id' | 'created_at'> & { client_uuid: string }): NewEvidenceDTO {
  return {
    clientUuid: e.client_uuid,
    tripId: e.trip_id,
    logbookId: e.logbook_id,
    incidentId: e.incident_id,
    driverId: e.driver_id,
    type: e.type,
    storagePath: e.storage_path,
    mimeType: e.mime_type,
    sizeBytes: e.size_bytes,
    lat: e.lat,
    lng: e.lng,
    takenAt: e.taken_at,
  };
}

export function policyFromDto(d: ExpensePolicyDTO): ExpensePolicy {
  return {
    company_id: d.companyId,
    allow_manual_expense: d.allowManualExpense,
    manual_max_amount: d.manualMaxAmount,
    require_receipt: d.requireReceipt,
  };
}
