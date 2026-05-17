import { supabase } from './supabase';
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
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('driver_id', driverId)
    .order('occurred_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Incident[];
}

export async function createIncident(incident: NewIncident): Promise<Incident> {
  const { data, error } = await supabase
    .from('incidents')
    .upsert(incident, { onConflict: 'client_uuid' })
    .select('*')
    .single();
  if (error) throw error;
  return data as Incident;
}
