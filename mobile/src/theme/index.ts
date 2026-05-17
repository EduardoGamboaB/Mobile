import { Theme } from '@react-navigation/native';

export const colors = {
  bg: '#0B0B0B',
  surface: '#1F2937',
  surfaceAlt: '#111827',
  primary: '#0E3A4C',
  primaryLight: '#14506A',
  accent: '#9B2C2C',
  text: '#F5F5F4',
  textOnLight: '#0B0B0B',
  muted: '#9CA3AF',
  border: '#374151',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',
  info: '#2563EB',
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
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  h1: { fontSize: 28, fontWeight: '800' as const, color: colors.text },
  h2: { fontSize: 22, fontWeight: '700' as const, color: colors.text },
  h3: { fontSize: 18, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 16, fontWeight: '400' as const, color: colors.text },
  bodyStrong: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
  small: { fontSize: 13, fontWeight: '400' as const, color: colors.muted },
  label: { fontSize: 12, fontWeight: '700' as const, color: colors.muted, letterSpacing: 1 },
};

export const tripStatusColor = (status: string): string => {
  switch (status) {
    case 'scheduled':  return colors.info;
    case 'loading':    return colors.warning;
    case 'in_transit': return colors.primaryLight;
    case 'unloading':  return colors.warning;
    case 'finished':   return colors.success;
    case 'cancelled':  return colors.muted;
    default:           return colors.muted;
  }
};

export const navTheme: Theme = {
  dark: true,
  colors: {
    primary: colors.primary,
    background: colors.bg,
    card: colors.surfaceAlt,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
};
