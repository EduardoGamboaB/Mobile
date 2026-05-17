import { Theme } from '@react-navigation/native';

/**
 * Sistema visual G3 Logistics — paleta de marca + tokens.
 * Light por defecto; el modo nocturno se selecciona desde Settings.
 */

export const colors = {
  // Marca
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

  // Semántico
  success: '#16A34A',
  successBg: '#DCFCE7',
  warning: '#D97706',
  warningBg: '#FEF3C7',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  info: '#2563EB',
  infoBg: '#E8F2FA',

  // Sobre fondos oscuros
  onDark: '#F5F5F4',
} as const;

export const nightColors = {
  bg: '#06121F',
  surface: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  text: '#F5F5F4',
  textSoft: 'rgba(245,245,244,0.85)',
  muted: 'rgba(245,245,244,0.5)',
} as const;

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
  h1:         { fontSize: 28, fontWeight: '800' as const, color: colors.text, letterSpacing: -0.4 },
  h2:         { fontSize: 22, fontWeight: '700' as const, color: colors.text, letterSpacing: -0.3 },
  h3:         { fontSize: 17, fontWeight: '700' as const, color: colors.text },
  body:       { fontSize: 15, fontWeight: '400' as const, color: colors.text },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const, color: colors.text },
  small:      { fontSize: 13, fontWeight: '400' as const, color: colors.textSoft },
  caption:    { fontSize: 12, fontWeight: '400' as const, color: colors.muted },
  eyebrow:    { fontSize: 11, fontWeight: '700' as const, color: colors.muted, letterSpacing: 1.5, textTransform: 'uppercase' as const },
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

export const tripStatusBg = (status: string): string => {
  switch (status) {
    case 'scheduled':  return colors.surface2;
    case 'loading':    return colors.warningBg;
    case 'in_transit': return colors.blueLight;
    case 'unloading':  return colors.warningBg;
    case 'finished':   return colors.successBg;
    case 'cancelled':  return colors.surface2;
    default:           return colors.surface2;
  }
};

export const navTheme: Theme = {
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
