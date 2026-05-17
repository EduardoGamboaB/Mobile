import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/common/Button';
import { TextField } from '@/components/common/TextField';
import { useAuthStore } from '@/stores/auth';
import { colors, spacing, typography } from '@/theme';
import type { AuthStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'PhoneLogin'>;

export function PhoneLoginScreen() {
  const nav = useNavigation<Nav>();
  const [phone, setPhone] = useState('');
  const loading = useAuthStore((s) => s.loading);
  const signInWithPhone = useAuthStore((s) => s.signInWithPhone);

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
    <Screen>
      <View style={styles.header}>
        <Text style={styles.brand}>G3 LOGISTICS</Text>
        <Text style={styles.tag}>Aplicación de operador</Text>
      </View>
      <Text style={styles.title}>Inicia sesión</Text>
      <Text style={styles.sub}>Te enviaremos un código por SMS a tu teléfono.</Text>

      <TextField
        label="Teléfono"
        keyboardType="phone-pad"
        placeholder="55 1234 5678"
        value={phone}
        onChangeText={setPhone}
        autoFocus
      />

      <Button title="Recibir código" onPress={onSubmit} loading={loading} />

      <View style={{ height: spacing.lg }} />
      <Button
        title="Entrar con correo"
        variant="ghost"
        onPress={() => nav.navigate('EmailLogin')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xxl },
  brand: { ...typography.h1, color: colors.text, letterSpacing: 2 },
  tag: { ...typography.small, marginTop: spacing.xs },
  title: { ...typography.h2, marginBottom: spacing.xs },
  sub: { ...typography.small, marginBottom: spacing.lg },
});
