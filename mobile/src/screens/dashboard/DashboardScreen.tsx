import React from 'react';
import { View, Text, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { StatusChip } from '@/components/common/StatusChip';
import { TripCard } from '@/components/trip/TripCard';
import { useActiveTrips, useTripHistory } from '@/hooks/useTrips';
import { useAuthStore } from '@/stores/auth';
import { colors, spacing, typography } from '@/theme';
import { TripStatusLabel } from '@/constants/enums';
import type { TabNav } from '@/navigation/types';

export function DashboardScreen() {
  const nav = useNavigation<TabNav<'Dashboard'>>();
  const profile = useAuthStore((s) => s.profile);
  const active = useActiveTrips();
  const history = useTripHistory();

  const current = active.data?.[0];

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={active.isRefetching}
            onRefresh={() => {
              active.refetch();
              history.refetch();
            }}
            tintColor={colors.text}
          />
        }
      >
        <Text style={styles.greet}>Hola, {profile?.full_name?.split(' ')[0] ?? 'chofer'} 👋</Text>
        <Text style={styles.subGreet}>
          {profile?.assigned_unit_number
            ? `Unidad ${profile.assigned_unit_number}`
            : 'Sin unidad asignada'}
        </Text>

        {current ? (
          <Card onPress={() => nav.navigate('TripDetail', { tripId: current.id })}>
            <View style={styles.row}>
              <Text style={styles.folio}>{current.folio}</Text>
              <StatusChip status={current.status} />
            </View>
            <Text style={styles.client}>{current.client_name}</Text>
            <Text style={styles.dest}>📍 {current.destination}</Text>
            {current.estimated_unload_date ? (
              <Text style={styles.eta}>
                ETA: {new Date(current.estimated_unload_date).toLocaleString()}
              </Text>
            ) : null}
            <Text style={styles.statusInfo}>
              Estatus actual: {TripStatusLabel[current.status]}
            </Text>
          </Card>
        ) : (
          <Card>
            <Text style={typography.body}>No tienes viaje activo.</Text>
            <Text style={typography.small}>Cuando despacho te asigne uno aparecerá aquí.</Text>
          </Card>
        )}

        <View style={styles.actions}>
          <Button
            title="+ BITÁCORA"
            onPress={() => current && nav.navigate('LogbookCreate', { tripId: current.id })}
            disabled={!current}
            style={{ flex: 1 }}
            fullWidth={false}
          />
          <View style={{ width: spacing.md }} />
          <Button
            title="⚠ INCIDENCIA"
            variant="danger"
            onPress={() => nav.navigate('IncidentCreate', { tripId: current?.id })}
            style={{ flex: 1 }}
            fullWidth={false}
          />
        </View>

        <View style={{ height: spacing.lg }} />
        <Button
          title="Pendientes de sincronizar"
          variant="ghost"
          onPress={() => nav.navigate('PendingSync')}
        />

        <Text style={styles.sectionTitle}>Últimos viajes</Text>
        {history.data?.slice(0, 5).map((trip) => (
          <TripCard
            key={trip.id}
            trip={trip}
            onPress={() => nav.navigate('TripDetail', { tripId: trip.id })}
          />
        ))}
        {(!history.data || history.data.length === 0) && (
          <Text style={typography.small}>Sin historial todavía.</Text>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  greet: { ...typography.h1 },
  subGreet: { ...typography.small, marginBottom: spacing.lg },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  folio: { ...typography.label },
  client: { ...typography.h2, marginBottom: spacing.xs },
  dest: { ...typography.body, marginBottom: spacing.xs },
  eta: { ...typography.small },
  statusInfo: { ...typography.small, marginTop: spacing.sm },
  actions: { flexDirection: 'row', marginTop: spacing.md },
  sectionTitle: { ...typography.h3, marginTop: spacing.xl, marginBottom: spacing.md },
});
