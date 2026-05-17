import React from 'react';
import { Text, View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Screen } from '@/components/common/Screen';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useAuthStore } from '@/stores/auth';
import { colors, spacing, typography } from '@/theme';

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || '—'}</Text>
    </View>
  );
}

export function ProfileScreen() {
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  const expSoon = (() => {
    if (!profile?.license_expires_at) return false;
    const days = (new Date(profile.license_expires_at).getTime() - Date.now()) / 86_400_000;
    return days >= 0 && days <= 30;
  })();

  const onLogout = () => {
    Alert.alert('Cerrar sesión', '¿Salir de la app?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={styles.name}>{profile?.full_name ?? 'Operador'}</Text>
        <Text style={styles.role}>{profile?.role?.toUpperCase()}</Text>

        <Card>
          <Text style={styles.section}>CONTACTO</Text>
          <Row label="Teléfono" value={profile?.phone} />
          <Row label="Correo" value={profile?.email} />
        </Card>

        <Card>
          <Text style={styles.section}>DOCUMENTOS</Text>
          <Row label="Licencia federal" value={profile?.federal_license} />
          <Row label="Vigencia" value={profile?.license_expires_at} />
          {expSoon ? (
            <Text style={styles.warn}>⚠ Tu licencia vence en menos de 30 días.</Text>
          ) : null}
        </Card>

        <Card>
          <Text style={styles.section}>UNIDAD</Text>
          <Row label="Número" value={profile?.assigned_unit_number} />
          <Row label="Tipo" value={profile?.unit_type} />
          <Row label="Placas tracto" value={profile?.tractor_plates} />
          <Row label="Placas remolque" value={profile?.trailer_plates} />
        </Card>

        <Button title="Cerrar sesión" variant="danger" onPress={onLogout} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { ...typography.h1 },
  role: { ...typography.label, marginBottom: spacing.lg },
  section: { ...typography.label, marginBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { color: colors.muted, fontSize: 14 },
  value: { color: colors.text, fontSize: 14, fontWeight: '600' },
  warn: { color: colors.warning, marginTop: spacing.sm, fontWeight: '700' },
});
