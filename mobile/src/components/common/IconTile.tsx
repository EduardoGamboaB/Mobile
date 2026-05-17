import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useColors, radius } from '@/theme';
import type { ColorPalette } from '@/theme';

export type IconTileTone = 'blue' | 'navy' | 'success' | 'amber' | 'danger' | 'dark';
export type IconTileSize = 'sm' | 'md' | 'lg';

interface Props {
  children: ReactNode;
  tone?: IconTileTone;
  size?: IconTileSize;
}

const sizeStyle: Record<IconTileSize, { w: number; r: number }> = {
  sm: { w: 36, r: 10 },
  md: { w: 44, r: 12 },
  lg: { w: 56, r: radius.card },
};

function bgFor(tone: IconTileTone, c: ColorPalette) {
  switch (tone) {
    case 'blue':    return c.blueLight;
    case 'navy':    return c.surface2;
    case 'success': return c.successBg;
    case 'amber':   return c.warningBg;
    case 'danger':  return c.dangerBg;
    case 'dark':    return 'rgba(255,255,255,0.12)';
  }
}

export function IconTile({ children, tone = 'blue', size = 'md' }: Props) {
  const c = useColors();
  const { w, r } = sizeStyle[size];
  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: bgFor(tone, c), width: w, height: w, borderRadius: r },
      ]}
    >
      {children}
    </View>
  );
}

/** Devuelve el color del ícono para una tonalidad dada según el tema actual. */
export function useTileIconColor(tone: IconTileTone = 'blue'): string {
  const c = useColors();
  switch (tone) {
    case 'navy':    return c.text;
    case 'success': return c.success;
    case 'amber':   return c.warning;
    case 'danger':  return c.danger;
    case 'dark':    return '#FFFFFF';
    case 'blue':
    default:        return c.blue;
  }
}

/** @deprecated usar `useTileIconColor` (estático con paleta light). */
export function tileIconColor(tone: IconTileTone = 'blue'): string {
  const lights: Record<IconTileTone, string> = {
    blue: '#2E86C1',
    navy: '#0E2A47',
    success: '#16A34A',
    amber: '#D97706',
    danger: '#DC2626',
    dark: '#FFFFFF',
  };
  return lights[tone];
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
});
