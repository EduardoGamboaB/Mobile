import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import uuid from 'react-native-uuid';
import { createIncident, listMyIncidents, type NewIncident } from '@/api/incidents';
import { useAuthStore } from '@/stores/auth';
import { useNetworkStore } from '@/stores/network';
import { offlineQueue } from '@/services/offlineQueue';

export function useMyIncidents() {
  const userId = useAuthStore((s) => s.session?.user.id);
  return useQuery({
    queryKey: ['incidents', 'mine', userId],
    queryFn: () => listMyIncidents(userId!),
    enabled: !!userId,
  });
}

export function useCreateIncident() {
  const qc = useQueryClient();
  const online = useNetworkStore((s) => s.online);
  return useMutation({
    mutationFn: async (input: Omit<NewIncident, 'client_uuid'>) => {
      const payload: NewIncident = { ...input, client_uuid: String(uuid.v4()) };
      if (!online) {
        await offlineQueue.enqueue('incident', payload);
        return { queued: true as const };
      }
      const inc = await createIncident(payload);
      return { queued: false as const, incident: inc };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }),
  });
}
