import React, { useState } from 'react';
import { Text, View, StyleSheet, Alert, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/common/Screen';
import { AppBar } from '@/components/common/AppBar';
import { Button } from '@/components/common/Button';
import { TextField } from '@/components/common/TextField';
import { MailIcon, LockIcon } from '@/components/icons';
import { useAuthStore } from '@/stores/auth';
import { useColors, spacing, typography } from '@/theme';
import type { ColorPalette } from '@/theme';
import type { AuthStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'EmailLogin'>;

export function EmailLoginScreen() {
  const c = useColors();
  const styles = makeStyles(c);
  const nav = useNavigation<Nav>();
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
    <Screen background="cream">
      <AppBar title="Entrar con correo" />
      <Text style={[typography.small, { color: c.textSoft }, { marginBottom: spacing.lg }]}>
        Acceso para personal de despacho y administración.
      </Text>

      <TextField
        label="Correo"
        leftIcon={<MailIcon size={20} color={c.muted} />}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextField
        label="Contraseña"
        leftIcon={<LockIcon size={20} color={c.muted} />}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <View style={styles.forgotRow}>
        <Pressable onPress={() => nav.navigate('ForgotPassword')}>
          <Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text>
        </Pressable>
      </View>

      <Button title="Entrar" onPress={onSubmit} loading={loading} />
    </Screen>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  forgotRow: { alignItems: 'flex-end', marginBottom: spacing.md + 2 },
  forgot: { color: c.blue, fontSize: 13, fontWeight: '600' },
});
