import React from 'react';
import { FlatList, Text, View, StyleSheet } from 'react-native';
import { Screen } from '@/components/common/Screen';
import { Card } from '@/components/common/Card';
import { useMyIncidents } from '@/hooks/useIncidents';
import { IncidentTypeLabel, IncidentUrgencyLabel } from '@/constants/enums';
import { colors, radius, spacing, typography } from '@/theme';

export function IncidentListScreen() {
  const { data } = useMyIncidents();

  return (
    <Screen padded={false}>
      <FlatList
        contentContainerStyle={{ padding: spacing.lg }}
        data={data ?? []}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <Text style={typography.bodyStrong}>{IncidentTypeLabel[item.type]}</Text>
              <View style={[styles.pill, item.resolved ? styles.ok : styles.bad]}>
                <Text style={styles.pillText}>
                  {item.resolved ? 'RESUELTA' : IncidentUrgencyLabel[item.urgency].toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={typography.small}>{new Date(item.occurred_at).toLocaleString()}</Text>
            <Text style={[typography.body, { marginTop: spacing.xs }]}>{item.description}</Text>
            {item.location_text ? (
              <Text style={typography.small}>📍 {item.location_text}</Text>
            ) : null}
          </Card>
        )}
        ListEmptyComponent={
          <Text style={[typography.body, { textAlign: 'center', marginTop: spacing.xl }]}>
            Sin incidencias registradas.
          </Text>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  ok: { backgroundColor: colors.success },
  bad: { backgroundColor: colors.danger },
  pillText: { color: colors.text, fontSize: 10, fontWeight: '800' },
});
