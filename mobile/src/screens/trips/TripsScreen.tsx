import React from 'react';
import { FlatList, Text, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { TripCard } from '@/components/trip/TripCard';
import { useActiveTrips } from '@/hooks/useTrips';
import { colors, spacing, typography } from '@/theme';
import type { TabNav } from '@/navigation/types';

export function TripsScreen() {
  const nav = useNavigation<TabNav<'Trips'>>();
  const { data, isRefetching, refetch } = useActiveTrips();

  return (
    <Screen padded={false}>
      <FlatList
        contentContainerStyle={{ padding: spacing.lg }}
        data={data ?? []}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TripCard trip={item} onPress={() => nav.navigate('TripDetail', { tripId: item.id })} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.text}
          />
        }
        ListEmptyComponent={
          <Text style={[typography.body, { textAlign: 'center', marginTop: spacing.xl }]}>
            No tienes viajes activos.
          </Text>
        }
      />
    </Screen>
  );
}
