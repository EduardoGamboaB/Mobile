import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Chip } from '@/components/common/Chip';
import { IconTile, tileIconColor } from '@/components/common/IconTile';
import { AppBar } from '@/components/common/AppBar';
import { LogbookTimeline } from '@/components/logbook/LogbookTimeline';
import {
  MapPinIcon,
  FlagIcon,
  PlusIcon,
  CameraIcon,
  AlertIcon,
  ArrowRightIcon,
} from '@/components/icons';
import { useTrip, useAdvanceTripStatus } from '@/hooks/useTrips';
import { useLogbook } from '@/hooks/useLogbook';
import { nextStatus, TripStatusLabel } from '@/constants/enums';
import { useColors, spacing, typography } from '@/theme';
import type { ColorPalette } from '@/theme';
import type { AppNav, AppStackParamList } from '@/navigation/types';

export function TripDetailScreen() {
  const c = useColors();
  const styles = makeStyles(c);
  const route = useRoute<RouteProp<AppStackParamList, 'TripDetail'>>();
  const nav = useNavigation<AppNav<'TripDetail'>>();
  const { tripId } = route.params;
  const { data: trip, isLoading } = useTrip(tripId);
  const { data: logbook } = useLogbook(tripId);
  const advance = useAdvanceTripStatus(tripId);

  if (isLoading || !trip) {
    return (
      <Screen background="bg">
        <Text style={[typography.body, { color: c.text }]}>Cargando viaje…</Text>
      </Screen>
    );
  }

  const next = nextStatus[trip.status];

  const onAdvance = () => {
    if (!next) return;
    Alert.alert('Confirmar', `¿Marcar el viaje como ${TripStatusLabel[next]}?`, [
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
    ]);
  };

  return (
    <Screen padded={false} background="bg">
      <ScrollView contentContainerStyle={{ padding: spacing.lg + 4, paddingBottom: spacing.xxl }}>
        <AppBar title={trip.client_name} />

        <View style={{ marginTop: -spacing.sm, marginBottom: spacing.lg, marginLeft: 56 + spacing.md }}>
          <Text style={[typography.eyebrow, { color: c.muted }]}>{trip.folio}</Text>
        </View>

        <View style={styles.chipsRow}>
          <Chip label={TripStatusLabel[trip.status]} variant="blue" />
          {trip.tons ? <Chip label={`${trip.tons} ton`} variant="gray" /> : null}
        </View>

        <Card>
          <Text style={[typography.eyebrow, { color: c.muted }]}>Ruta</Text>
          <View style={styles.routeStep}>
            <IconTile tone="navy" size="sm">
              <MapPinIcon size={18} color={tileIconColor('navy')} />
            </IconTile>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[typography.bodyStrong, { color: c.text }]}>{trip.origin}</Text>
              <Text style={[typography.caption, { color: c.muted }]}>
                Carga ·{' '}
                {trip.load_date ? new Date(trip.load_date).toLocaleString() : '—'}
              </Text>
            </View>
          </View>
          <View style={styles.dashedLine} />
          <View style={styles.routeStep}>
            <IconTile tone="blue" size="sm">
              <FlagIcon size={18} color={tileIconColor('blue')} />
            </IconTile>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[typography.bodyStrong, { color: c.text }]}>{trip.destination}</Text>
              <Text style={[typography.caption, { color: c.muted }]}>
                ETA ·{' '}
                {trip.estimated_unload_date
                  ? new Date(trip.estimated_unload_date).toLocaleString()
                  : '—'}
              </Text>
            </View>
          </View>
        </Card>

        <Card>
          <Text style={[typography.eyebrow, { color: c.muted }]}>Importes</Text>
          {trip.price_per_ton != null ? (
            <Row label="Precio / ton" value={`$${trip.price_per_ton.toFixed(2)}`} />
          ) : null}
          {trip.total_amount != null ? (
            <Row label="Importe total" value={`$${trip.total_amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} />
          ) : null}
          {trip.driver_commission != null ? (
            <Row
              label="Mi comisión"
              value={`$${trip.driver_commission.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
              accent
            />
          ) : null}
          <View style={styles.hr} />
          {trip.estimated_tolls != null ? (
            <Row label="Casetas estim." value={`$${trip.estimated_tolls.toFixed(2)}`} />
          ) : null}
          {trip.estimated_diesel != null ? (
            <Row label="Diesel estim." value={`$${trip.estimated_diesel.toFixed(2)}`} />
          ) : null}
        </Card>

        {next ? (
          <Button
            title={`Marcar ${TripStatusLabel[next].toLowerCase()}`}
            variant="accent"
            rightIcon={<ArrowRightIcon size={18} color="#fff" />}
            onPress={onAdvance}
            loading={advance.isPending}
            style={{ marginTop: spacing.md }}
          />
        ) : null}

        <View style={styles.actionRow}>
          <Button
            title="Bitácora"
            variant="outline"
            size="sm"
            leftIcon={<PlusIcon size={16} color={c.navy} />}
            onPress={() => nav.navigate('LogbookCreate', { tripId })}
            style={{ flex: 1 }}
            fullWidth={false}
          />
          <View style={{ width: spacing.sm }} />
          <Button
            title="Evidencia"
            variant="outline"
            size="sm"
            leftIcon={<CameraIcon size={16} color={c.navy} />}
            onPress={() => nav.navigate('EvidenceUpload', { tripId })}
            style={{ flex: 1 }}
            fullWidth={false}
          />
          <View style={{ width: spacing.sm }} />
          <Button
            title="Incid."
            variant="outline"
            size="sm"
            leftIcon={<AlertIcon size={16} color={c.danger} />}
            onPress={() => nav.navigate('IncidentCreate', { tripId })}
            style={{ flex: 0.7, borderColor: c.danger }}
            fullWidth={false}
          />
        </View>

        <Text style={[typography.eyebrow, { color: c.muted }, { marginTop: spacing.xl, marginBottom: spacing.md }]}>
          Bitácora
        </Text>
        <Card>
          <LogbookTimeline entries={logbook ?? []} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const c = useColors();
  const styles = makeStyles(c);
  return (
    <View style={styles.row}>
      <Text style={[typography.small, { color: c.textSoft }]}>{label}</Text>
      <Text style={[typography.bodyStrong, accent && { color: c.blue }]}>{value}</Text>
    </View>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  chipsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md + 2 },
  routeStep: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs },
  dashedLine: {
    width: 2,
    height: 18,
    backgroundColor: c.border,
    marginLeft: 17,
    marginVertical: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  hr: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, marginVertical: spacing.sm + 2 },
  actionRow: { flexDirection: 'row', marginTop: spacing.sm + 2 },
});
