import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, tripStatusColor } from '@/theme';
import { TripStatusLabel, type TripStatusValue } from '@/constants/enums';

interface Props {
  status: TripStatusValue;
  size?: 'sm' | 'md';
}

export function StatusChip({ status, size = 'md' }: Props) {
  const bg = tripStatusColor(status);
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: bg, paddingVertical: size === 'sm' ? 2 : 6 },
      ]}
    >
      <Text style={[styles.text, size === 'sm' && { fontSize: 10 }]}>
        {TripStatusLabel[status].toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  text: { color: colors.text, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
});
