import type {
  TripStatusValue,
  LogbookEventValue,
  FuelLevelValue,
  IncidentTypeValue,
  IncidentUrgencyValue,
  EvidenceTypeValue,
  UserRoleValue,
} from '@/constants/enums';

export type ProfileStatus = 'active' | 'suspended' | 'pending';

export interface Profile {
  id: string;
  company_id: string | null;
  role: UserRoleValue;
  full_name: string;
  phone: string | null;
  email: string | null;
  federal_license: string | null;
  license_expires_at: string | null;
  assigned_unit_number: string | null;
  unit_type: string | null;
  tractor_plates: string | null;
  trailer_plates: string | null;
  status: ProfileStatus;
  photo_url: string | null;
}

export interface Trip {
  id: string;
  company_id: string;
  driver_id: string | null;
  folio: string;
  client_name: string;
  cargo: string | null;
  origin: string;
  destination: string;
  load_date: string | null;
  estimated_unload_date: string | null;
  tons: number | null;
  price_per_ton: number | null;
  total_amount: number | null;
  driver_commission: number | null;
  estimated_tolls: number | null;
  estimated_diesel: number | null;
  status: TripStatusValue;
  notes: string | null;
  started_at: string | null;
  /** Precierre: entrega con el cliente final, retorno en vacío a matriz. */
  pre_closed_at?: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LogbookEntry {
  id: string;
  client_uuid: string | null;
  trip_id: string;
  driver_id: string;
  event_type: LogbookEventValue;
  occurred_at: string;
  location_text: string | null;
  lat: number | null;
  lng: number | null;
  odometer_km: number | null;
  fuel: FuelLevelValue | null;
  expense_amount: number | null;
  expense_concept: string | null;
  /** true si el gasto trae foto de ticket (analizada por IA). */
  expense_has_receipt?: boolean;
  comments: string | null;
  created_at: string;
}

export interface Incident {
  id: string;
  client_uuid: string | null;
  trip_id: string | null;
  driver_id: string;
  type: IncidentTypeValue;
  description: string;
  occurred_at: string;
  location_text: string | null;
  lat: number | null;
  lng: number | null;
  urgency: IncidentUrgencyValue;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface Evidence {
  id: string;
  trip_id: string | null;
  logbook_id: string | null;
  incident_id: string | null;
  driver_id: string;
  type: EvidenceTypeValue;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  lat: number | null;
  lng: number | null;
  taken_at: string | null;
  created_at: string;
}

/** Item local pendiente de subir al servidor. */
export interface PendingItem<T = unknown> {
  id: string;
  kind: 'logbook' | 'incident' | 'evidence';
  payload: T;
  attempts: number;
  lastError: string | null;
  createdAt: number;
}
