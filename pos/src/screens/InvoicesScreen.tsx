import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { listInvoices, cancelInvoice } from '@/db/invoices';
import { listSaleItems } from '@/db/sales';
import { shareInvoicePdf } from '@/services/invoicing';
import { syncNow } from '@/services/sync';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatMoney } from '@/utils/money';
import { formatDate } from '@/utils/ids';
import { Badge, EmptyState } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme';
import type { Invoice } from '@/models/types';

const InvoicesScreen: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const settings = useSettingsStore((s) => s.settings);

  const refresh = useCallback(() => {
    void listInvoices().then(setInvoices);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const openActions = (invoice: Invoice) => {
    Alert.alert(`Factura ${invoice.series}-${invoice.folio}`, invoice.customerName, [
      {
        text: 'Compartir PDF',
        onPress: async () => {
          const items = await listSaleItems(invoice.saleId);
          await shareInvoicePdf(settings, invoice, items);
        },
      },
      ...(invoice.status !== 'cancelled'
        ? [
            {
              text: 'Cancelar factura',
              style: 'destructive' as const,
              onPress: async () => {
                await cancelInvoice(invoice.id);
                void syncNow();
                refresh();
              },
            },
          ]
        : []),
      { text: 'Cerrar', style: 'cancel' as const },
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={invoices}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.md }}
        ListEmptyComponent={
          <EmptyState icon="🧾" title="Sin facturas" subtitle="Emite facturas desde el detalle de una venta." />
        }
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => openActions(item)}>
            <View style={{ flex: 1 }}>
              <Text style={typography.body}>
                {item.series}-{item.folio} · {item.customerName}
              </Text>
              <Text style={typography.caption}>
                {item.customerTaxId} · {formatDate(item.date)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={[typography.body, { fontWeight: '700' }]}>
                {formatMoney(item.total, settings.currencySymbol)}
              </Text>
              <Badge
                text={item.status === 'cancelled' ? 'Cancelada' : 'Emitida'}
                tone={item.status === 'cancelled' ? 'danger' : 'success'}
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

export default InvoicesScreen;
