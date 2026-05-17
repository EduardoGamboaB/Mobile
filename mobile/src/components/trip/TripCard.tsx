import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '@/components/common/Card';
import { StatusChip } from '@/components/common/StatusChip';
import { MapPinIcon } from '@/components/icons';
import { colors, spacing, typography } from '@/theme';
import type { Trip } from '@/models';

interface Props {
  trip: Trip;
  onPress?: () => void;
  highlight?: boolean;
}

export function TripCard({ trip, onPress, highlight }: Props) {
  return (
    <Card onPress={onPress} borderLeftColor={highlight ? colors.blue : undefined}>
      <View style={styles.row}>
        <Text style={styles.folio}>{trip.folio}</Text>
        <StatusChip status={trip.status} />
      </View>
      <Text style={styles.client}>{trip.client_name}</Text>
      <View style={styles.routeRow}>
        <MapPinIcon size={16} color={colors.blue} />
        <Text style={styles.routeText} numberOfLines={1}>
          {trip.origin} → {trip.destination}
        </Text>
      </View>
      {trip.cargo || trip.tons ? (
        <View style={styles.foot}>
          <Text style={styles.meta} numberOfLines={1}>
            {trip.tons ? `${trip.tons} ton` : ''}
            {trip.tons && trip.cargo ? ' · ' : ''}
            {trip.cargo ?? ''}
          </Text>
        </View>
      ) : null}
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
  folio: { ...typography.eyebrow },
  client: { ...typography.h3, marginVertical: spacing.xs },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  routeText: { ...typography.body, flexShrink: 1, color: colors.textSoft },
  foot: {
    marginTop: spacing.sm + 2,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    borderStyle: 'dashed',
  },
  meta: { ...typography.caption },
});
