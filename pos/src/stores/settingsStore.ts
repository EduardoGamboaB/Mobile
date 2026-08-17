import { create } from 'zustand';
import { loadSettings, persistSettings } from '@/db/settings';
import { DEFAULT_SETTINGS, type BusinessSettings } from '@/models/types';

interface SettingsState {
  settings: BusinessSettings;
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<BusinessSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  loaded: false,
  load: async () => {
    const settings = await loadSettings();
    set({ settings, loaded: true });
  },
  update: async (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    await persistSettings(settings);
  },
}));
