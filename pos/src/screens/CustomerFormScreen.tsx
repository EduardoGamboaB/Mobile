import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { getCustomer, saveCustomer, deactivateCustomer, customerPurchaseStats } from '@/db/customers';
import { syncNow } from '@/services/sync';
import { useSettingsStore } from '@/stores/settingsStore';
import { useLayout } from '@/hooks/useLayout';
import { formatMoney } from '@/utils/money';
import { formatDateShort } from '@/utils/ids';
import { Button, Card, Field, SectionHeader } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Route = RouteProp<RootStackParamList, 'CustomerForm'>;

const CustomerFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const customerId = route.params?.customerId;
  const symbol = useSettingsStore((s) => s.settings.currencySymbol);
  const { formStyle } = useLayout();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [taxId, setTaxId] = useState('');
  const [taxRegime, setTaxRegime] = useState('');
  const [zip, setZip] = useState('');
  const [cfdiUse, setCfdiUse] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [stats, setStats] = useState<{ count: number; total: number; last: string | null } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!customerId) return;
    void getCustomer(customerId).then((c) => {
      if (!c) return;
      setName(c.name);
      setPhone(c.phone);
      setEmail(c.email);
      setTaxId(c.taxId);
      setTaxRegime(c.taxRegime);
      setZip(c.zip);
      setCfdiUse(c.cfdiUse);
      setAddress(c.address);
      setNotes(c.notes);
    });
    void customerPurchaseStats(customerId).then(setStats);
  }, [customerId]);

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'El cliente necesita un nombre.');
      return;
    }
    setSaving(true);
    try {
      await saveCustomer({
        id: customerId,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        taxId: taxId.trim().toUpperCase(),
        taxRegime: taxRegime.trim(),
        zip: zip.trim(),
        cfdiUse: cfdiUse.trim().toUpperCase(),
        address: address.trim(),
        notes: notes.trim(),
      });
      void syncNow();
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!customerId) return;
    Alert.alert('Eliminar cliente', '¿Desactivar este cliente?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deactivateCustomer(customerId);
          void syncNow();
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[{ padding: spacing.md }, formStyle]}>
      {stats && stats.count > 0 && (
        <Card style={{ marginBottom: spacing.md }}>
          <Text style={typography.subtitle}>Historial</Text>
          <Text style={[typography.caption, { marginTop: 4 }]}>
            {stats.count} compra{stats.count === 1 ? '' : 's'} · {formatMoney(stats.total, symbol)}
            {stats.last ? ` · Última: ${formatDateShort(stats.last)}` : ''}
          </Text>
        </Card>
      )}

      <Field label="Nombre *" value={name} onChangeText={setName} />
      <Field label="Teléfono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="Correo" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Dirección" value={address} onChangeText={setAddress} multiline />

      <SectionHeader title="Datos de facturación" />
      <Field label="RFC / ID fiscal" value={taxId} onChangeText={setTaxId} autoCapitalize="characters" />
      <Field label="Régimen fiscal" value={taxRegime} onChangeText={setTaxRegime} placeholder="Ej. 601 General de Ley" />
      <Field label="Código postal" value={zip} onChangeText={setZip} keyboardType="number-pad" />
      <Field label="Uso de CFDI" value={cfdiUse} onChangeText={setCfdiUse} placeholder="Ej. G03" autoCapitalize="characters" />
      <Field label="Notas" value={notes} onChangeText={setNotes} multiline />

      <Button title={saving ? 'Guardando…' : 'Guardar'} onPress={save} loading={saving} />
      {customerId && (
        <Button title="Eliminar" variant="danger" style={{ marginTop: spacing.sm, marginBottom: spacing.xl }} onPress={remove} />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});

export default CustomerFormScreen;
