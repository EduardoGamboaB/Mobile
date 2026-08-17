import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { listPurchases } from '@/db/purchases';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatMoney } from '@/utils/money';
import { formatDate } from '@/utils/ids';
import { Badge, Button, EmptyState } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme';
import type { Purchase } from '@/models/types';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PurchasesScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const symbol = useSettingsStore((s) => s.settings.currencySymbol);

  const refresh = useCallback(() => {
    void listPurchases().then(setPurchases);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={typography.subtitle}>Historial de compras</Text>
        <Button title="+ Nueva compra" onPress={() => navigation.navigate('PurchaseForm')} />
      </View>
      <FlatList
        data={purchases}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: spacing.md, paddingTop: 0 }}
        ListEmptyComponent={
          <EmptyState icon="📥" title="Sin compras" subtitle="Registra tus compras para alimentar el inventario automáticamente." />
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('PurchaseDetail', { purchaseId: item.id })}
          >
            <View style={{ flex: 1 }}>
              <Text style={typography.body}>
                Compra #{item.folio} · {item.supplierName || 'Sin proveedor'}
              </Text>
              <Text style={typography.caption}>{formatDate(item.date)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={[typography.body, { fontWeight: '700' }]}>{formatMoney(item.total, symbol)}</Text>
              <Badge
                text={item.status === 'received' ? 'Recibida' : item.status === 'cancelled' ? 'Cancelada' : 'Borrador'}
                tone={item.status === 'received' ? 'success' : item.status === 'cancelled' ? 'danger' : 'neutral'}
              />
            </View>
          </Pressable>
        )}
      />
    </View>
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

export default PurchasesScreen;
