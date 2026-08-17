import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getProduct, saveProduct, deactivateProduct } from '@/db/products';
import { applyMovement } from '@/db/inventory';
import { checkLowStock } from '@/services/alerts';
import { syncNow } from '@/services/sync';
import { useSettingsStore } from '@/stores/settingsStore';
import { useScanStore } from '@/stores/scanStore';
import { useLayout } from '@/hooks/useLayout';
import { fromCents, toCents, toQty, formatQty } from '@/utils/money';
import { Button, Field } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ProductForm'>;

const ProductFormScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const productId = route.params?.productId;
  const defaultTaxRate = useSettingsStore((s) => s.settings.taxRate);
  const { formStyle } = useLayout();

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('pza');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [taxRate, setTaxRate] = useState(String(defaultTaxRate));
  const [stock, setStock] = useState('0');
  const [minStock, setMinStock] = useState('0');
  const [description, setDescription] = useState('');
  const [initialStock, setInitialStock] = useState(0); // milésimas, para detectar ajuste
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!productId) return;
    void getProduct(productId).then((p) => {
      if (!p) return;
      setName(p.name);
      setSku(p.sku);
      setBarcode(p.barcode);
      setCategory(p.category);
      setUnit(p.unit);
      setPrice(p.price ? String(fromCents(p.price)) : '');
      setCost(p.cost ? String(fromCents(p.cost)) : '');
      setTaxRate(String(p.taxRate));
      setStock(formatQty(p.stock));
      setMinStock(formatQty(p.minStock));
      setDescription(p.description);
      setInitialStock(p.stock);
    });
  }, [productId]);

  const scanBarcode = () => {
    useScanStore.getState().setHandler((code) => setBarcode(code));
    navigation.navigate('Scanner');
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'El producto necesita un nombre.');
      return;
    }
    setSaving(true);
    try {
      const stockMilli = toQty(stock || '0');
      const product = await saveProduct({
        id: productId,
        name: name.trim(),
        sku: sku.trim(),
        barcode: barcode.trim(),
        category: category.trim(),
        unit: unit.trim() || 'pza',
        price: toCents(price || '0'),
        cost: toCents(cost || '0'),
        taxRate: parseFloat(taxRate) || 0,
        minStock: toQty(minStock || '0'),
        // El stock se maneja vía movimientos para mantener el kardex íntegro.
        stock: productId ? initialStock : 0,
      });
      const delta = stockMilli - (productId ? initialStock : 0);
      if (delta !== 0) {
        const updated = await applyMovement(
          product.id,
          productId ? 'adjustment' : 'initial',
          delta,
          productId ? 'Ajuste manual' : 'Inventario inicial',
        );
        if (updated) await checkLowStock(updated);
      }
      void syncNow();
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!productId) return;
    Alert.alert('Eliminar producto', 'El producto se desactivará y dejará de aparecer en el catálogo. ¿Continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deactivateProduct(productId);
          void syncNow();
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[{ padding: spacing.md }, formStyle]}>
      <Field label="Nombre *" value={name} onChangeText={setName} placeholder="Ej. Refresco 600 ml" />
      <Field
        label="Código de barras"
        value={barcode}
        onChangeText={setBarcode}
        placeholder="Escanéalo o escríbelo"
        autoCapitalize="none"
        rightElement={
          <Pressable style={styles.scanBtn} onPress={scanBarcode}>
            <Text style={{ fontSize: 18 }}>📷</Text>
          </Pressable>
        }
      />
      <Field label="SKU / clave interna" value={sku} onChangeText={setSku} autoCapitalize="characters" />
      <Field label="Categoría" value={category} onChangeText={setCategory} placeholder="Ej. Bebidas" />
      <Field label="Unidad" value={unit} onChangeText={setUnit} placeholder="pza, kg, lt…" />
      <Field label="Precio de venta (con impuesto)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" />
      <Field label="Costo" value={cost} onChangeText={setCost} keyboardType="decimal-pad" placeholder="0.00" />
      <Field label="Tasa de impuesto (%)" value={taxRate} onChangeText={setTaxRate} keyboardType="decimal-pad" />
      <Field label="Existencias" value={stock} onChangeText={setStock} keyboardType="decimal-pad" />
      <Field label="Stock mínimo (alerta)" value={minStock} onChangeText={setMinStock} keyboardType="decimal-pad" />
      <Field label="Descripción" value={description} onChangeText={setDescription} multiline />

      <Button title={saving ? 'Guardando…' : 'Guardar'} onPress={save} loading={saving} />
      {productId ? (
        <>
          <Button
            title="Ver kardex"
            variant="secondary"
            style={{ marginTop: spacing.sm }}
            onPress={() => navigation.navigate('ProductKardex', { productId, productName: name })}
          />
          <Button title="Eliminar" variant="danger" style={{ marginTop: spacing.sm, marginBottom: spacing.xl }} onPress={remove} />
        </>
      ) : (
        <Text style={{ marginBottom: spacing.xl }} />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scanBtn: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});

export default ProductFormScreen;
