import { Theme as NavThemeT } from '@react-navigation/native';
import { useMemo } from 'react';
import { useThemeStore } from '@/stores/theme';

/**
 * Sistema visual G3 Logistics con soporte light/dark.
 * Componentes deben usar `useColors()` para reaccionar al cambio de modo.
 * El export `colors` se conserva como light-default para módulos legacy.
 */

const lightColors = ({
  // Marca (estables)
  navy: '#0E2A47',
  navy2: '#1B3D6B',
  navyDeep: '#06121F',
  blue: '#2E86C1',
  blueLight: '#E8F2FA',

  // Neutros
  bg: '#FFFFFF',
  surface: '#F5F7FA',
  surface2: '#EEF1F6',
  border: '#E1E6EE',

  // Texto
  text: '#0E2A47',
  textSoft: '#3B4A5F',
  muted: '#6B7280',
  onDark: '#F5F5F4',

  // Semántico
  success: '#16A34A',
  successBg: '#DCFCE7',
  warning: '#D97706',
  warningBg: '#FEF3C7',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  info: '#2563EB',
  infoBg: '#E8F2FA',

  // Sobre hero card (siempre oscuro)
  heroBg: '#0E2A47',
  heroText: '#FFFFFF',
}) satisfies Record<string, string>;

const darkColors: typeof lightColors = {
  navy: '#0E2A47',
  navy2: '#1B3D6B',
  navyDeep: '#06121F',
  blue: '#5BA8DD',
  blueLight: 'rgba(91,168,221,0.15)',

  bg: '#06121F',
  surface: '#0F1F33',
  surface2: '#142944',
  border: 'rgba(255,255,255,0.10)',

  text: '#F5F5F4',
  textSoft: 'rgba(245,245,244,0.85)',
  muted: 'rgba(245,245,244,0.55)',
  onDark: '#F5F5F4',

  success: '#22C55E',
  successBg: 'rgba(34,197,94,0.15)',
  warning: '#FBBF24',
  warningBg: 'rgba(251,191,36,0.15)',
  danger: '#F87171',
  dangerBg: 'rgba(248,113,113,0.18)',
  info: '#5BA8DD',
  infoBg: 'rgba(91,168,221,0.15)',

  heroBg: '#0F1F33',
  heroText: '#FFFFFF',
};

export type ColorPalette = typeof lightColors;

export const palettes = { light: lightColors, dark: darkColors } as const;

/** Light por defecto — para uso fuera de componentes. */
export const colors = lightColors;

/** Hook reactivo al modo nocturno. */
export function useColors(): ColorPalette {
  const night = useThemeStore((s) => s.night);
  return night ? darkColors : lightColors;
}

/** Helper para componentes que generan StyleSheet de forma estática. */
export function makeStyles<T>(builder: (c: ColorPalette) => T) {
  return function useStyles() {
    const c = useColors();
    return useMemo(() => builder(c), [c]);
  };
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  button: 14,
  card: 18,
  lg: 22,
  pill: 999,
} as const;

export const typography = {
  h1:         { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.4 },
  h2:         { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3:         { fontSize: 17, fontWeight: '700' as const },
  body:       { fontSize: 15, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const },
  small:      { fontSize: 13, fontWeight: '400' as const },
  caption:    { fontSize: 12, fontWeight: '400' as const },
  eyebrow:    { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.5, textTransform: 'uppercase' as const },
};

export const tripStatusColor = (status: string): string => {
  switch (status) {
    case 'scheduled':  return colors.muted;
    case 'loading':    return colors.warning;
    case 'in_transit': return colors.blue;
    case 'unloading':  return colors.warning;
    case 'finished':   return colors.success;
    case 'cancelled':  return colors.muted;
    default:           return colors.muted;
  }
};

export const navTheme: NavThemeT = {
  dark: false,
  colors: {
    primary: colors.navy,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
    notification: colors.blue,
  },
};

export const darkNavTheme: NavThemeT = {
  dark: true,
  colors: {
    primary: darkColors.blue,
    background: darkColors.bg,
    card: darkColors.surface,
    text: darkColors.text,
    border: darkColors.border,
    notification: darkColors.blue,
  },
};
