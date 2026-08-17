import { useWindowDimensions } from 'react-native';

/**
 * Layout adaptativo mobile-first.
 *
 * Breakpoints (por ancho de ventana, no de pantalla, para soportar
 * split-screen en tabletas):
 *   - phone   < 600  → 1 columna, paneles apilados
 *   - tablet  ≥ 600  → listas a 2 columnas, formularios centrados
 *   - wide    ≥ 900  → POS a dos paneles (catálogo | carrito)
 */
export interface Layout {
  width: number;
  height: number;
  isLandscape: boolean;
  isTablet: boolean; // ≥ 600
  isWide: boolean; // ≥ 900
  /** columnas sugeridas para listados de tarjetas */
  columns: 1 | 2 | 3;
  /** estilo para centrar formularios largos en pantallas grandes */
  formStyle: { width: '100%'; maxWidth: number; alignSelf: 'center' };
}

export const useLayout = (): Layout => {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 600;
  const isWide = width >= 900;
  return {
    width,
    height,
    isLandscape: width > height,
    isTablet,
    isWide,
    columns: isWide ? 3 : isTablet ? 2 : 1,
    formStyle: { width: '100%', maxWidth: 640, alignSelf: 'center' },
  };
};
