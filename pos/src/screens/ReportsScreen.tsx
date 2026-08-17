import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { salesReport, purchasesReport, type SalesReport, type PurchasesReport } from '@/services/reports';
import { inventorySummary, type InventorySummary } from '@/db/inventory';
import { lowStockProducts } from '@/db/products';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatMoney, formatQty } from '@/utils/money';
import { daysAgo, startOfDay, formatDateShort } from '@/utils/ids';
import { Card, StatTile } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme';
import type { Product } from '@/models/types';

type Tab = 'sales' | 'purchases' | 'inventory';
type Period = 'today' | 'week' | 'month';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: '7 días' },
  { key: 'month', label: '30 días' },
];

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  other: 'Otro',
};

const periodRange = (p: Period): { from: string; to: string } => ({
  from: p === 'today' ? startOfDay() : p === 'week' ? daysAgo(6) : daysAgo(29),
  to: new Date().toISOString(),
});

const ReportsScreen: React.FC = () => {
  const [tab, setTab] = useState<Tab>('sales');
  const [period, setPeriod] = useState<Period>('today');
  const [sales, setSales] = useState<SalesReport | null>(null);
  const [purchases, setPurchases] = useState<PurchasesReport | null>(null);
  const [inventory, setInventory] = useState<InventorySummary | null>(null);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const symbol = useSettingsStore((s) => s.settings.currencySymbol);

  const refresh = useCallback(() => {
    const { from, to } = periodRange(period);
    void salesReport(from, to).then(setSales);
    void purchasesReport(from, to).then(setPurchases);
    void inventorySummary().then(setInventory);
    void lowStockProducts().then(setLowStock);
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={[typography.title, { padding: spacing.md }]}>Reportes</Text>

      <View style={styles.tabs}>
        {(
          [
            { key: 'sales', label: 'Ventas' },
            { key: 'purchases', label: 'Compras' },
            { key: 'inventory', label: 'Inventario' },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <Pressable
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[typography.caption, tab === t.key && { color: colors.accent, fontWeight: '700' }]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab !== 'inventory' && (
        <View style={styles.periods}>
          {PERIODS.map((p) => (
            <Pressable
              key={p.key}
              style={[styles.period, period === p.key && styles.periodActive]}
              onPress={() => setPeriod(p.key)}
            >
              <Text style={[typography.caption, period === p.key && { color: '#fff', fontWeight: '700' }]}>
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingTop: 0 }}>
        {tab === 'sales' && sales && (
          <View>
            <View style={styles.statsRow}>
              <StatTile label="Ventas" value={String(sales.count)} />
              <StatTile label="Total vendido" value={formatMoney(sales.total, symbol)} tone="success" />
            </View>
            <View style={[styles.statsRow, { marginTop: spacing.sm }]}>
              <StatTile label="Ticket promedio" value={formatMoney(sales.avgTicket, symbol)} />
              <StatTile label="Impuestos" value={formatMoney(sales.tax, symbol)} />
            </View>

            {sales.byPayment.length > 0 && (
              <Card style={{ marginTop: spacing.md }}>
                <Text style={[typography.subtitle, { marginBottom: spacing.sm }]}>Por método de pago</Text>
                {sales.byPayment.map((row) => (
                  <View key={row.paymentMethod} style={styles.reportRow}>
                    <Text style={typography.body}>
                      {PAYMENT_LABEL[row.paymentMethod] ?? row.paymentMethod} ({row.count})
                    </Text>
                    <Text style={[typography.body, { fontWeight: '600' }]}>{formatMoney(row.total, symbol)}</Text>
                  </View>
                ))}
              </Card>
            )}

            {sales.topProducts.length > 0 && (
              <Card style={{ marginTop: spacing.md }}>
                <Text style={[typography.subtitle, { marginBottom: spacing.sm }]}>Productos más vendidos</Text>
                {sales.topProducts.map((row) => (
                  <View key={row.productId} style={styles.reportRow}>
                    <Text style={[typography.body, { flex: 1 }]} numberOfLines={1}>
                      {row.productName} ({formatQty(row.qty)})
                    </Text>
                    <Text style={[typography.body, { fontWeight: '600' }]}>{formatMoney(row.total, symbol)}</Text>
                  </View>
                ))}
              </Card>
            )}

            {sales.byDay.length > 0 && (
              <Card style={{ marginTop: spacing.md, marginBottom: spacing.xl }}>
                <Text style={[typography.subtitle, { marginBottom: spacing.sm }]}>Por día</Text>
                {sales.byDay.map((row) => (
                  <View key={row.day} style={styles.reportRow}>
                    <Text style={typography.body}>
                      {formatDateShort(row.day + 'T12:00:00')} ({row.count})
                    </Text>
                    <Text style={[typography.body, { fontWeight: '600' }]}>{formatMoney(row.total, symbol)}</Text>
                  </View>
                ))}
              </Card>
            )}
          </View>
        )}

        {tab === 'purchases' && purchases && (
          <View>
            <View style={styles.statsRow}>
              <StatTile label="Compras" value={String(purchases.count)} />
              <StatTile label="Total comprado" value={formatMoney(purchases.total, symbol)} tone="warning" />
            </View>
            {purchases.bySupplier.length > 0 && (
              <Card style={{ marginTop: spacing.md }}>
                <Text style={[typography.subtitle, { marginBottom: spacing.sm }]}>Por proveedor</Text>
                {purchases.bySupplier.map((row, i) => (
                  <View key={i} style={styles.reportRow}>
                    <Text style={typography.body}>
                      {row.supplierName || 'Sin proveedor'} ({row.count})
                    </Text>
                    <Text style={[typography.body, { fontWeight: '600' }]}>{formatMoney(row.total, symbol)}</Text>
                  </View>
                ))}
              </Card>
            )}
            {purchases.topProducts.length > 0 && (
              <Card style={{ marginTop: spacing.md, marginBottom: spacing.xl }}>
                <Text style={[typography.subtitle, { marginBottom: spacing.sm }]}>Productos más comprados</Text>
                {purchases.topProducts.map((row) => (
                  <View key={row.productId} style={styles.reportRow}>
                    <Text style={[typography.body, { flex: 1 }]} numberOfLines={1}>
                      {row.productName} ({formatQty(row.qty)})
                    </Text>
                    <Text style={[typography.body, { fontWeight: '600' }]}>{formatMoney(row.total, symbol)}</Text>
                  </View>
                ))}
              </Card>
            )}
          </View>
        )}

        {tab === 'inventory' && inventory && (
          <View>
            <View style={styles.statsRow}>
              <StatTile label="Productos activos" value={String(inventory.totalProducts)} />
              <StatTile label="Valor a costo" value={formatMoney(inventory.totalCost, symbol)} />
            </View>
            <View style={[styles.statsRow, { marginTop: spacing.sm }]}>
              <StatTile label="Valor a venta" value={formatMoney(inventory.totalRetail, symbol)} tone="success" />
              <StatTile
                label="Utilidad potencial"
                value={formatMoney(inventory.totalRetail - inventory.totalCost, symbol)}
              />
            </View>
            <Card style={{ marginTop: spacing.md, marginBottom: spacing.xl }}>
              <Text style={[typography.subtitle, { marginBottom: spacing.sm }]}>
                Alertas de stock ({lowStock.length})
              </Text>
              {lowStock.length === 0 ? (
                <Text style={typography.caption}>Todo el inventario está por encima del mínimo. ✅</Text>
              ) : (
                lowStock.map((p) => (
                  <View key={p.id} style={styles.reportRow}>
                    <Text style={[typography.body, { flex: 1 }]} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={[typography.body, { color: p.stock <= 0 ? colors.danger : colors.warning, fontWeight: '600' }]}>
                      {formatQty(p.stock)} / mín {formatQty(p.minStock)}
                    </Text>
                  </View>
                ))
              )}
            </Card>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  periods: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  period: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    gap: spacing.sm,
  },
});

export default ReportsScreen;
