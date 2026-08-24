import { supabase } from './supabase';
import { isDemo, demoStore } from '@/demo';
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
  /** true si el gasto trae foto de ticket (analizada por IA). */
  expense_has_receipt?: boolean;
  comments?: string | null;
}

export async function listLogbook(tripId: string): Promise<LogbookEntry[]> {
  if (isDemo) return demoStore.listLogbook(tripId);
  const { data, error } = await supabase
    .from('logbook_entries')
    .select('*')
    .eq('trip_id', tripId)
    .order('occurred_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as LogbookEntry[];
}

export async function createLogbookEntry(entry: NewLogbookEntry): Promise<LogbookEntry> {
  if (isDemo) {
    return demoStore.addLogbookEntry({
      id: entry.client_uuid,
      client_uuid: entry.client_uuid,
      trip_id: entry.trip_id,
      driver_id: entry.driver_id,
      event_type: entry.event_type,
      occurred_at: entry.occurred_at,
      location_text: entry.location_text ?? null,
      lat: entry.lat ?? null,
      lng: entry.lng ?? null,
      odometer_km: entry.odometer_km ?? null,
      fuel: entry.fuel ?? null,
      expense_amount: entry.expense_amount ?? null,
      expense_concept: entry.expense_concept ?? null,
      expense_has_receipt: entry.expense_has_receipt ?? false,
      comments: entry.comments ?? null,
      created_at: new Date().toISOString(),
    });
  }
  const { data, error } = await supabase
    .from('logbook_entries')
    .upsert(entry, { onConflict: 'client_uuid' })
    .select('*')
    .single();
  if (error) throw error;
  return data as LogbookEntry;
}
