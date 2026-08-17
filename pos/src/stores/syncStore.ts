import { create } from 'zustand';

export interface SyncStatus {
  online: boolean;
  syncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  lastResult: 'ok' | 'error' | 'offline-only' | null;
}

interface SyncState extends SyncStatus {
  setStatus: (patch: Partial<SyncStatus>) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  online: true,
  syncing: false,
  pendingCount: 0,
  lastSyncAt: null,
  lastResult: null,
  setStatus: (patch) => set(patch),
}));
