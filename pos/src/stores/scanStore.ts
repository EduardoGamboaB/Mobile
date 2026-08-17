import { create } from 'zustand';

/**
 * Puente entre la pantalla de escáner y quien la invoca: la pantalla que
 * necesita un código registra su handler, navega a "Scanner" y recibe el
 * código leído sin pasar funciones por parámetros de navegación.
 */
interface ScanState {
  handler: ((code: string) => void) | null;
  setHandler: (fn: ((code: string) => void) | null) => void;
}

export const useScanStore = create<ScanState>((set) => ({
  handler: null,
  setHandler: (fn) => set({ handler: fn }),
}));
