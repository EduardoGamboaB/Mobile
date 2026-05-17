import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors, spacing, typography } from '@/theme';
import type { ColorPalette } from '@/theme';
import { LogbookEventIcon, LogbookEventLabel } from '@/constants/enums';
import { IconTile, tileIconColor } from '@/components/common/IconTile';
import { DynamicIcon } from '@/components/common/DynamicIcon';
import { MapPinIcon } from '@/components/icons';
import type { LogbookEntry } from '@/models';

interface Props {
  entries: LogbookEntry[];
}

export function LogbookTimeline({ entries }: Props) {
  const c = useColors();
  const styles = makeStyles(c);
  if (!entries.length) {
    return <Text style={styles.empty}>Aún no hay eventos en la bitácora.</Text>;
  }
  return (
    <View>
      {entries.map((e, idx) => {
        const isLast = idx === entries.length - 1;
        return (
          <View key={e.id} style={styles.row}>
            <View style={styles.iconCol}>
              <View style={styles.iconRound}>
                <IconTile tone="blue" size="sm">
                  <DynamicIcon
                    name={LogbookEventIcon[e.event_type]}
                    size={18}
                    color={tileIconColor('blue')}
                  />
                </IconTile>
              </View>
              {!isLast ? <View style={styles.line} /> : null}
            </View>
            <View style={styles.body}>
              <Text style={[typography.bodyStrong, { color: c.text }]}>{LogbookEventLabel[e.event_type]}</Text>
              <Text style={[typography.caption, { color: c.muted }]}>{new Date(e.occurred_at).toLocaleString()}</Text>
              {e.location_text ? (
                <View style={styles.metaRow}>
                  <MapPinIcon size={14} color={c.muted} />
                  <Text style={styles.meta}>{e.location_text}</Text>
                </View>
              ) : null}
              {e.odometer_km != null ? (
                <Text style={styles.meta}>{e.odometer_km.toLocaleString()} km</Text>
              ) : null}
              {e.expense_amount != null ? (
                <Text style={styles.meta}>
                  ${e.expense_amount.toFixed(2)}{e.expense_concept ? ` · ${e.expense_concept}` : ''}
                </Text>
              ) : null}
              {e.comments ? <Text style={styles.comments}>{e.comments}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  empty: { ...typography.small, textAlign: 'center', paddingVertical: spacing.lg },
  row: { flexDirection: 'row', paddingBottom: spacing.md + 2 },
  iconCol: { width: 40, alignItems: 'center' },
  iconRound: {},
  line: { flex: 1, width: 2, backgroundColor: c.border, marginTop: 2 },
  body: { flex: 1, paddingLeft: spacing.md, paddingBottom: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  meta: { ...typography.small, color: c.textSoft },
  comments: { ...typography.small, color: c.text, marginTop: spacing.xs, fontStyle: 'italic' },
});
