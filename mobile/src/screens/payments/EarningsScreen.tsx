import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Polyline, Polygon } from 'react-native-svg';
import { Screen } from '@/components/common/Screen';
import { AppBar } from '@/components/common/AppBar';
import { Card } from '@/components/common/Card';
import { Chip } from '@/components/common/Chip';
import { IconTile, tileIconColor } from '@/components/common/IconTile';
import {
  FilterIcon,
  TrendingUpIcon,
  CheckCircleIcon,
  FuelIcon,
  AlertIcon,
  CreditCardIcon,
  ClockIcon,
} from '@/components/icons';
import { demoStore } from '@/demo';
import { colors, radius, spacing, typography } from '@/theme';
import type { DemoPayment } from '@/demo/data';
import type { AppNav } from '@/navigation/types';

const fmt = (n: number) =>
  '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export function EarningsScreen() {
  const nav = useNavigation<AppNav<'Earnings'>>();
  const [payments, setPayments] = useState<DemoPayment[]>([]);

  useEffect(() => {
    demoStore.listPayments().then(setPayments);
  }, []);

  const released = payments.filter((p) => p.status === 'released');
  const pending = payments.filter((p) => p.status === 'pending');
  const total = payments.reduce((s, p) => s + p.amount, 0);
  const releasedTotal = released.reduce((s, p) => s + p.amount, 0);
  const pendingTotal = pending.reduce((s, p) => s + p.amount, 0);

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg + 4, paddingBottom: spacing.xxl }}>
        <View style={styles.headerRow}>
          <Text style={typography.h1}>Mis ingresos</Text>
          <IconTile tone="navy">
            <FilterIcon color={colors.navy} />
          </IconTile>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>MAYO 2026</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amount}>{fmt(total)}</Text>
            <View style={styles.delta}>
              <TrendingUpIcon size={12} color="#86EFAC" />
              <Text style={styles.deltaText}>+12%</Text>
            </View>
          </View>
          <Text style={styles.heroBody}>
            {payments.length} viajes · Cobrados {fmt(releasedTotal)} · Pendientes {fmt(pendingTotal)}
          </Text>

          {/* Sparkline */}
          <Svg width="100%" height={60} viewBox="0 0 320 60" style={{ marginTop: spacing.md }}>
            <Polygon
              points="0,40 40,32 80,38 120,22 160,28 200,16 240,20 280,8 320,12 320,60 0,60"
              fill="rgba(255,255,255,0.12)"
            />
            <Polyline
              points="0,40 40,32 80,38 120,22 160,28 200,16 240,20 280,8 320,12"
              fill="none"
              stroke="#fff"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>

        <Text style={[typography.eyebrow, { marginBottom: spacing.sm + 2 }]}>Mi desempeño</Text>
        <View style={styles.scoreRow}>
          <Score icon={<CheckCircleIcon size={22} color={colors.blue} />} value="97%" label="A tiempo" />
          <Score icon={<FuelIcon size={22} color={colors.blue} />} value="3.2" label="km/L" />
          <Score icon={<AlertIcon size={22} color={colors.blue} />} value="0" label="Incidentes" />
        </View>

        <View style={styles.sectionHead}>
          <Text style={typography.eyebrow}>Últimos pagos</Text>
          <Pressable onPress={() => nav.navigate('PaymentsHistory')}>
            <Text style={styles.link}>Ver todo</Text>
          </Pressable>
        </View>
        <Card variant="flat" padding={0}>
          {payments.slice(0, 3).map((p, idx, arr) => {
            const isLast = idx === arr.length - 1;
            const releasedColor = p.status === 'released';
            return (
              <Pressable
                key={p.id}
                onPress={() => nav.navigate('PaymentDetail', { paymentId: p.id })}
                style={[styles.payRow, isLast && styles.lastRow]}
              >
                <IconTile tone={releasedColor ? 'success' : 'amber'}>
                  {releasedColor ? (
                    <CreditCardIcon color={tileIconColor('success')} />
                  ) : (
                    <ClockIcon color={tileIconColor('amber')} />
                  )}
                </IconTile>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={typography.bodyStrong}>
                    {p.tripFolio} · {p.client}
                  </Text>
                  <Text style={typography.caption}>
                    {releasedColor ? 'Liberado' : 'En proceso'} ·{' '}
                    {new Date(p.releasedAt ?? p.tripDate).toLocaleDateString('es-MX', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </Text>
                </View>
                <Text style={[styles.payAmount, { color: releasedColor ? colors.success : colors.warning }]}>
                  {releasedColor ? '+' : ''}{fmt(p.amount)}
                </Text>
              </Pressable>
            );
          })}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Score({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <Card style={styles.scoreCard}>
      {icon}
      <Text style={[typography.h2, { marginTop: 6 }]}>{value}</Text>
      <Text style={[typography.caption, { fontSize: 11 }]}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md + 2,
  },
  heroCard: {
    backgroundColor: colors.navy,
    borderRadius: radius.card,
    padding: spacing.lg + 4,
    marginBottom: spacing.md + 2,
  },
  heroEyebrow: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  amountRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6 },
  amount: { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(22,163,74,0.25)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  deltaText: { color: '#86EFAC', fontSize: 12, fontWeight: '700' },
  heroBody: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 6 },
  scoreRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md + 2 },
  scoreCard: { flex: 1, alignItems: 'center', padding: spacing.md + 2, marginBottom: 0 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
  },
  link: { color: colors.blue, fontWeight: '600', fontSize: 13 },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lastRow: { borderBottomWidth: 0 },
  payAmount: { fontSize: 15, fontWeight: '800' },
});
