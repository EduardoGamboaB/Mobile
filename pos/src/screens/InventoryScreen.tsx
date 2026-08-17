import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { listProducts } from '@/db/products';
import { inventorySummary, type InventorySummary } from '@/db/inventory';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatMoney, formatQty } from '@/utils/money';
import { Badge, EmptyState, SearchBar, StatTile } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme';
import type { Product } from '@/models/types';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Filter = 'all' | 'low' | 'out';

const InventoryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const symbol = useSettingsStore((s) => s.settings.currencySymbol);

  const refresh = useCallback(() => {
    void listProducts(search.trim(), true).then(setProducts);
    void inventorySummary().then(setSummary);
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const filtered = products.filter((p) => {
    if (filter === 'low') return p.stock > 0 && p.minStock > 0 && p.stock <= p.minStock;
    if (filter === 'out') return p.stock <= 0;
    return true;
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: spacing.md }}
        ListHeaderComponent={
          <View>
            {summary && (
              <>
                <View style={styles.statsRow}>
                  <StatTile label="Productos" value={String(summary.totalProducts)} />
                  <StatTile label="Valor a costo" value={formatMoney(summary.totalCost, symbol)} />
                </View>
                <View style={[styles.statsRow, { marginTop: spacing.sm }]}>
                  <StatTile label="Valor a venta" value={formatMoney(summary.totalRetail, symbol)} tone="success" />
                  <StatTile
                    label="Bajos / agotados"
                    value={`${summary.lowStockCount} / ${summary.outOfStockCount}`}
                    tone={summary.lowStockCount + summary.outOfStockCount > 0 ? 'warning' : undefined}
                  />
                </View>
              </>
            )}
            <View style={{ marginTop: spacing.md }}>
              <SearchBar value={search} onChangeText={setSearch} placeholder="Buscar en inventario…" />
            </View>
            <View style={styles.filters}>
              {(
                [
                  { key: 'all', label: 'Todos' },
                  { key: 'low', label: 'Stock bajo' },
                  { key: 'out', label: 'Agotados' },
                ] as { key: Filter; label: string }[]
              ).map((f) => (
                <Pressable
                  key={f.key}
                  style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
                  onPress={() => setFilter(f.key)}
                >
                  <Text
                    style={[
                      typography.caption,
                      filter === f.key && { color: colors.accent, fontWeight: '700' },
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState title="Sin resultados" subtitle="No hay productos con este filtro." />}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('ProductKardex', { productId: item.id, productName: item.name })}
          >
            <View style={{ flex: 1 }}>
              <Text style={typography.body}>{item.name}</Text>
              <Text style={typography.caption}>
                Mínimo: {formatQty(item.minStock)} {item.unit} · Costo {formatMoney(item.cost, symbol)}
              </Text>
            </View>
            <Badge
              text={`${formatQty(item.stock)} ${item.unit}`}
              tone={item.stock <= 0 ? 'danger' : item.minStock > 0 && item.stock <= item.minStock ? 'warning' : 'success'}
            />
          </Pressable>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  filters: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.md },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
});

export default InventoryScreen;
