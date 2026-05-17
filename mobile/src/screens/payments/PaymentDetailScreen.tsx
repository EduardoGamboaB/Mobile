import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { AppBar } from '@/components/common/AppBar';
import { Card } from '@/components/common/Card';
import { Chip } from '@/components/common/Chip';
import { Button } from '@/components/common/Button';
import { FileIcon } from '@/components/icons';
import { demoStore } from '@/demo';
import { colors, radius, spacing, typography } from '@/theme';
import type { DemoPayment } from '@/demo/data';
import type { AppStackParamList } from '@/navigation/types';

const fmt = (n: number) =>
  '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusVariant = (s: DemoPayment['status']) =>
  s === 'released' ? 'green' : s === 'pending' ? 'amber' : 'red';

const statusLabel = (s: DemoPayment['status']) =>
  s === 'released' ? 'Liberado' : s === 'pending' ? 'En proceso' : 'Retenido';

export function PaymentDetailScreen() {
  const route = useRoute<RouteProp<AppStackParamList, 'PaymentDetail'>>();
  const [payment, setPayment] = useState<DemoPayment | null>(null);

  useEffect(() => {
    demoStore.getPayment(route.params.paymentId).then(setPayment);
  }, [route.params.paymentId]);

  if (!payment) {
    return (
      <Screen>
        <Text style={typography.body}>Cargando…</Text>
      </Screen>
    );
  }

  const isReleased = payment.status === 'released';
  const heroBg = isReleased
    ? colors.success
    : payment.status === 'pending'
      ? colors.warning
      : colors.danger;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg + 4, paddingBottom: spacing.xxl }}>
        <AppBar title="Detalle de pago" />

        <View style={styles.chipsRow}>
          <Chip label={statusLabel(payment.status)} variant={statusVariant(payment.status)} />
          <Chip label={payment.tripFolio} variant="gray" />
        </View>
        <Text style={typography.h2}>{payment.client}</Text>
        <Text style={typography.small}>
          {payment.origin} → {payment.destination} ·{' '}
          {new Date(payment.tripDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>

        <View style={[styles.heroCard, { backgroundColor: heroBg }]}>
          <Text style={styles.heroEyebrow}>
            {isReleased ? 'DEPOSITADO' : payment.status === 'pending' ? 'POR LIBERAR' : 'RETENIDO'}
          </Text>
          <Text style={styles.amount}>{fmt(payment.amount)}</Text>
          {payment.releasedAt ? (
            <Text style={styles.heroSub}>
              {new Date(payment.releasedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} ·{' '}
              {payment.bank ?? '—'}
            </Text>
          ) : (
            <Text style={styles.heroSub}>
              {payment.status === 'pending'
                ? '3-5 días hábiles después de validar la POD'
                : 'Contacta a administración'}
            </Text>
          )}
        </View>

        <Card>
          <Text style={typography.eyebrow}>Desglose</Text>
          <Row label="Importe del viaje" value={fmt(payment.grossAmount)} />
          <View style={styles.hr} />
          <Row label="Anticipo de diesel" value={'− ' + fmt(payment.advances)} />
          <Row label="Casetas comprobadas" value={'− ' + fmt(payment.tolls)} />
          <View style={styles.hr} />
          <Row
            label="Comisión chofer"
            value={fmt(payment.amount)}
            strong
          />
        </Card>

        <Button
          title="Descargar recibo PDF"
          variant="outline"
          leftIcon={<FileIcon size={20} color={colors.navy} />}
          onPress={() => Alert.alert('Próximamente', 'Descarga del recibo PDF.')}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={typography.small}>{label}</Text>
      <Text style={[typography.body, strong && { fontSize: 18, fontWeight: '700', color: colors.blue }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chipsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm + 2 },
  heroCard: {
    borderRadius: radius.card,
    padding: spacing.lg + 4,
    marginTop: spacing.md + 2,
    marginBottom: spacing.md,
  },
  heroEyebrow: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  amount: { color: '#fff', fontSize: 36, fontWeight: '900', marginTop: 4, letterSpacing: -0.5 },
  heroSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  hr: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, marginVertical: spacing.sm + 2 },
});
