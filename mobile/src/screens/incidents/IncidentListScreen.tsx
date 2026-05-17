import React from 'react';
import { FlatList, Text, View, StyleSheet } from 'react-native';
import { Screen } from '@/components/common/Screen';
import { Card } from '@/components/common/Card';
import { Chip } from '@/components/common/Chip';
import { AppBar } from '@/components/common/AppBar';
import { MapPinIcon } from '@/components/icons';
import { useMyIncidents } from '@/hooks/useIncidents';
import { IncidentTypeLabel, IncidentUrgencyLabel } from '@/constants/enums';
import { useColors, spacing, typography } from '@/theme';
import type { ColorPalette } from '@/theme';

export function IncidentListScreen() {
  const c = useColors();
  const styles = makeStyles(c);
  const { data } = useMyIncidents();

  return (
    <Screen padded={false} background="cream">
      <View style={{ padding: spacing.lg + 4 }}>
        <AppBar title="Incidencias" />
      </View>
      <FlatList
        contentContainerStyle={{ paddingHorizontal: spacing.lg + 4, paddingBottom: spacing.xl }}
        data={data ?? []}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <Card borderLeftColor={item.resolved ? c.success : c.danger}>
            <View style={styles.head}>
              <Chip
                label={item.resolved ? 'Resuelta' : IncidentUrgencyLabel[item.urgency]}
                variant={item.resolved ? 'green' : item.urgency === 'critical' ? 'red' : 'amber'}
              />
              <Text style={[typography.caption, { color: c.muted }]}>
                {new Date(item.occurred_at).toLocaleDateString('es-MX', {
                  day: '2-digit',
                  month: 'short',
                })}
              </Text>
            </View>
            <Text style={[typography.h3, { color: c.text }, { marginTop: spacing.sm }]}>
              {IncidentTypeLabel[item.type]}
            </Text>
            <Text style={[typography.body, { color: c.text }, { marginTop: spacing.xs }]}>{item.description}</Text>
            {item.location_text ? (
              <View style={styles.metaRow}>
                <MapPinIcon size={14} color={c.muted} />
                <Text style={[typography.caption, { color: c.muted }]}>{item.location_text}</Text>
              </View>
            ) : null}
          </Card>
        )}
        ListEmptyComponent={
          <Text style={[typography.body, { color: c.text }, { textAlign: 'center', marginTop: spacing.xl }]}>
            Sin incidencias registradas.
          </Text>
        }
      />
    </Screen>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
});
