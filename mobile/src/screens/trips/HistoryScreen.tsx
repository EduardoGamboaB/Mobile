import React from 'react';
import { FlatList, Text, View, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { Card } from '@/components/common/Card';
import { Chip } from '@/components/common/Chip';
import { IconTile, tileIconColor } from '@/components/common/IconTile';
import { CheckCircleIcon, FilterIcon, XIcon } from '@/components/icons';
import { useTripHistory } from '@/hooks/useTrips';
import { useColors, spacing, typography } from '@/theme';
import type { ColorPalette } from '@/theme';
import type { TabNav } from '@/navigation/types';

export function HistoryScreen() {
  const c = useColors();
  const styles = makeStyles(c);
  const nav = useNavigation<TabNav<'History'>>();
  const { data, isRefetching, refetch } = useTripHistory();

  const finished = (data ?? []).filter((t) => t.status === 'finished');
  const totalEarnings = finished.reduce((s, t) => s + (t.driver_commission ?? 0), 0);

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={[typography.h1, { color: c.text }]}>Historial</Text>
        <IconTile tone="navy">
          <FilterIcon color={c.navy} />
        </IconTile>
      </View>

      <View style={{ paddingHorizontal: spacing.lg + 4 }}>
        <Card>
          <View style={styles.summary}>
            <View>
              <Text style={[typography.caption, { color: c.muted }]}>Este mes</Text>
              <Text style={[typography.h2, { color: c.text }]}>
                ${totalEarnings.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </Text>
            </View>
            <View>
              <Text style={[typography.caption, { color: c.muted }, { textAlign: 'right' }]}>Viajes</Text>
              <Text style={[typography.h2, { color: c.text }, { textAlign: 'right' }]}>{finished.length}</Text>
            </View>
          </View>
        </Card>
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={data ?? []}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => {
          const isFinished = item.status === 'finished';
          return (
            <Pressable
              onPress={() => nav.navigate('TripDetail', { tripId: item.id })}
              style={styles.row}
            >
              <IconTile tone={isFinished ? 'success' : 'navy'}>
                {isFinished ? (
                  <CheckCircleIcon color={tileIconColor('success')} />
                ) : (
                  <XIcon color={tileIconColor('navy')} />
                )}
              </IconTile>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.bodyStrong, { color: c.text }]}>{item.client_name}</Text>
                <Text style={[typography.caption, { color: c.muted }]}>
                  {item.origin.split(',')[0]} → {item.destination.split(',')[0]} ·{' '}
                  {item.finished_at
                    ? new Date(item.finished_at).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                      })
                    : '—'}
                </Text>
              </View>
              {isFinished ? (
                <Text style={styles.earning}>
                  +${item.driver_commission?.toLocaleString('es-MX') ?? '—'}
                </Text>
              ) : (
                <Chip label="Cancelado" variant="gray" />
              )}
            </Pressable>
          );
        }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.navy} />
        }
        ListEmptyComponent={
          <Text style={[typography.body, { color: c.text }, { textAlign: 'center', marginTop: spacing.xl }]}>
            Sin historial.
          </Text>
        }
      />
    </Screen>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg + 4,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  list: { paddingHorizontal: spacing.lg + 4, paddingBottom: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md + 2,
    backgroundColor: c.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: spacing.sm,
  },
  earning: { fontWeight: '700', color: c.success, fontSize: 15 },
});
