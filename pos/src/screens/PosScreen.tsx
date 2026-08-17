import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { listProducts, findByBarcode } from '@/db/products';
import { useCartStore } from '@/stores/cartStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useScanStore } from '@/stores/scanStore';
import { useSyncStore } from '@/stores/syncStore';
import { formatMoney, formatQty } from '@/utils/money';
import { Button, SearchBar, EmptyState, Badge } from '@/components/ui';
import { colors, spacing, radius, typography } from '@/theme';
import type { Product } from '@/models/types';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PosScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const cart = useCartStore();
  const symbol = useSettingsStore((s) => s.settings.currencySymbol);
  const businessName = useSettingsStore((s) => s.settings.name);
  const online = useSyncStore((s) => s.online);
  const pendingSync = useSyncStore((s) => s.pendingCount);

  useEffect(() => {
    let cancelled = false;
    if (!search.trim()) {
      setResults([]);
      return;
    }
    listProducts(search.trim()).then((rows) => {
      if (!cancelled) setResults(rows.slice(0, 8));
    });
    return () => {
      cancelled = true;
    };
  }, [search]);

  const addToCart = useCallback(
    (product: Product) => {
      if (product.stock <= 0) {
        Alert.alert('Sin existencias', `"${product.name}" no tiene stock. ¿Vender de todos modos?`, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Vender', onPress: () => cart.addProduct(product) },
        ]);
        return;
      }
      cart.addProduct(product);
    },
    [cart],
  );

  const openScanner = useCallback(() => {
    useScanStore.getState().setHandler(async (code) => {
      const product = await findByBarcode(code);
      if (product) {
        addToCart(product);
      } else {
        Alert.alert('No encontrado', `No existe un producto con el código ${code}.`, [
          { text: 'Cerrar', style: 'cancel' },
          {
            text: 'Crear producto',
            onPress: () => navigation.navigate('ProductForm', undefined),
          },
        ]);
      }
    });
    navigation.navigate('Scanner');
  }, [addToCart, navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{businessName}</Text>
          <Text style={styles.headerSubtitle}>Punto de venta</Text>
        </View>
        <Badge
          text={online ? (pendingSync > 0 ? `${pendingSync} por sincronizar` : 'En línea') : 'Sin conexión'}
          tone={online ? (pendingSync > 0 ? 'warning' : 'success') : 'danger'}
        />
      </View>

      <View style={{ paddingHorizontal: spacing.md }}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar producto o código…"
          onScanPress={openScanner}
        />
        {results.length > 0 && (
          <View style={styles.results}>
            {results.map((p) => (
              <Pressable
                key={p.id}
                style={styles.resultRow}
                onPress={() => {
                  addToCart(p);
                  setSearch('');
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={typography.body}>{p.name}</Text>
                  <Text style={typography.caption}>
                    Stock: {formatQty(p.stock)} {p.unit}
                  </Text>
                </View>
                <Text style={[typography.body, { fontWeight: '700' }]}>{formatMoney(p.price, symbol)}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.md }}
        data={cart.lines}
        keyExtractor={(l) => l.productId}
        ListEmptyComponent={
          <EmptyState
            icon="🛒"
            title="Carrito vacío"
            subtitle="Busca un producto o escanéalo con la cámara para comenzar la venta."
          />
        }
        renderItem={({ item }) => (
          <View style={styles.cartRow}>
            <View style={{ flex: 1 }}>
              <Text style={typography.body}>{item.name}</Text>
              <Text style={typography.caption}>{formatMoney(item.unitPrice, symbol)} c/u</Text>
            </View>
            <View style={styles.qtyControls}>
              <Pressable style={styles.qtyBtn} onPress={() => cart.setQty(item.productId, item.qty - 1000)}>
                <Text style={styles.qtyBtnText}>−</Text>
              </Pressable>
              <Text style={styles.qtyText}>{formatQty(item.qty)}</Text>
              <Pressable style={styles.qtyBtn} onPress={() => cart.setQty(item.productId, item.qty + 1000)}>
                <Text style={styles.qtyBtnText}>+</Text>
              </Pressable>
            </View>
            <Text style={[typography.body, { fontWeight: '700', width: 80, textAlign: 'right' }]}>
              {formatMoney(Math.round((item.qty * item.unitPrice) / 1000), symbol)}
            </Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Text style={typography.caption}>
            {cart.totals.itemCount} artículo{cart.totals.itemCount === 1 ? '' : 's'}
          </Text>
          <Text style={styles.total}>{formatMoney(cart.totals.total, symbol)}</Text>
        </View>
        {cart.lines.length > 0 && (
          <Button
            title="Vaciar"
            variant="ghost"
            onPress={() =>
              Alert.alert('Vaciar carrito', '¿Eliminar todos los artículos?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Vaciar', style: 'destructive', onPress: () => cart.clear() },
              ])
            }
            style={{ marginRight: spacing.sm }}
          />
        )}
        <Button
          title="Cobrar"
          onPress={() => navigation.navigate('Checkout')}
          disabled={cart.lines.length === 0}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  headerTitle: { ...typography.title },
  headerSubtitle: { ...typography.caption },
  results: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cartRow: {
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
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { color: colors.accent, fontSize: 18, fontWeight: '700', lineHeight: 20 },
  qtyText: { ...typography.body, minWidth: 32, textAlign: 'center', fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  total: { fontSize: 24, fontWeight: '800', color: colors.text },
});

export default PosScreen;
