import { supabase } from './supabase';
import { isDemo, demoStore } from '@/demo';
import type { Trip } from '@/models';
import type { TripStatusValue } from '@/constants/enums';

const ACTIVE_STATUSES: TripStatusValue[] = [
  'scheduled',
  'loading',
  'in_transit',
  'unloading',
  // precerrado: entregado al cliente pero aún en retorno a matriz —
  // el viaje sigue activo hasta el cierre total.
  'pre_closed',
];

export async function listMyActiveTrips(driverId: string): Promise<Trip[]> {
  if (isDemo) return demoStore.listActive();
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('driver_id', driverId)
    .in('status', ACTIVE_STATUSES)
    .order('load_date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Trip[];
}

export async function listMyTripHistory(driverId: string, limit = 30): Promise<Trip[]> {
  if (isDemo) return demoStore.listHistory();
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('driver_id', driverId)
    .in('status', ['finished', 'cancelled'])
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Trip[];
}

export async function getTrip(id: string): Promise<Trip | null> {
  if (isDemo) return demoStore.getTrip(id);
  const { data, error } = await supabase.from('trips').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Trip | null;
}

export async function advanceTripStatus(tripId: string, next: TripStatusValue): Promise<Trip> {
  if (isDemo) return demoStore.advanceStatus(tripId, next);
  const { data, error } = await supabase.rpc('advance_trip_status', {
    p_trip_id: tripId,
    p_next: next,
  });
  if (error) throw error;
  return data as Trip;
}
