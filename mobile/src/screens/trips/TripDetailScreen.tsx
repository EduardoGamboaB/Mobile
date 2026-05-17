import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { StatusChip } from '@/components/common/StatusChip';
import { LogbookTimeline } from '@/components/logbook/LogbookTimeline';
import { useTrip, useAdvanceTripStatus } from '@/hooks/useTrips';
import { useLogbook } from '@/hooks/useLogbook';
import { nextStatus, TripStatusLabel } from '@/constants/enums';
import { colors, spacing, typography } from '@/theme';
import type { AppNav, AppStackParamList } from '@/navigation/types';

export function TripDetailScreen() {
  const route = useRoute<RouteProp<AppStackParamList, 'TripDetail'>>();
  const nav = useNavigation<AppNav<'TripDetail'>>();
  const { tripId } = route.params;
  const { data: trip, isLoading } = useTrip(tripId);
  const { data: logbook } = useLogbook(tripId);
  const advance = useAdvanceTripStatus(tripId);

  if (isLoading || !trip) {
    return (
      <Screen>
        <Text style={typography.body}>Cargando viaje…</Text>
      </Screen>
    );
  }

  const next = nextStatus[trip.status];

  const onAdvance = () => {
    if (!next) return;
    Alert.alert(
      'Confirmar',
      `¿Marcar el viaje como ${TripStatusLabel[next]}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí',
          onPress: () => {
            advance.mutate(next, {
              onError: (e) => {
                const msg = e instanceof Error ? e.message : String(e);
                Alert.alert('No se pudo actualizar', msg);
              },
            });
          },
        },
      ],
    );
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={styles.headerRow}>
          <Text style={styles.folio}>{trip.folio}</Text>
          <StatusChip status={trip.status} />
        </View>
        <Text style={styles.client}>{trip.client_name}</Text>

        <Card>
          <Text style={styles.section}>RUTA</Text>
          <Text style={typography.body}>{trip.origin}</Text>
          <Text style={styles.arrow}>↓</Text>
          <Text style={typography.body}>{trip.destination}</Text>
          {trip.cargo ? <Text style={styles.meta}>Carga: {trip.cargo}</Text> : null}
          {trip.tons ? <Text style={styles.meta}>Toneladas: {trip.tons}</Text> : null}
        </Card>

        <Card>
          <Text style={styles.section}>FECHAS</Text>
          {trip.load_date ? (
            <Text style={styles.meta}>
              Carga: {new Date(trip.load_date).toLocaleString()}
            </Text>
          ) : null}
          {trip.estimated_unload_date ? (
            <Text style={styles.meta}>
              ETA descarga: {new Date(trip.estimated_unload_date).toLocaleString()}
            </Text>
          ) : null}
        </Card>

        <Card>
          <Text style={styles.section}>IMPORTES</Text>
          {trip.price_per_ton != null ? (
            <Text style={styles.meta}>Precio/ton: ${trip.price_per_ton.toFixed(2)}</Text>
          ) : null}
          {trip.total_amount != null ? (
            <Text style={styles.meta}>Importe total: ${trip.total_amount.toFixed(2)}</Text>
          ) : null}
          {trip.driver_commission != null ? (
            <Text style={styles.meta}>Tu comisión: ${trip.driver_commission.toFixed(2)}</Text>
          ) : null}
          {trip.estimated_tolls != null ? (
            <Text style={styles.meta}>Casetas estimadas: ${trip.estimated_tolls.toFixed(2)}</Text>
          ) : null}
          {trip.estimated_diesel != null ? (
            <Text style={styles.meta}>Diesel estimado: ${trip.estimated_diesel.toFixed(2)}</Text>
          ) : null}
        </Card>

        {next ? (
          <Button
            title={`MARCAR ${TripStatusLabel[next].toUpperCase()}`}
            onPress={onAdvance}
            loading={advance.isPending}
          />
        ) : null}

        <View style={{ height: spacing.md }} />

        <View style={styles.actionRow}>
          <Button
            title="+ BITÁCORA"
            variant="secondary"
            onPress={() => nav.navigate('LogbookCreate', { tripId })}
            style={{ flex: 1 }}
            fullWidth={false}
          />
          <View style={{ width: spacing.sm }} />
          <Button
            title="+ EVIDENCIA"
            variant="secondary"
            onPress={() => nav.navigate('EvidenceUpload', { tripId })}
            style={{ flex: 1 }}
            fullWidth={false}
          />
          <View style={{ width: spacing.sm }} />
          <Button
            title="⚠"
            variant="danger"
            onPress={() => nav.navigate('IncidentCreate', { tripId })}
            style={{ flex: 0.5 }}
            fullWidth={false}
          />
        </View>

        <Text style={styles.sectionTitle}>BITÁCORA</Text>
        <LogbookTimeline entries={logbook ?? []} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  folio: { ...typography.label },
  client: { ...typography.h2, marginVertical: spacing.sm },
  section: { ...typography.label, marginBottom: spacing.sm },
  meta: { ...typography.body, marginTop: spacing.xs },
  arrow: { color: colors.muted, marginVertical: spacing.xs, fontSize: 18 },
  sectionTitle: { ...typography.h3, marginTop: spacing.xl, marginBottom: spacing.md },
  actionRow: { flexDirection: 'row', marginTop: spacing.md },
});
