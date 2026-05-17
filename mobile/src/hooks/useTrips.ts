import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listMyActiveTrips,
  listMyTripHistory,
  getTrip,
  advanceTripStatus,
} from '@/api/trips';
import { useAuthStore } from '@/stores/auth';
import type { TripStatusValue } from '@/constants/enums';

export function useActiveTrips() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['trips', 'active', userId],
    queryFn: () => listMyActiveTrips(userId!),
    enabled: !!userId,
  });
}

export function useTripHistory() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['trips', 'history', userId],
    queryFn: () => listMyTripHistory(userId!),
    enabled: !!userId,
  });
}

export function useTrip(id: string | undefined) {
  return useQuery({
    queryKey: ['trip', id],
    queryFn: () => getTrip(id!),
    enabled: !!id,
  });
}

export function useAdvanceTripStatus(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (next: TripStatusValue) => advanceTripStatus(tripId, next),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] });
      qc.invalidateQueries({ queryKey: ['trip', tripId] });
    },
  });
}
