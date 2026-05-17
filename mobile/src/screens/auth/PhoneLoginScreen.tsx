import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/common/Button';
import { TextField } from '@/components/common/TextField';
import { Card } from '@/components/common/Card';
import { PhoneIcon } from '@/components/icons';
import { useAuthStore } from '@/stores/auth';
import { isDemo } from '@/demo';
import { useColors, spacing, typography } from '@/theme';
import type { ColorPalette } from '@/theme';
import type { AuthStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'PhoneLogin'>;

export function PhoneLoginScreen() {
  const c = useColors();
  const styles = makeStyles(c);
  const nav = useNavigation<Nav>();
  const [phone, setPhone] = useState('');
  const loading = useAuthStore((s) => s.loading);
  const signInWithPhone = useAuthStore((s) => s.signInWithPhone);
  const signInAsDemo = useAuthStore((s) => s.signInAsDemo);

  const onSubmit = async () => {
    const normalized = phone.replace(/[^\d+]/g, '');
    const full = normalized.startsWith('+') ? normalized : `+52${normalized}`;
    if (full.length < 10) {
      Alert.alert('Teléfono inválido', 'Introduce un número con lada.');
      return;
    }
    try {
      await signInWithPhone(full);
      nav.navigate('OtpVerify', { phone: full });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      Alert.alert('No se pudo enviar el código', msg);
    }
  };

  return (
    <Screen scroll background="cream">
      <View style={styles.brandRow}>
        <Text style={styles.g}>G</Text>
        <Text style={styles.three}>3</Text>
        <Text style={styles.brandSub}>LOGISTICS</Text>
      </View>

      {isDemo ? (
        <Card style={{ borderColor: c.danger, borderWidth: 1 }}>
          <Text style={[typography.h3, { color: c.text }]}>Modo demo activo</Text>
          <Text style={[typography.small, { color: c.textSoft }, { marginTop: spacing.xs }]}>
            Sin credenciales de Supabase. Entra como chofer ficticio para explorar la app con
            datos de ejemplo.
          </Text>
          <View style={{ marginTop: spacing.md + 2 }}>
            <Button title="ENTRAR EN MODO DEMO" variant="danger" onPress={signInAsDemo} />
          </View>
        </Card>
      ) : null}

      <Text style={[typography.h1, { color: c.text }, { marginBottom: 6 }]}>Bienvenido</Text>
      <Text style={[typography.small, { color: c.textSoft }, { marginBottom: spacing.lg }]}>
        Inicia sesión para entrar a tu unidad asignada.
      </Text>

      <TextField
        label="Teléfono"
        leftIcon={<PhoneIcon size={20} color={c.muted} />}
        keyboardType="phone-pad"
        placeholder="55 1234 5678"
        value={phone}
        onChangeText={setPhone}
        autoFocus={!isDemo}
        editable={!isDemo}
      />

      <Button title="Recibir código" onPress={onSubmit} loading={loading} disabled={isDemo} />
      <View style={{ height: spacing.md }} />
      <Button
        title="Entrar con correo"
        variant="outline"
        onPress={() => nav.navigate('EmailLogin')}
        disabled={isDemo}
      />

      <Text style={styles.footer}>© 2026 G3 Logistics</Text>
    </Screen>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginTop: spacing.lg, marginBottom: spacing.xl + 4 },
  g:     { color: c.text,  fontSize: 56, fontWeight: '900', fontStyle: 'italic', letterSpacing: -2, lineHeight: 56 },
  three: { color: c.blue,  fontSize: 56, fontWeight: '900', fontStyle: 'italic', letterSpacing: -2, lineHeight: 56 },
  brandSub: { color: c.text, fontSize: 14, fontWeight: '700', letterSpacing: 4, marginLeft: spacing.sm, marginBottom: 6 },
  footer: { textAlign: 'center', color: c.muted, fontSize: 12, marginTop: spacing.xl },
});
