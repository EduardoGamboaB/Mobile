import React, { useState } from 'react';
import { Text, StyleSheet, Alert } from 'react-native';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/common/Button';
import { TextField } from '@/components/common/TextField';
import { useAuthStore } from '@/stores/auth';
import { spacing, typography } from '@/theme';

export function EmailLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const signIn = useAuthStore((s) => s.signInWithEmail);
  const loading = useAuthStore((s) => s.loading);

  const onSubmit = async () => {
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      Alert.alert('No se pudo iniciar sesión', msg);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Iniciar sesión</Text>
      <Text style={styles.sub}>Acceso para personal de despacho y administración.</Text>

      <TextField
        label="Correo"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextField
        label="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title="Entrar" onPress={onSubmit} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, marginTop: spacing.xl, marginBottom: spacing.xs },
  sub: { ...typography.small, marginBottom: spacing.lg },
});
