import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { listProducts, findByBarcode } from '@/db/products';
import { useSettingsStore } from '@/stores/settingsStore';
import { useScanStore } from '@/stores/scanStore';
import { formatMoney, formatQty } from '@/utils/money';
import { Badge, Button, EmptyState, SearchBar } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme';
import type { Product } from '@/models/types';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const stockTone = (p: Product): 'success' | 'warning' | 'danger' => {
  if (p.stock <= 0) return 'danger';
  if (p.minStock > 0 && p.stock <= p.minStock) return 'warning';
  return 'success';
};

const ProductsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const symbol = useSettingsStore((s) => s.settings.currencySymbol);

  const refresh = useCallback(() => {
    void listProducts(search.trim(), true).then(setProducts);
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const openScanner = () => {
    useScanStore.getState().setHandler(async (code) => {
      const product = await findByBarcode(code);
      if (product) {
        navigation.navigate('ProductForm', { productId: product.id });
      } else {
        setSearch(code);
      }
    });
    navigation.navigate('Scanner');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={typography.title}>Productos</Text>
        <Button title="+ Nuevo" onPress={() => navigation.navigate('ProductForm', undefined)} />
      </View>
      <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.sm }}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Nombre, SKU, código o categoría…"
          onScanPress={openScanner}
        />
      </View>
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: spacing.md, paddingTop: 0 }}
        onRefresh={refresh}
        refreshing={false}
        ListEmptyComponent={
          <EmptyState
            title="Sin productos"
            subtitle="Crea tu primer producto con el botón + Nuevo o escanea su código de barras."
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('ProductForm', { productId: item.id })}
          >
            <View style={{ flex: 1 }}>
              <Text style={typography.body}>{item.name}</Text>
              <Text style={typography.caption}>
                {item.category ? `${item.category} · ` : ''}
                {item.sku || item.barcode || 'sin código'}
              </Text>
              <View style={{ marginTop: 4 }}>
                <Badge
                  text={`Stock: ${formatQty(item.stock)} ${item.unit}`}
                  tone={stockTone(item)}
                />
              </View>
            </View>
            <Text style={[typography.body, { fontWeight: '700' }]}>{formatMoney(item.price, symbol)}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
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

export default ProductsScreen;
