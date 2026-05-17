import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/common/Card';
import { StatusChip } from '@/components/common/StatusChip';
import { colors, spacing, typography } from '@/theme';
import type { Trip } from '@/models';

interface Props {
  trip: Trip;
  onPress?: () => void;
}

export function TripCard({ trip, onPress }: Props) {
  return (
    <Card onPress={onPress}>
      <View style={styles.row}>
        <Text style={styles.folio}>{trip.folio}</Text>
        <StatusChip status={trip.status} size="sm" />
      </View>
      <Text style={styles.client}>{trip.client_name}</Text>
      <View style={styles.routeRow}>
        <Text style={styles.routeText} numberOfLines={1}>
          {trip.origin}
        </Text>
        <Text style={styles.arrow}>→</Text>
        <Text style={styles.routeText} numberOfLines={1}>
          {trip.destination}
        </Text>
      </View>
      {trip.cargo ? <Text style={styles.cargo}>{trip.cargo}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  folio: { ...typography.label, color: colors.muted },
  client: { ...typography.h3, marginBottom: spacing.xs },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  routeText: { ...typography.body, flexShrink: 1 },
  arrow: { color: colors.muted, fontSize: 16 },
  cargo: { ...typography.small, marginTop: spacing.xs },
});
