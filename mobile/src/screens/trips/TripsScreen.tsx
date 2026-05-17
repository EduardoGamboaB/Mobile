import React, { useState } from 'react';
import { FlatList, Text, View, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { TripCard } from '@/components/trip/TripCard';
import { Chip } from '@/components/common/Chip';
import { IconTile } from '@/components/common/IconTile';
import { SearchIcon } from '@/components/icons';
import { useActiveTrips } from '@/hooks/useTrips';
import { colors, spacing, typography } from '@/theme';
import type { TabNav } from '@/navigation/types';
import type { Trip } from '@/models';

type Tab = 'active' | 'scheduled';

export function TripsScreen() {
  const nav = useNavigation<TabNav<'Trips'>>();
  const { data, isRefetching, refetch } = useActiveTrips();
  const [tab, setTab] = useState<Tab>('active');

  const active = (data ?? []).filter((t: Trip) => t.status !== 'scheduled');
  const scheduled = (data ?? []).filter((t: Trip) => t.status === 'scheduled');
  const list = tab === 'active' ? active : scheduled;

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={typography.h1}>Viajes</Text>
        <IconTile tone="navy">
          <SearchIcon color={colors.navy} />
        </IconTile>
      </View>
      <View style={styles.tabs}>
        <Pressable onPress={() => setTab('active')}>
          <Chip
            label={`Activos · ${active.length}`}
            variant={tab === 'active' ? 'navy' : 'gray'}
          />
        </Pressable>
        <Pressable onPress={() => setTab('scheduled')}>
          <Chip
            label={`Programados · ${scheduled.length}`}
            variant={tab === 'scheduled' ? 'navy' : 'gray'}
          />
        </Pressable>
      </View>
      <FlatList
        contentContainerStyle={styles.list}
        data={list}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TripCard
            trip={item}
            highlight={item.status === 'in_transit' || item.status === 'loading'}
            onPress={() => nav.navigate('TripDetail', { tripId: item.id })}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.navy} />
        }
        ListEmptyComponent={
          <Text style={[typography.body, { textAlign: 'center', marginTop: spacing.xl }]}>
            {tab === 'active' ? 'Sin viajes activos.' : 'Sin viajes programados.'}
          </Text>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg + 4,
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg + 4, marginBottom: spacing.md },
  list: { paddingHorizontal: spacing.lg + 4, paddingBottom: spacing.xl },
});
