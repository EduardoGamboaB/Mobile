import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import uuid from 'react-native-uuid';
import {
  createLogbookEntry,
  listLogbook,
  type NewLogbookEntry,
} from '@/api/logbook';
import { offlineQueue } from '@/services/offlineQueue';
import { useNetworkStore } from '@/stores/network';
import { isDemo } from '@/demo';

export function useLogbook(tripId: string | undefined) {
  return useQuery({
    queryKey: ['logbook', tripId],
    queryFn: () => listLogbook(tripId!),
    enabled: !!tripId,
  });
}

export function useCreateLogbookEntry(tripId: string) {
  const qc = useQueryClient();
  const online = useNetworkStore((s) => s.online);
  const effectiveOnline = isDemo || online;

  return useMutation({
    mutationFn: async (input: Omit<NewLogbookEntry, 'client_uuid' | 'trip_id'>) => {
      const entry: NewLogbookEntry = {
        ...input,
        trip_id: tripId,
        client_uuid: String(uuid.v4()),
      };
      if (!effectiveOnline) {
        await offlineQueue.enqueue('logbook', entry);
        return { queued: true as const, entry };
      }
      const created = await createLogbookEntry(entry);
      return { queued: false as const, entry: created };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['logbook', tripId] }),
  });
}
