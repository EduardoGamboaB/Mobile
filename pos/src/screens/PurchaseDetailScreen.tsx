import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { getPurchase, listPurchaseItems } from '@/db/purchases';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatMoney, formatQty } from '@/utils/money';
import { formatDate } from '@/utils/ids';
import { Badge, Card } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';
import type { Purchase, PurchaseItem } from '@/models/types';
import type { RootStackParamList } from '@/navigation/types';

type Route = RouteProp<RootStackParamList, 'PurchaseDetail'>;

const PurchaseDetailScreen: React.FC = () => {
  const route = useRoute<Route>();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const symbol = useSettingsStore((s) => s.settings.currencySymbol);

  useEffect(() => {
    void getPurchase(route.params.purchaseId).then(setPurchase);
    void listPurchaseItems(route.params.purchaseId).then(setItems);
  }, [route.params.purchaseId]);

  if (!purchase) return <View style={styles.container} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={typography.title}>Compra #{purchase.folio}</Text>
          <Badge
            text={purchase.status === 'received' ? 'Recibida' : purchase.status === 'cancelled' ? 'Cancelada' : 'Borrador'}
            tone={purchase.status === 'received' ? 'success' : purchase.status === 'cancelled' ? 'danger' : 'neutral'}
          />
        </View>
        <Text style={[typography.caption, { marginTop: 4 }]}>{formatDate(purchase.date)}</Text>
        <Text style={[typography.body, { marginTop: spacing.sm }]}>
          Proveedor: {purchase.supplierName || 'Sin proveedor'}
        </Text>
        {purchase.notes ? <Text style={typography.caption}>{purchase.notes}</Text> : null}
      </Card>

      <Text style={[typography.subtitle, { marginVertical: spacing.md }]}>Partidas</Text>
      {items.map((item) => (
        <Card key={item.id} style={{ marginBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={typography.body}>{item.productName}</Text>
              <Text style={typography.caption}>
                {formatQty(item.qty)} × {formatMoney(item.unitCost, symbol)}
              </Text>
            </View>
            <Text style={[typography.body, { fontWeight: '700' }]}>{formatMoney(item.total, symbol)}</Text>
          </View>
        </Card>
      ))}

      <Card style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}>
        <View style={styles.totalRow}>
          <Text style={typography.body}>Subtotal</Text>
          <Text style={typography.body}>{formatMoney(purchase.subtotal, symbol)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={typography.body}>Impuestos</Text>
          <Text style={typography.body}>{formatMoney(purchase.tax, symbol)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={typography.subtitle}>Total</Text>
          <Text style={[typography.subtitle, { fontWeight: '800' }]}>{formatMoney(purchase.total, symbol)}</Text>
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
});

export default PurchaseDetailScreen;
