import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { getSale, listSaleItems } from '@/db/sales';
import { getCustomer } from '@/db/customers';
import { createInvoice } from '@/db/invoices';
import { useLayout } from '@/hooks/useLayout';
import { shareInvoicePdf } from '@/services/invoicing';
import { syncNow } from '@/services/sync';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatMoney } from '@/utils/money';
import { Button, Card, Field } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';
import type { Sale } from '@/models/types';
import type { RootStackParamList } from '@/navigation/types';

type Route = RouteProp<RootStackParamList, 'InvoiceForm'>;

const InvoiceFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const settings = useSettingsStore((s) => s.settings);

  const [sale, setSale] = useState<Sale | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerTaxId, setCustomerTaxId] = useState('');
  const [customerTaxRegime, setCustomerTaxRegime] = useState('');
  const [customerZip, setCustomerZip] = useState('');
  const [cfdiUse, setCfdiUse] = useState('G03');
  const [saving, setSaving] = useState(false);

  const { formStyle } = useLayout();

  useEffect(() => {
    void getSale(route.params.saleId).then(async (s) => {
      setSale(s);
      if (!s) return;
      if (s.customerName) setCustomerName(s.customerName);
      // Si la venta tiene cliente registrado, prellenar sus datos fiscales.
      if (s.customerId) {
        const customer = await getCustomer(s.customerId);
        if (customer) {
          if (customer.name) setCustomerName(customer.name);
          if (customer.taxId) setCustomerTaxId(customer.taxId);
          if (customer.taxRegime) setCustomerTaxRegime(customer.taxRegime);
          if (customer.zip) setCustomerZip(customer.zip);
          if (customer.cfdiUse) setCfdiUse(customer.cfdiUse);
        }
      }
    });
  }, [route.params.saleId]);

  const issue = async () => {
    if (!sale) return;
    if (!customerName.trim() || !customerTaxId.trim()) {
      Alert.alert('Datos incompletos', 'La razón social y el RFC/ID fiscal del cliente son obligatorios.');
      return;
    }
    setSaving(true);
    try {
      const invoice = await createInvoice(
        sale,
        {
          customerName: customerName.trim(),
          customerTaxId: customerTaxId.trim().toUpperCase(),
          customerTaxRegime: customerTaxRegime.trim(),
          customerZip: customerZip.trim(),
          cfdiUse: cfdiUse.trim(),
        },
        settings.invoiceSeries || 'A',
      );
      void syncNow();
      const items = await listSaleItems(sale.id);
      Alert.alert('Factura emitida', `Factura ${invoice.series}-${invoice.folio} por ${formatMoney(invoice.total, settings.currencySymbol)}.`, [
        {
          text: 'Compartir PDF',
          onPress: async () => {
            await shareInvoicePdf(settings, invoice, items);
            navigation.goBack();
          },
        },
        { text: 'Listo', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo emitir la factura.');
    } finally {
      setSaving(false);
    }
  };

  if (!sale) return <ScrollView style={styles.container} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={[{ padding: spacing.md }, formStyle]}>
      <Card>
        <Text style={typography.subtitle}>Venta #{sale.folio}</Text>
        <Text style={[typography.body, { marginTop: 4 }]}>
          Total a facturar: {formatMoney(sale.total, settings.currencySymbol)}
        </Text>
      </Card>

      <Text style={[typography.subtitle, { marginVertical: spacing.md }]}>Datos fiscales del cliente</Text>
      <Field label="Razón social *" value={customerName} onChangeText={setCustomerName} />
      <Field label="RFC / ID fiscal *" value={customerTaxId} onChangeText={setCustomerTaxId} autoCapitalize="characters" />
      <Field label="Régimen fiscal" value={customerTaxRegime} onChangeText={setCustomerTaxRegime} placeholder="Ej. 601 General de Ley" />
      <Field label="Código postal" value={customerZip} onChangeText={setCustomerZip} keyboardType="number-pad" />
      <Field label="Uso de CFDI" value={cfdiUse} onChangeText={setCfdiUse} placeholder="Ej. G03 Gastos en general" autoCapitalize="characters" />

      <Button
        title={saving ? 'Emitiendo…' : 'Emitir factura'}
        onPress={issue}
        loading={saving}
        style={{ marginTop: spacing.md, marginBottom: spacing.xl }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});

export default InvoiceFormScreen;
