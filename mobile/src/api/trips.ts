import { isDemo, demoStore } from '@/demo';
import type { Trip } from '@/models';
import type { TripStatusValue } from '@/constants/enums';
import { tripsApi } from './g3/trips';
import { tripFromDto } from './mappers';

/** Activos = programado → precierre (el viaje sigue vivo durante el retorno en vacío). */
export async function listMyActiveTrips(_driverId: string): Promise<Trip[]> {
  if (isDemo) return demoStore.listActive();
  return (await tripsApi.mine('active')).map(tripFromDto);
}

export async function listMyTripHistory(_driverId: string, limit = 30): Promise<Trip[]> {
  if (isDemo) return demoStore.listHistory();
  return (await tripsApi.mine('history')).slice(0, limit).map(tripFromDto);
}

export async function getTrip(id: string): Promise<Trip | null> {
  if (isDemo) return demoStore.getTrip(id);
  return tripFromDto(await tripsApi.get(id));
}

export async function advanceTripStatus(tripId: string, next: TripStatusValue): Promise<Trip> {
  if (isDemo) return demoStore.advanceStatus(tripId, next);
  return tripFromDto(await tripsApi.setStatus(tripId, next));
}
