import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';
import { LogbookEventIcon, LogbookEventLabel } from '@/constants/enums';
import type { LogbookEntry } from '@/models';

interface Props {
  entries: LogbookEntry[];
}

export function LogbookTimeline({ entries }: Props) {
  if (!entries.length) {
    return <Text style={styles.empty}>Aún no hay eventos en la bitácora.</Text>;
  }
  return (
    <View>
      {entries.map((e, idx) => (
        <View key={e.id} style={styles.row}>
          <View style={styles.iconCol}>
            <Text style={styles.icon}>{LogbookEventIcon[e.event_type]}</Text>
            {idx < entries.length - 1 && <View style={styles.line} />}
          </View>
          <View style={styles.body}>
            <Text style={styles.title}>{LogbookEventLabel[e.event_type]}</Text>
            <Text style={styles.time}>{new Date(e.occurred_at).toLocaleString()}</Text>
            {e.location_text ? <Text style={styles.meta}>📍 {e.location_text}</Text> : null}
            {e.odometer_km != null ? (
              <Text style={styles.meta}>🛣 {e.odometer_km} km</Text>
            ) : null}
            {e.expense_amount != null ? (
              <Text style={styles.meta}>
                💲 ${e.expense_amount.toFixed(2)} {e.expense_concept ?? ''}
              </Text>
            ) : null}
            {e.comments ? <Text style={styles.comments}>{e.comments}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { ...typography.small, textAlign: 'center', paddingVertical: spacing.lg },
  row: { flexDirection: 'row', marginBottom: spacing.md },
  iconCol: { width: 40, alignItems: 'center' },
  icon: {
    fontSize: 22,
    width: 36,
    height: 36,
    textAlign: 'center',
    lineHeight: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 4 },
  body: { flex: 1, paddingLeft: spacing.md, paddingBottom: spacing.md },
  title: { ...typography.bodyStrong },
  time: { ...typography.small },
  meta: { ...typography.small, color: colors.text, marginTop: 2 },
  comments: { ...typography.small, color: colors.text, marginTop: spacing.xs, fontStyle: 'italic' },
});
