import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'g3.theme.night.v1';

interface ThemeState {
  night: boolean;
  initialized: boolean;
  bootstrap: () => Promise<void>;
  setNight: (v: boolean) => Promise<void>;
  toggle: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  night: false,
  initialized: false,
  bootstrap: async () => {
    const v = await AsyncStorage.getItem(KEY);
    set({ night: v === '1', initialized: true });
  },
  setNight: async (v) => {
    set({ night: v });
    await AsyncStorage.setItem(KEY, v ? '1' : '0');
  },
  toggle: async () => {
    const v = !get().night;
    set({ night: v });
    await AsyncStorage.setItem(KEY, v ? '1' : '0');
  },
}));
