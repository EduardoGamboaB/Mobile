import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { AppBar } from '@/components/common/AppBar';
import { Card } from '@/components/common/Card';
import { Chip } from '@/components/common/Chip';
import { IconTile, tileIconColor } from '@/components/common/IconTile';
import { CreditCardIcon, ClockIcon, AlertIcon } from '@/components/icons';
import { demoStore } from '@/demo';
import { useColors, spacing, typography } from '@/theme';
import type { ColorPalette } from '@/theme';
import type { DemoPayment, PaymentStatus } from '@/demo/data';
import type { AppNav } from '@/navigation/types';

type Tab = 'all' | 'released' | 'pending' | 'held';

const fmt = (n: number) =>
  '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const statusLabel = (s: PaymentStatus) =>
  s === 'released' ? 'Liberado' : s === 'pending' ? 'En proceso' : 'Retenido';

const monthKey = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

export function PaymentsHistoryScreen() {
  const c = useColors();
  const styles = makeStyles(c);
  const nav = useNavigation<AppNav<'PaymentsHistory'>>();
  const [payments, setPayments] = useState<DemoPayment[]>([]);
  const [tab, setTab] = useState<Tab>('all');

  useEffect(() => {
    demoStore.listPayments().then(setPayments);
  }, []);

  const filtered = useMemo(() => {
    if (tab === 'all') return payments;
    return payments.filter((p) => p.status === tab);
  }, [payments, tab]);

  const totals = useMemo(() => {
    const released = payments.filter((p) => p.status === 'released');
    const sum = released.reduce((s, p) => s + p.amount, 0);
    const months = new Set(payments.map((p) => monthKey(p.tripDate))).size || 1;
    return { sum, avg: sum / months };
  }, [payments]);

  const grouped = useMemo(() => {
    const groups: Record<string, DemoPayment[]> = {};
    filtered
      .sort((a, b) => b.tripDate.localeCompare(a.tripDate))
      .forEach((p) => {
        const k = monthKey(p.tripDate);
        groups[k] ??= [];
        groups[k].push(p);
      });
    return Object.entries(groups);
  }, [filtered]);

  return (
    <Screen padded={false}>
      <View style={{ padding: spacing.lg + 4 }}>
        <AppBar title="Historial de pagos" />
        <View style={styles.tabs}>
          <TabChip label={`Todos · ${payments.length}`} active={tab === 'all'} onPress={() => setTab('all')} />
          <TabChip
            label={`Liberados · ${payments.filter((p) => p.status === 'released').length}`}
            active={tab === 'released'}
            onPress={() => setTab('released')}
          />
          <TabChip
            label={`Pendientes · ${payments.filter((p) => p.status === 'pending').length}`}
            active={tab === 'pending'}
            onPress={() => setTab('pending')}
          />
          <TabChip
            label={`Retenidos · ${payments.filter((p) => p.status === 'held').length}`}
            active={tab === 'held'}
            onPress={() => setTab('held')}
          />
        </View>
        <Card>
          <View style={styles.totalsRow}>
            <View>
              <Text style={[typography.caption, { color: c.muted }]}>Acumulado · año</Text>
              <Text style={[typography.h2, { color: c.text }]}>{fmt(totals.sum)}</Text>
            </View>
            <View>
              <Text style={[typography.caption, { color: c.muted }, { textAlign: 'right' }]}>Promedio mes</Text>
              <Text style={[typography.h2, { color: c.text }, { textAlign: 'right' }]}>{fmt(totals.avg)}</Text>
            </View>
          </View>
        </Card>
      </View>

      <FlatList
        contentContainerStyle={{ paddingHorizontal: spacing.lg + 4, paddingBottom: spacing.xxl }}
        data={grouped}
        keyExtractor={(g) => g[0]}
        renderItem={({ item: [month, items] }) => (
          <View>
            <Text style={[typography.eyebrow, { color: c.muted }, { marginTop: spacing.md, marginBottom: spacing.sm }]}>
              {month}
            </Text>
            <Card variant="flat" padding={0}>
              {items.map((p, idx) => (
                <Pressable
                  key={p.id}
                  onPress={() => nav.navigate('PaymentDetail', { paymentId: p.id })}
                  style={[
                    styles.row,
                    idx === items.length - 1 && styles.lastRow,
                  ]}
                >
                  <IconTile
                    tone={p.status === 'released' ? 'success' : p.status === 'pending' ? 'amber' : 'danger'}
                  >
                    {p.status === 'released' ? (
                      <CreditCardIcon color={tileIconColor('success')} />
                    ) : p.status === 'pending' ? (
                      <ClockIcon color={tileIconColor('amber')} />
                    ) : (
                      <AlertIcon color={tileIconColor('danger')} />
                    )}
                  </IconTile>
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={[typography.bodyStrong, { color: c.text }]}>{p.tripFolio}</Text>
                    <Text style={[typography.caption, { color: c.muted }]}>
                      {p.client} ·{' '}
                      {new Date(p.tripDate).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={[
                        typography.bodyStrong,
                        {
                          color:
                            p.status === 'released'
                              ? c.success
                              : p.status === 'pending'
                                ? c.warning
                                : c.danger,
                        },
                      ]}
                    >
                      {p.status === 'released' ? '+' : ''}
                      {fmt(p.amount)}
                    </Text>
                    <Text style={[typography.caption, { color: c.muted }]}>{statusLabel(p.status)}</Text>
                  </View>
                </Pressable>
              ))}
            </Card>
          </View>
        )}
      />
    </Screen>
  );
}

function TabChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Chip label={label} variant={active ? 'navy' : 'gray'} />
    </Pressable>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  tabs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  lastRow: { borderBottomWidth: 0 },
});
