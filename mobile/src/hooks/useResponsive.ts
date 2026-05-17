import { useWindowDimensions } from 'react-native';

/**
 * Breakpoints inspirados en Material Design adaptados a dispositivos
 * de transporte (operador con celular vs supervisor con tablet en cabina).
 */
export const BREAKPOINTS = {
  phone: 0,
  tablet: 600,
  large: 900,
} as const;

export interface Responsive {
  width: number;
  height: number;
  isPhone: boolean;
  isTablet: boolean;
  isLarge: boolean;
  /** Padding consistente: más espacio en tablet. */
  pagePadding: number;
  /** Ancho máximo del contenido en tablet — evita líneas demasiado largas. */
  contentMaxWidth: number;
  /** Cantidad de columnas para grids (event picker, photo grid). */
  gridColumns: number;
}

export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= BREAKPOINTS.tablet;
  const isLarge = width >= BREAKPOINTS.large;
  return {
    width,
    height,
    isPhone: !isTablet,
    isTablet,
    isLarge,
    pagePadding: isLarge ? 32 : isTablet ? 24 : 20,
    contentMaxWidth: isLarge ? 720 : isTablet ? 640 : width,
    gridColumns: isLarge ? 5 : isTablet ? 4 : 3,
  };
}
