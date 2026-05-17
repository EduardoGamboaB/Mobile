import { useEffect } from 'react';
import { useNetworkStore } from '@/stores/network';

export function useNetwork() {
  const online = useNetworkStore((s) => s.online);
  const init = useNetworkStore((s) => s.init);
  useEffect(() => init(), [init]);
  return online;
}
