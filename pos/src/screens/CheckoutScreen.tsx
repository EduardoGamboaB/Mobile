import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCartStore } from '@/stores/cartStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { createSale, listSaleItems } from '@/db/sales';
import { printSaleTicket } from '@/services/printing/printer';
import { syncNow } from '@/services/sync';
import { formatMoney, toCents } from '@/utils/money';
import { computeTotals } from '@/utils/totals';
import { Button, Card, Field } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme';
import type { PaymentMethod } from '@/models/types';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const METHODS: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: 'cash', label: 'Efectivo', icon: '💵' },
  { key: 'card', label: 'Tarjeta', icon: '💳' },
  { key: 'transfer', label: 'Transferencia', icon: '🏦' },
  { key: 'other', label: 'Otro', icon: '🧾' },
];

const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const cart = useCartStore();
  const settings = useSettingsStore((s) => s.settings);
  const symbol = settings.currencySymbol;

  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [paidText, setPaidText] = useState('');
  const [discountText, setDiscountText] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [saving, setSaving] = useState(false);

  const discount = toCents(discountText || '0');
  const totals = useMemo(() => computeTotals(cart.lines, discount), [cart.lines, discount]);

  const paid = method === 'cash' ? toCents(paidText || '0') : totals.total;
  const change = Math.max(paid - totals.total, 0);
  const canCharge = cart.lines.length > 0 && paid >= totals.total;

  const complete = async () => {
    if (!canCharge || saving) return;
    setSaving(true);
    try {
      const sale = await createSale({
        lines: cart.lines,
        discount,
        paymentMethod: method,
        amountPaid: paid,
        customerName: customerName.trim(),
      });
      cart.clear();
      void syncNow();
      Alert.alert(
        `Venta #${sale.folio} registrada`,
        `Total ${formatMoney(sale.total, symbol)}${sale.change > 0 ? ` · Cambio ${formatMoney(sale.change, symbol)}` : ''}`,
        [
          {
            text: 'Imprimir ticket',
            onPress: async () => {
              const items = await listSaleItems(sale.id);
              const result = await printSaleTicket(settings, sale, items);
              if (!result.ok) Alert.alert('Impresión', result.error);
              navigation.popToTop();
            },
          },
          { text: 'Listo', onPress: () => navigation.popToTop() },
        ],
      );
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo registrar la venta.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      <Card>
        <View style={styles.totalRow}>
          <Text style={typography.subtitle}>Total a cobrar</Text>
          <Text style={styles.totalText}>{formatMoney(totals.total, symbol)}</Text>
        </View>
        <View style={styles.breakdown}>
          <Text style={typography.caption}>Subtotal {formatMoney(totals.subtotal, symbol)}</Text>
          <Text style={typography.caption}>Impuestos {formatMoney(totals.tax, symbol)}</Text>
          {totals.discount > 0 && (
            <Text style={[typography.caption, { color: colors.danger }]}>
              Descuento −{formatMoney(totals.discount, symbol)}
            </Text>
          )}
        </View>
      </Card>

      <Text style={[typography.subtitle, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>
        Método de pago
      </Text>
      <View style={styles.methods}>
        {METHODS.map((m) => (
          <Pressable
            key={m.key}
            style={[styles.methodBtn, method === m.key && styles.methodBtnActive]}
            onPress={() => setMethod(m.key)}
          >
            <Text style={{ fontSize: 20 }}>{m.icon}</Text>
            <Text style={[typography.caption, method === m.key && { color: colors.accent, fontWeight: '700' }]}>
              {m.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {method === 'cash' && (
        <View style={{ marginTop: spacing.md }}>
          <Field
            label={`Recibido (${symbol})`}
            value={paidText}
            onChangeText={setPaidText}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
          <View style={styles.quickAmounts}>
            {[totals.total, ...[5000, 10000, 20000, 50000].filter((c) => c > totals.total)].slice(0, 4).map((cents) => (
              <Pressable
                key={cents}
                style={styles.quickBtn}
                onPress={() => setPaidText((cents / 100).toFixed(2))}
              >
                <Text style={{ color: colors.accent, fontWeight: '600' }}>{formatMoney(cents, symbol)}</Text>
              </Pressable>
            ))}
          </View>
          {paid >= totals.total && change > 0 && (
            <Card style={{ backgroundColor: colors.successSoft, borderColor: colors.success }}>
              <Text style={[typography.subtitle, { color: colors.success }]}>
                Cambio: {formatMoney(change, symbol)}
              </Text>
            </Card>
          )}
        </View>
      )}

      <View style={{ marginTop: spacing.md }}>
        <Field
          label={`Descuento (${symbol}, opcional)`}
          value={discountText}
          onChangeText={setDiscountText}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
        <Field
          label="Cliente (opcional)"
          value={customerName}
          onChangeText={setCustomerName}
          placeholder="Público general"
        />
      </View>

      <Button
        title={saving ? 'Registrando…' : `Cobrar ${formatMoney(totals.total, symbol)}`}
        onPress={complete}
        disabled={!canCharge}
        loading={saving}
        style={{ marginTop: spacing.lg, marginBottom: spacing.xl }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalText: { fontSize: 26, fontWeight: '800', color: colors.text },
  breakdown: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  methods: { flexDirection: 'row', gap: spacing.sm },
  methodBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  methodBtnActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  quickAmounts: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  quickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.sm,
  },
});

export default CheckoutScreen;
