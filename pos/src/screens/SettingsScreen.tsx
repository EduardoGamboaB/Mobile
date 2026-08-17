import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSettingsStore } from '@/stores/settingsStore';
import { syncNow } from '@/services/sync';
import { Button, Card, Field, SectionHeader } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme';
import type { BusinessSettings } from '@/models/types';

/**
 * Configuración del negocio: identidad y branding, datos de facturación,
 * ticket, impresora térmica y sincronización. Todo se guarda localmente
 * y aplica de inmediato en tickets, facturas y pantallas.
 */
const SettingsScreen: React.FC = () => {
  const { settings, update } = useSettingsStore();
  const [draft, setDraft] = useState<BusinessSettings>({ ...settings });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof BusinessSettings>(key: K, value: BusinessSettings[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      // Se guarda como data URI para que sobreviva reinstalaciones del caché
      // y pueda incrustarse directo en tickets y facturas PDF.
      const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      set('logoUri', uri);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await update(draft);
      void syncNow();
      Alert.alert('Configuración guardada', 'Los cambios se aplicaron correctamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md }}>
      <SectionHeader title="Identidad del negocio" />
      <Card>
        <View style={styles.logoRow}>
          <Pressable style={styles.logoBox} onPress={() => void pickLogo()}>
            {draft.logoUri ? (
              <Image source={{ uri: draft.logoUri }} style={styles.logo} resizeMode="contain" />
            ) : (
              <Text style={{ fontSize: 28 }}>🏪</Text>
            )}
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={typography.subtitle}>Logo del negocio</Text>
            <Text style={typography.caption}>Aparece en tickets y facturas. Toca para cambiarlo.</Text>
            {draft.logoUri ? (
              <Pressable onPress={() => set('logoUri', null)}>
                <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>Quitar logo</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <Field label="Nombre comercial" value={draft.name} onChangeText={(t) => set('name', t)} />
        <Field label="Razón social" value={draft.legalName} onChangeText={(t) => set('legalName', t)} />
        <Field label="Dirección" value={draft.address} onChangeText={(t) => set('address', t)} multiline />
        <Field label="Teléfono" value={draft.phone} onChangeText={(t) => set('phone', t)} keyboardType="phone-pad" />
        <Field label="Correo" value={draft.email} onChangeText={(t) => set('email', t)} keyboardType="email-address" autoCapitalize="none" />
      </Card>

      <SectionHeader title="Datos de facturación" />
      <Card>
        <Field label="RFC / ID fiscal" value={draft.taxId} onChangeText={(t) => set('taxId', t)} autoCapitalize="characters" />
        <Field label="Régimen fiscal" value={draft.taxRegime} onChangeText={(t) => set('taxRegime', t)} placeholder="Ej. 601 General de Ley" />
        <Field label="Serie de facturas" value={draft.invoiceSeries} onChangeText={(t) => set('invoiceSeries', t)} autoCapitalize="characters" />
        <Field
          label="Tasa de impuesto por defecto (%)"
          value={String(draft.taxRate)}
          onChangeText={(t) => set('taxRate', parseFloat(t) || 0)}
          keyboardType="decimal-pad"
        />
        <Field label="Moneda (código)" value={draft.currency} onChangeText={(t) => set('currency', t.toUpperCase())} autoCapitalize="characters" />
        <Field label="Símbolo de moneda" value={draft.currencySymbol} onChangeText={(t) => set('currencySymbol', t)} />
      </Card>

      <SectionHeader title="Ticket" />
      <Card>
        <Field label="Encabezado adicional" value={draft.ticketHeader} onChangeText={(t) => set('ticketHeader', t)} multiline placeholder="Ej. Sucursal Centro" />
        <Field label="Pie del ticket" value={draft.ticketFooter} onChangeText={(t) => set('ticketFooter', t)} multiline placeholder="Ej. ¡Gracias por su compra!" />
      </Card>

      <SectionHeader title="Impresora térmica (Bluetooth)" />
      <Card>
        <Field label="Nombre de la impresora" value={draft.printerName} onChangeText={(t) => set('printerName', t)} placeholder="Ej. MTP-II" />
        <Field
          label="Dirección MAC"
          value={draft.printerAddress}
          onChangeText={(t) => set('printerAddress', t)}
          placeholder="00:11:22:33:44:55"
          autoCapitalize="characters"
        />
        <Text style={[typography.caption, { marginBottom: spacing.sm }]}>Ancho de papel</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {([58, 80] as const).map((w) => (
            <Pressable
              key={w}
              style={[styles.paperBtn, draft.paperWidth === w && styles.paperBtnActive]}
              onPress={() => set('paperWidth', w)}
            >
              <Text style={[typography.body, draft.paperWidth === w && { color: colors.accent, fontWeight: '700' }]}>
                {w} mm
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={[typography.caption, { marginTop: spacing.sm }]}>
          Sin impresora configurada, el ticket se genera como PDF y se comparte con el diálogo del sistema.
        </Text>
      </Card>

      <SectionHeader title="Sincronización (offline / online)" />
      <Card>
        <Field
          label="URL del backend (vacío = solo offline)"
          value={draft.syncUrl}
          onChangeText={(t) => set('syncUrl', t.trim())}
          placeholder="https://api.minegocio.com/sync"
          autoCapitalize="none"
          keyboardType="url"
        />
        <Field
          label="API key"
          value={draft.syncApiKey}
          onChangeText={(t) => set('syncApiKey', t.trim())}
          autoCapitalize="none"
        />
        <Text style={typography.caption}>
          La app funciona 100 % sin conexión; cada venta, compra o cambio se
          encola y se envía automáticamente al backend cuando hay internet.
        </Text>
      </Card>

      <Button
        title={saving ? 'Guardando…' : 'Guardar configuración'}
        onPress={() => void save()}
        loading={saving}
        style={{ marginTop: spacing.lg, marginBottom: spacing.xl }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  logo: { width: 72, height: 72 },
  paperBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  paperBtnActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
});

export default SettingsScreen;
