import { supabase } from './supabase';
import { isDemo, demoStore } from '@/demo';
import type { Incident } from '@/models';
import type { IncidentTypeValue, IncidentUrgencyValue } from '@/constants/enums';

export interface NewIncident {
  client_uuid: string;
  trip_id?: string | null;
  driver_id: string;
  type: IncidentTypeValue;
  description: string;
  occurred_at: string;
  location_text?: string | null;
  lat?: number | null;
  lng?: number | null;
  urgency: IncidentUrgencyValue;
}

export async function listMyIncidents(driverId: string): Promise<Incident[]> {
  if (isDemo) return demoStore.listIncidents();
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('driver_id', driverId)
    .order('occurred_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Incident[];
}

export async function createIncident(incident: NewIncident): Promise<Incident> {
  if (isDemo) {
    return demoStore.addIncident({
      id: incident.client_uuid,
      client_uuid: incident.client_uuid,
      trip_id: incident.trip_id ?? null,
      driver_id: incident.driver_id,
      type: incident.type,
      description: incident.description,
      occurred_at: incident.occurred_at,
      location_text: incident.location_text ?? null,
      lat: incident.lat ?? null,
      lng: incident.lng ?? null,
      urgency: incident.urgency,
      resolved: false,
      resolved_at: null,
      created_at: new Date().toISOString(),
    });
  }
  const { data, error } = await supabase
    .from('incidents')
    .upsert(incident, { onConflict: 'client_uuid' })
    .select('*')
    .single();
  if (error) throw error;
  return data as Incident;
}
