import React from 'react';
import { View, Text, StyleSheet, RefreshControl, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Chip } from '@/components/common/Chip';
import { IconTile, tileIconColor } from '@/components/common/IconTile';
import { EmptyState } from '@/components/common/EmptyState';
import {
  BellIcon,
  MapPinIcon,
  ArrowDownIcon,
  PlusIcon,
  AlertIcon,
  TruckIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  PackageIcon,
  RefreshIcon,
  CompassIcon,
  MessageIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  QrIcon,
  AlertOctagonIcon,
} from '@/components/icons';
import { useActiveTrips, useTripHistory } from '@/hooks/useTrips';
import { useAuthStore } from '@/stores/auth';
import { colors, spacing, typography } from '@/theme';
import { TripStatusLabel, nextStatus } from '@/constants/enums';
import { demoStore } from '@/demo';
import type { TabNav } from '@/navigation/types';

export function DashboardScreen() {
  const nav = useNavigation<TabNav<'Dashboard'>>();
  const profile = useAuthStore((s) => s.profile);
  const active = useActiveTrips();
  const history = useTripHistory();

  const current = active.data?.[0];
  const next = current ? nextStatus[current.status] : null;
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Chofer';
  const unreadCount = demoStore.unreadCount();

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg + 4, paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl
            refreshing={active.isRefetching}
            onRefresh={() => {
              active.refetch();
              history.refetch();
            }}
            tintColor={colors.navy}
          />
        }
      >
        <View style={styles.greetRow}>
          <View>
            <Text style={typography.small}>Buen día</Text>
            <Text style={typography.h2}>{firstName}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Pressable onPress={() => nav.navigate('QrScanner')}>
              <IconTile tone="navy">
                <QrIcon color={colors.navy} />
              </IconTile>
            </Pressable>
            <Pressable onPress={() => nav.navigate('Notifications')}>
              <View>
                <IconTile tone="navy">
                  <BellIcon color={colors.navy} />
                </IconTile>
                {unreadCount > 0 ? <View style={styles.badge} /> : null}
              </View>
            </Pressable>
          </View>
        </View>

        {current ? (
          <>
            <Pressable onPress={() => nav.navigate('TripDetail', { tripId: current.id })}>
              <View style={styles.heroCard}>
                <View style={styles.heroHeader}>
                  <Chip label={TripStatusLabel[current.status]} variant="white" />
                  <Text style={styles.heroFolio}>{current.folio}</Text>
                </View>
                <Text style={styles.heroClient}>{current.client_name}</Text>
                <View style={styles.heroRow}>
                  <MapPinIcon size={16} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.heroRoute}>{current.origin}</Text>
                </View>
                <View style={styles.heroRow}>
                  <View style={{ width: 16, alignItems: 'center' }}>
                    <ArrowDownIcon size={14} color={colors.blueLight} />
                  </View>
                  <Text style={styles.heroRoute}>{current.destination}</Text>
                </View>
                {current.estimated_unload_date ? (
                  <View style={styles.heroFoot}>
                    <Text style={styles.heroFootLabel}>ETA descarga</Text>
                    <Text style={styles.heroFootValue}>
                      {new Date(current.estimated_unload_date).toLocaleString()}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Pressable>

            <View style={styles.quickActions}>
              <Button
                title="Bitácora"
                leftIcon={<PlusIcon size={18} color="#fff" />}
                onPress={() => nav.navigate('LogbookCreate', { tripId: current.id })}
                style={{ flex: 1, height: 64, flexDirection: 'column' as const }}
                fullWidth={false}
              />
              <View style={{ width: spacing.sm + 2 }} />
              <Button
                title="Incidencia"
                variant="danger"
                leftIcon={<AlertIcon size={18} color="#fff" />}
                onPress={() => nav.navigate('IncidentCreate', { tripId: current.id })}
                style={{ flex: 1, height: 64, flexDirection: 'column' as const }}
                fullWidth={false}
              />
            </View>

            {/* Atajos del viaje activo */}
            <View style={styles.tripShortcuts}>
              <Shortcut
                icon={<CompassIcon color={tileIconColor('blue')} />}
                label="Mapa"
                onPress={() => nav.navigate('MapRoute', { tripId: current.id })}
              />
              <Shortcut
                icon={<MessageIcon color={tileIconColor('blue')} />}
                label="Chat"
                onPress={() => nav.navigate('ChatList')}
              />
              <Shortcut
                icon={<ShieldCheckIcon color={tileIconColor('blue')} />}
                label="Inspección"
                onPress={() => nav.navigate('PreTripInspection')}
              />
              <Shortcut
                icon={<AlertOctagonIcon color={tileIconColor('danger')} />}
                label="SOS"
                tone="danger"
                onPress={() => nav.navigate('Sos')}
              />
            </View>

            {next ? (
              <>
                <View style={styles.sectionHead}>
                  <Text style={typography.h3}>Próximo paso</Text>
                  <Chip label="Siguiente" variant="blue" />
                </View>
                <Card
                  onPress={() => nav.navigate('TripDetail', { tripId: current.id })}
                  style={styles.nextStep}
                >
                  <IconTile tone="blue">
                    <PackageIcon color={tileIconColor('blue')} />
                  </IconTile>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={typography.bodyStrong}>
                      Marcar {TripStatusLabel[next].toLowerCase()}
                    </Text>
                    <Text style={typography.caption}>
                      Al llegar a {current.destination.split(',')[0]}
                    </Text>
                  </View>
                  <ChevronRightIcon size={20} color={colors.muted} />
                </Card>
              </>
            ) : null}
          </>
        ) : (
          <EmptyState
            icon={(c) => <TruckIcon size={28} color={c} />}
            title="No tienes viaje activo"
            body="Despacho te asignará tu próximo viaje en breve. Te avisaremos por notificación."
            action={
              <Button
                title="Actualizar"
                variant="outline"
                size="sm"
                leftIcon={<RefreshIcon size={16} color={colors.navy} />}
                fullWidth={false}
                onPress={() => active.refetch()}
              />
            }
          />
        )}

        {/* Mis ingresos — acceso destacado */}
        <Pressable onPress={() => nav.navigate('Earnings')}>
          <Card style={styles.earningsRow}>
            <IconTile tone="success">
              <CreditCardIcon color={tileIconColor('success')} />
            </IconTile>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={typography.bodyStrong}>Mis ingresos</Text>
              <Text style={typography.caption}>Ver desempeño y pagos del mes</Text>
            </View>
            <ChevronRightIcon size={20} color={colors.muted} />
          </Card>
        </Pressable>

        <View style={styles.sectionHead}>
          <Text style={typography.h3}>Últimos viajes</Text>
          <Pressable onPress={() => nav.navigate('History' as never)}>
            <Text style={styles.linkBlue}>Ver todo</Text>
          </Pressable>
        </View>
        <Card variant="flat" padding={0}>
          {(history.data ?? []).slice(0, 3).map((trip, idx, arr) => {
            const isFinished = trip.status === 'finished';
            return (
              <Pressable
                key={trip.id}
                onPress={() => nav.navigate('TripDetail', { tripId: trip.id })}
                style={[
                  styles.lastTripRow,
                  idx === arr.length - 1 ? styles.lastRow : null,
                ]}
              >
                <IconTile tone={isFinished ? 'success' : 'navy'}>
                  <CheckCircleIcon color={tileIconColor(isFinished ? 'success' : 'navy')} />
                </IconTile>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={typography.bodyStrong}>{trip.client_name}</Text>
                  <Text style={typography.caption}>
                    {trip.folio} ·{' '}
                    {trip.finished_at
                      ? new Date(trip.finished_at).toLocaleDateString()
                      : '—'}
                  </Text>
                </View>
                <Chip
                  label={isFinished ? 'OK' : 'Cancelado'}
                  variant={isFinished ? 'green' : 'gray'}
                />
              </Pressable>
            );
          })}
          {(history.data?.length ?? 0) === 0 ? (
            <Text style={[typography.small, { textAlign: 'center', padding: spacing.lg }]}>
              Sin historial todavía.
            </Text>
          ) : null}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Shortcut({
  icon,
  label,
  onPress,
  tone = 'blue',
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  tone?: 'blue' | 'danger';
}) {
  return (
    <Pressable onPress={onPress} style={styles.shortcut}>
      <IconTile tone={tone} size="md">
        {icon}
      </IconTile>
      <Text style={styles.shortcutLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  greetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  heroCard: {
    backgroundColor: colors.navy,
    borderRadius: 18,
    padding: spacing.lg + 4,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroFolio: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  heroClient: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 8, marginBottom: spacing.sm },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  heroRoute: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  heroFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  heroFootLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  heroFootValue: { color: '#fff', fontSize: 12, fontWeight: '700' },
  quickActions: { flexDirection: 'row', marginTop: spacing.md + 2 },
  tripShortcuts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  shortcut: { alignItems: 'center', gap: 4, flex: 1 },
  shortcutLabel: { fontSize: 11, fontWeight: '600', color: colors.text },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.sm + 2,
  },
  nextStep: { flexDirection: 'row', alignItems: 'center' },
  linkBlue: { color: colors.blue, fontSize: 13, fontWeight: '600' },
  lastTripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lastRow: { borderBottomWidth: 0 },
  earningsRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg },
});
