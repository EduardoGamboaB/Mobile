import React, { useState } from 'react';
import { Text, View, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { AppBar } from '@/components/common/AppBar';
import { Button } from '@/components/common/Button';
import { TextField } from '@/components/common/TextField';
import { IconTile, tileIconColor } from '@/components/common/IconTile';
import { MailIcon } from '@/components/icons';
import { supabase } from '@/api/supabase';
import { isDemo } from '@/demo';
import { useColors, spacing, typography } from '@/theme';
import type { ColorPalette } from '@/theme';

export function ForgotPasswordScreen() {
  const c = useColors();
  const styles = makeStyles(c);
  const nav = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email.includes('@')) {
      Alert.alert('Correo inválido', 'Escribe un correo válido.');
      return;
    }
    if (isDemo) {
      Alert.alert('Modo demo', 'En demo no enviamos correos.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) {
      Alert.alert('No se pudo enviar', error.message);
      return;
    }
    Alert.alert(
      'Listo',
      'Te enviamos un enlace para restablecer tu contraseña.',
      [{ text: 'OK', onPress: () => nav.goBack() }],
    );
  };

  return (
    <Screen background="cream">
      <AppBar title="Recuperar contraseña" />
      <View style={styles.headerWrap}>
        <View style={{ marginBottom: spacing.md }}>
          <IconTile tone="blue" size="lg">
            <MailIcon size={28} color={tileIconColor('blue')} />
          </IconTile>
        </View>
        <Text style={[typography.h2, { color: c.text }]}>¿Olvidaste tu contraseña?</Text>
        <Text style={[typography.small, { color: c.textSoft }, styles.center]}>
          Escribe tu correo y te enviaremos un enlace para restablecerla.
        </Text>
      </View>
      <TextField
        label="Correo"
        leftIcon={<MailIcon size={20} color={c.muted} />}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <Button title="Enviar enlace" onPress={onSubmit} loading={loading} />
      <View style={{ height: spacing.sm }} />
      <Button title="Volver al inicio" variant="ghost" onPress={() => nav.goBack()} />
    </Screen>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  headerWrap: { alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
  center: { textAlign: 'center', marginTop: spacing.xs, paddingHorizontal: spacing.lg },
});
