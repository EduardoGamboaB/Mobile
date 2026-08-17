import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { getSupplier, saveSupplier, deactivateSupplier } from '@/db/suppliers';
import { syncNow } from '@/services/sync';
import { useLayout } from '@/hooks/useLayout';
import { Button, Field } from '@/components/ui';
import { colors, spacing } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Route = RouteProp<RootStackParamList, 'SupplierForm'>;

const SupplierFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const supplierId = route.params?.supplierId;
  const { formStyle } = useLayout();

  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [taxId, setTaxId] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!supplierId) return;
    void getSupplier(supplierId).then((s) => {
      if (!s) return;
      setName(s.name);
      setContactName(s.contactName);
      setPhone(s.phone);
      setEmail(s.email);
      setTaxId(s.taxId);
      setAddress(s.address);
      setNotes(s.notes);
    });
  }, [supplierId]);

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'El proveedor necesita un nombre.');
      return;
    }
    setSaving(true);
    try {
      await saveSupplier({
        id: supplierId,
        name: name.trim(),
        contactName: contactName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        taxId: taxId.trim(),
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
    if (!supplierId) return;
    Alert.alert('Eliminar proveedor', '¿Desactivar este proveedor?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deactivateSupplier(supplierId);
          void syncNow();
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[{ padding: spacing.md }, formStyle]}>
      <Field label="Nombre / Razón social *" value={name} onChangeText={setName} />
      <Field label="Contacto" value={contactName} onChangeText={setContactName} />
      <Field label="Teléfono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="Correo" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Field label="RFC / ID fiscal" value={taxId} onChangeText={setTaxId} autoCapitalize="characters" />
      <Field label="Dirección" value={address} onChangeText={setAddress} multiline />
      <Field label="Notas" value={notes} onChangeText={setNotes} multiline />
      <Button title={saving ? 'Guardando…' : 'Guardar'} onPress={save} loading={saving} />
      {supplierId && (
        <Button title="Eliminar" variant="danger" style={{ marginTop: spacing.sm, marginBottom: spacing.xl }} onPress={remove} />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});

export default SupplierFormScreen;
