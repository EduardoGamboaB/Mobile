import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { listSales } from '@/db/sales';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatMoney } from '@/utils/money';
import { formatDate } from '@/utils/ids';
import { Badge, EmptyState } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme';
import type { Sale } from '@/models/types';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SalesScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [sales, setSales] = useState<Sale[]>([]);
  const symbol = useSettingsStore((s) => s.settings.currencySymbol);

  const refresh = useCallback(() => {
    void listSales().then(setSales);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={sales}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: spacing.md }}
        ListEmptyComponent={<EmptyState icon="🧾" title="Sin ventas" subtitle="Las ventas registradas aparecerán aquí." />}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => navigation.navigate('SaleDetail', { saleId: item.id })}>
            <View style={{ flex: 1 }}>
              <Text style={typography.body}>
                Venta #{item.folio}
                {item.customerName ? ` · ${item.customerName}` : ''}
              </Text>
              <Text style={typography.caption}>{formatDate(item.date)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={[typography.body, { fontWeight: '700' }]}>{formatMoney(item.total, symbol)}</Text>
              {item.status === 'cancelled' ? (
                <Badge text="Cancelada" tone="danger" />
              ) : item.invoiceId ? (
                <Badge text="Facturada" tone="success" />
              ) : null}
            </View>
          </Pressable>
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

export default SalesScreen;
