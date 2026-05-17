import { supabase } from './supabase';
import type { LogbookEntry } from '@/models';
import type { FuelLevelValue, LogbookEventValue } from '@/constants/enums';

export interface NewLogbookEntry {
  client_uuid: string;
  trip_id: string;
  driver_id: string;
  event_type: LogbookEventValue;
  occurred_at: string;
  location_text?: string | null;
  lat?: number | null;
  lng?: number | null;
  odometer_km?: number | null;
  fuel?: FuelLevelValue | null;
  expense_amount?: number | null;
  expense_concept?: string | null;
  comments?: string | null;
}

export async function listLogbook(tripId: string): Promise<LogbookEntry[]> {
  const { data, error } = await supabase
    .from('logbook_entries')
    .select('*')
    .eq('trip_id', tripId)
    .order('occurred_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as LogbookEntry[];
}

export async function createLogbookEntry(entry: NewLogbookEntry): Promise<LogbookEntry> {
  const { data, error } = await supabase
    .from('logbook_entries')
    .upsert(entry, { onConflict: 'client_uuid' })
    .select('*')
    .single();
  if (error) throw error;
  return data as LogbookEntry;
}
