import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '@/theme';

export type ChipVariant = 'blue' | 'navy' | 'green' | 'amber' | 'red' | 'gray' | 'white';

interface Props {
  label: string;
  variant?: ChipVariant;
  style?: ViewStyle;
}

const palette: Record<ChipVariant, { bg: string; fg: string }> = {
  blue:  { bg: colors.blueLight, fg: colors.blue },
  navy:  { bg: colors.navy,      fg: colors.onDark },
  green: { bg: colors.successBg, fg: '#166534' },
  amber: { bg: colors.warningBg, fg: '#92400E' },
  red:   { bg: colors.dangerBg,  fg: '#991B1B' },
  gray:  { bg: colors.surface2,  fg: colors.muted },
  white: { bg: 'rgba(255,255,255,0.18)', fg: '#FFFFFF' },
};

export function Chip({ label, variant = 'blue', style }: Props) {
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
