import React, { useState } from 'react';
import { Text, StyleSheet, Alert } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/common/Button';
import { TextField } from '@/components/common/TextField';
import { useAuthStore } from '@/stores/auth';
import { spacing, typography } from '@/theme';
import type { AuthStackParamList } from '@/navigation/types';

export function OtpVerifyScreen() {
  const route = useRoute<RouteProp<AuthStackParamList, 'OtpVerify'>>();
  const [code, setCode] = useState('');
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const loading = useAuthStore((s) => s.loading);

  const onSubmit = async () => {
    if (code.length !== 6) {
      Alert.alert('Código incompleto', 'Debe tener 6 dígitos.');
      return;
    }
    try {
      await verifyOtp(route.params.phone, code);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      Alert.alert('Código inválido', msg);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Código de verificación</Text>
      <Text style={styles.sub}>Enviamos un SMS a {route.params.phone}</Text>

      <TextField
        label="Código (6 dígitos)"
        keyboardType="number-pad"
        maxLength={6}
        placeholder="123456"
        value={code}
        onChangeText={setCode}
        autoFocus
      />

      <Button title="Verificar" onPress={onSubmit} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, marginTop: spacing.xl, marginBottom: spacing.xs },
  sub: { ...typography.small, marginBottom: spacing.lg },
});
