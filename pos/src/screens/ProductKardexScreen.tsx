import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import { listMovements } from '@/db/inventory';
import { applyMovement } from '@/db/inventory';
import { checkLowStock } from '@/services/alerts';
import { syncNow } from '@/services/sync';
import { formatQty, toQty } from '@/utils/money';
import { formatDate } from '@/utils/ids';
import { Button, Card, EmptyState, Field } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme';
import type { InventoryMovement } from '@/models/types';
import type { RootStackParamList } from '@/navigation/types';

type Route = RouteProp<RootStackParamList, 'ProductKardex'>;

const TYPE_LABEL: Record<string, string> = {
  sale: 'Venta',
  purchase: 'Compra',
  adjustment: 'Ajuste',
  initial: 'Inicial',
};

const ProductKardexScreen: React.FC = () => {
  const route = useRoute<Route>();
  const { productId, productName } = route.params;
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNote, setAdjustNote] = useState('');

  const refresh = useCallback(() => {
    void listMovements(productId).then(setMovements);
  }, [productId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const adjust = async (direction: 1 | -1) => {
    const qty = toQty(adjustQty || '0');
    if (qty <= 0) {
      Alert.alert('Cantidad inválida', 'Escribe la cantidad a ajustar.');
      return;
    }
    const updated = await applyMovement(
      productId,
      'adjustment',
      qty * direction,
      adjustNote.trim() || 'Ajuste manual',
    );
    if (updated) await checkLowStock(updated);
    setAdjustQty('');
    setAdjustNote('');
    void syncNow();
    refresh();
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={movements}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.md }}
        ListHeaderComponent={
          <View>
            <Text style={typography.title}>{productName}</Text>
            <Card style={{ marginTop: spacing.md, marginBottom: spacing.md }}>
              <Text style={[typography.subtitle, { marginBottom: spacing.sm }]}>Ajustar existencias</Text>
              <Field label="Cantidad" value={adjustQty} onChangeText={setAdjustQty} keyboardType="decimal-pad" placeholder="0" />
              <Field label="Motivo" value={adjustNote} onChangeText={setAdjustNote} placeholder="Merma, conteo físico…" />
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button title="+ Entrada" onPress={() => void adjust(1)} style={{ flex: 1 }} />
                <Button title="− Salida" variant="danger" onPress={() => void adjust(-1)} style={{ flex: 1 }} />
              </View>
            </Card>
            <Text style={[typography.subtitle, { marginBottom: spacing.sm }]}>Movimientos</Text>
          </View>
        }
        ListEmptyComponent={<EmptyState icon="📋" title="Sin movimientos" />}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={typography.body}>
                {TYPE_LABEL[item.type] ?? item.type} · {item.reference}
              </Text>
              <Text style={typography.caption}>{formatDate(item.date)}</Text>
              {item.notes ? <Text style={typography.caption}>{item.notes}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text
                style={[
                  typography.body,
                  { fontWeight: '700', color: item.qty >= 0 ? colors.success : colors.danger },
                ]}
              >
                {item.qty >= 0 ? '+' : ''}
                {formatQty(item.qty)}
              </Text>
              <Text style={typography.caption}>Saldo: {formatQty(item.stockAfter)}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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

export default ProductKardexScreen;
