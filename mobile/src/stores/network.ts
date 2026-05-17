import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';

interface NetworkState {
  online: boolean;
  init: () => () => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  online: true,
  init: () => {
    const unsub = NetInfo.addEventListener((state) => {
      set({ online: !!(state.isConnected && state.isInternetReachable !== false) });
    });
    return unsub;
  },
}));
