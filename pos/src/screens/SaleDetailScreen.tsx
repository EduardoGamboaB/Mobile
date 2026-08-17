import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getSale, listSaleItems, cancelSale } from '@/db/sales';
import { printSaleTicket } from '@/services/printing/printer';
import { syncNow } from '@/services/sync';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatMoney, formatQty } from '@/utils/money';
import { formatDate } from '@/utils/ids';
import { Badge, Button, Card } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';
import type { Sale, SaleItem } from '@/models/types';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'SaleDetail'>;

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  other: 'Otro',
};

const SaleDetailScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const [sale, setSale] = useState<Sale | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const settings = useSettingsStore((s) => s.settings);
  const symbol = settings.currencySymbol;

  const refresh = useCallback(() => {
    void getSale(route.params.saleId).then(setSale);
    void listSaleItems(route.params.saleId).then(setItems);
  }, [route.params.saleId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  if (!sale) return <View style={styles.container} />;

  const reprint = async () => {
    const result = await printSaleTicket(settings, sale, items);
    if (!result.ok) Alert.alert('Impresión', result.error);
  };

  const cancel = () => {
    Alert.alert(
      'Cancelar venta',
      'Se devolverán las existencias al inventario. ¿Cancelar esta venta?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            await cancelSale(sale.id);
            void syncNow();
            refresh();
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={typography.title}>Venta #{sale.folio}</Text>
          <Badge
            text={sale.status === 'cancelled' ? 'Cancelada' : 'Completada'}
            tone={sale.status === 'cancelled' ? 'danger' : 'success'}
          />
        </View>
        <Text style={[typography.caption, { marginTop: 4 }]}>{formatDate(sale.date)}</Text>
        {sale.customerName ? (
          <Text style={[typography.body, { marginTop: spacing.sm }]}>Cliente: {sale.customerName}</Text>
        ) : null}
        <Text style={typography.body}>
          Pago: {PAYMENT_LABEL[sale.paymentMethod] ?? sale.paymentMethod}
          {sale.change > 0 ? ` · Cambio ${formatMoney(sale.change, symbol)}` : ''}
        </Text>
      </Card>

      <Text style={[typography.subtitle, { marginVertical: spacing.md }]}>Artículos</Text>
      {items.map((item) => (
        <Card key={item.id} style={{ marginBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={typography.body}>{item.productName}</Text>
              <Text style={typography.caption}>
                {formatQty(item.qty)} × {formatMoney(item.unitPrice, symbol)}
              </Text>
            </View>
            <Text style={[typography.body, { fontWeight: '700' }]}>{formatMoney(item.total, symbol)}</Text>
          </View>
        </Card>
      ))}

      <Card style={{ marginTop: spacing.sm }}>
        <View style={styles.totalRow}>
          <Text style={typography.body}>Subtotal</Text>
          <Text style={typography.body}>{formatMoney(sale.subtotal, symbol)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={typography.body}>Impuestos</Text>
          <Text style={typography.body}>{formatMoney(sale.tax, symbol)}</Text>
        </View>
        {sale.discount > 0 && (
          <View style={styles.totalRow}>
            <Text style={typography.body}>Descuento</Text>
            <Text style={[typography.body, { color: colors.danger }]}>−{formatMoney(sale.discount, symbol)}</Text>
          </View>
        )}
        <View style={styles.totalRow}>
          <Text style={typography.subtitle}>Total</Text>
          <Text style={[typography.subtitle, { fontWeight: '800' }]}>{formatMoney(sale.total, symbol)}</Text>
        </View>
      </Card>

      <View style={{ marginTop: spacing.lg, marginBottom: spacing.xl, gap: spacing.sm }}>
        <Button title="Reimprimir ticket" onPress={() => void reprint()} />
        {sale.status === 'completed' && !sale.invoiceId && (
          <Button
            title="Facturar"
            variant="secondary"
            onPress={() => navigation.navigate('InvoiceForm', { saleId: sale.id })}
          />
        )}
        {sale.status === 'completed' && (
          <Button title="Cancelar venta" variant="danger" onPress={cancel} />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
});

export default SaleDetailScreen;
