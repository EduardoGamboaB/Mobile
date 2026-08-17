import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { listProducts, findByBarcode } from '@/db/products';
import { listSuppliers } from '@/db/suppliers';
import { createPurchase, type PurchaseLineInput } from '@/db/purchases';
import { syncNow } from '@/services/sync';
import { useSettingsStore } from '@/stores/settingsStore';
import { useScanStore } from '@/stores/scanStore';
import { formatMoney, formatQty, fromCents, toCents, toQty } from '@/utils/money';
import { Button, Card, EmptyState, Field, SearchBar } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme';
import type { Product, Supplier } from '@/models/types';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface DraftLine extends PurchaseLineInput {
  unit: string;
}

const PurchaseFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const symbol = useSettingsStore((s) => s.settings.currencySymbol);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [qtyText, setQtyText] = useState('1');
  const [costText, setCostText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void listSuppliers().then(setSuppliers);
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    void listProducts(search.trim()).then((rows) => setResults(rows.slice(0, 6)));
  }, [search]);

  const startLine = useCallback((product: Product) => {
    setEditing(product);
    setQtyText('1');
    setCostText(product.cost ? String(fromCents(product.cost)) : '');
    setSearch('');
    setResults([]);
  }, []);

  const openScanner = () => {
    useScanStore.getState().setHandler(async (code) => {
      const product = await findByBarcode(code);
      if (product) startLine(product);
      else Alert.alert('No encontrado', `No existe un producto con el código ${code}.`);
    });
    navigation.navigate('Scanner');
  };

  const confirmLine = () => {
    if (!editing) return;
    const qty = toQty(qtyText || '0');
    const unitCost = toCents(costText || '0');
    if (qty <= 0) {
      Alert.alert('Cantidad inválida', 'Escribe la cantidad recibida.');
      return;
    }
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === editing.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === editing.id ? { ...l, qty: l.qty + qty, unitCost } : l,
        );
      }
      return [
        ...prev,
        {
          productId: editing.id,
          productName: editing.name,
          qty,
          unitCost,
          taxRate: editing.taxRate,
          unit: editing.unit,
        },
      ];
    });
    setEditing(null);
  };

  const total = lines.reduce((acc, l) => acc + Math.round((l.qty * l.unitCost) / 1000), 0);
  const supplier = suppliers.find((s) => s.id === supplierId) ?? null;

  const save = async () => {
    if (lines.length === 0) {
      Alert.alert('Compra vacía', 'Agrega al menos un producto.');
      return;
    }
    setSaving(true);
    try {
      const purchase = await createPurchase({
        supplierId,
        supplierName: supplier?.name ?? '',
        lines,
      });
      void syncNow();
      Alert.alert('Compra registrada', `Compra #${purchase.folio} por ${formatMoney(purchase.total, symbol)}. El inventario fue actualizado.`, [
        { text: 'Listo', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo registrar la compra.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={lines}
        keyExtractor={(l) => l.productId}
        contentContainerStyle={{ padding: spacing.md }}
        ListHeaderComponent={
          <View>
            <Text style={[typography.subtitle, { marginBottom: spacing.sm }]}>Proveedor</Text>
            <View style={styles.supplierChips}>
              <Pressable
                style={[styles.chip, supplierId === null && styles.chipActive]}
                onPress={() => setSupplierId(null)}
              >
                <Text style={[typography.caption, supplierId === null && styles.chipTextActive]}>Sin proveedor</Text>
              </Pressable>
              {suppliers.map((s) => (
                <Pressable
                  key={s.id}
                  style={[styles.chip, supplierId === s.id && styles.chipActive]}
                  onPress={() => setSupplierId(s.id)}
                >
                  <Text style={[typography.caption, supplierId === s.id && styles.chipTextActive]}>{s.name}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[typography.subtitle, { marginVertical: spacing.sm }]}>Productos</Text>
            <SearchBar
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar producto…"
              onScanPress={openScanner}
            />
            {results.map((p) => (
              <Pressable key={p.id} style={styles.resultRow} onPress={() => startLine(p)}>
                <Text style={typography.body}>{p.name}</Text>
                <Text style={typography.caption}>Stock: {formatQty(p.stock)} {p.unit}</Text>
              </Pressable>
            ))}

            {editing && (
              <Card style={{ marginTop: spacing.md }}>
                <Text style={[typography.subtitle, { marginBottom: spacing.sm }]}>{editing.name}</Text>
                <Field label={`Cantidad (${editing.unit})`} value={qtyText} onChangeText={setQtyText} keyboardType="decimal-pad" />
                <Field label={`Costo unitario (${symbol})`} value={costText} onChangeText={setCostText} keyboardType="decimal-pad" />
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Button title="Agregar" onPress={confirmLine} style={{ flex: 1 }} />
                  <Button title="Cancelar" variant="ghost" onPress={() => setEditing(null)} style={{ flex: 1 }} />
                </View>
              </Card>
            )}
            {lines.length > 0 && (
              <Text style={[typography.subtitle, { marginTop: spacing.md, marginBottom: spacing.sm }]}>Partidas</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          !editing ? (
            <EmptyState icon="📥" title="Sin partidas" subtitle="Busca o escanea los productos recibidos." />
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.lineRow}>
            <View style={{ flex: 1 }}>
              <Text style={typography.body}>{item.productName}</Text>
              <Text style={typography.caption}>
                {formatQty(item.qty)} {item.unit} × {formatMoney(item.unitCost, symbol)}
              </Text>
            </View>
            <Text style={[typography.body, { fontWeight: '700' }]}>
              {formatMoney(Math.round((item.qty * item.unitCost) / 1000), symbol)}
            </Text>
            <Pressable onPress={() => setLines((prev) => prev.filter((l) => l.productId !== item.productId))}>
              <Text style={{ color: colors.danger, fontSize: 18, paddingLeft: spacing.sm }}>✕</Text>
            </Pressable>
          </View>
        )}
      />
      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Text style={typography.caption}>Total de la compra</Text>
          <Text style={styles.total}>{formatMoney(total, symbol)}</Text>
        </View>
        <Button title={saving ? 'Guardando…' : 'Recibir compra'} onPress={save} loading={saving} disabled={lines.length === 0} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  supplierChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  chipTextActive: { color: colors.accent, fontWeight: '700' },
  resultRow: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  total: { fontSize: 20, fontWeight: '800', color: colors.text },
});

export default PurchaseFormScreen;
