import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius } from '@/theme';

export type IconTileTone = 'blue' | 'navy' | 'success' | 'amber' | 'danger' | 'dark';
export type IconTileSize = 'sm' | 'md' | 'lg';

interface Props {
  children: ReactNode;
  tone?: IconTileTone;
  size?: IconTileSize;
}

const toneStyle: Record<IconTileTone, { bg: string }> = {
  blue:    { bg: colors.blueLight },
  navy:    { bg: colors.surface },
  success: { bg: colors.successBg },
  amber:   { bg: colors.warningBg },
  danger:  { bg: colors.dangerBg },
  dark:    { bg: 'rgba(255,255,255,0.12)' },
};

const sizeStyle: Record<IconTileSize, { w: number; r: number }> = {
  sm: { w: 36, r: 10 },
  md: { w: 44, r: 12 },
  lg: { w: 56, r: radius.card },
};

export function IconTile({ children, tone = 'blue', size = 'md' }: Props) {
  const { bg } = toneStyle[tone];
  const { w, r } = sizeStyle[size];
  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: bg, width: w, height: w, borderRadius: r },
      ]}
    >
      {children}
    </View>
  );
}

/**
 * Devuelve el color del ícono para una tonalidad dada.
 */
export function tileIconColor(tone: IconTileTone = 'blue'): string {
  switch (tone) {
    case 'navy':    return colors.navy;
    case 'success': return colors.success;
    case 'amber':   return colors.warning;
    case 'danger':  return colors.danger;
    case 'dark':    return colors.onDark;
    case 'blue':
    default:        return colors.blue;
  }
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
});
