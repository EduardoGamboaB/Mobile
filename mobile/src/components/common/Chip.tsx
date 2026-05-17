import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useColors, radius, spacing } from '@/theme';

export type ChipVariant = 'blue' | 'navy' | 'green' | 'amber' | 'red' | 'gray' | 'white';

interface Props {
  label: string;
  variant?: ChipVariant;
  style?: ViewStyle;
}

export function Chip({ label, variant = 'blue', style }: Props) {
  const c = useColors();
  const palette: Record<ChipVariant, { bg: string; fg: string }> = {
    blue:  { bg: c.blueLight,  fg: c.blue },
    navy:  { bg: c.navy,       fg: '#FFFFFF' },
    green: { bg: c.successBg,  fg: c.success },
    amber: { bg: c.warningBg,  fg: c.warning },
    red:   { bg: c.dangerBg,   fg: c.danger },
    gray:  { bg: c.surface2,   fg: c.muted },
    white: { bg: 'rgba(255,255,255,0.18)', fg: '#FFFFFF' },
  };
  const { bg, fg } = palette[variant];
  return (
    <View style={[styles.chip, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color: fg }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
});
