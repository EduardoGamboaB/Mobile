import React, { useState } from 'react';
import { Text, View, StyleSheet, Alert } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { AppBar } from '@/components/common/AppBar';
import { Button } from '@/components/common/Button';
import { OtpInput } from '@/components/common/OtpInput';
import { IconTile, tileIconColor } from '@/components/common/IconTile';
import { LockIcon } from '@/components/icons';
import { useAuthStore } from '@/stores/auth';
import { useColors, spacing, typography } from '@/theme';
import type { ColorPalette } from '@/theme';
import type { AuthStackParamList } from '@/navigation/types';

export function OtpVerifyScreen() {
  const c = useColors();
  const styles = makeStyles(c);
  const route = useRoute<RouteProp<AuthStackParamList, 'OtpVerify'>>();
  const [code, setCode] = useState('');
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const loading = useAuthStore((s) => s.loading);

  const onSubmit = async (value?: string) => {
    const v = value ?? code;
    if (v.length !== 6) {
      Alert.alert('Código incompleto', 'Debe tener 6 dígitos.');
      return;
    }
    try {
      await verifyOtp(route.params.phone, v);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      Alert.alert('Código inválido', msg);
    }
  };

  return (
    <Screen background="cream">
      <AppBar title="Verificación" />
      <View style={styles.headerWrap}>
        <View style={{ marginBottom: spacing.md }}>
          <IconTile tone="blue" size="lg">
            <LockIcon size={28} color={tileIconColor('blue')} />
          </IconTile>
        </View>
        <Text style={[typography.h2, { color: c.text }]}>Código de verificación</Text>
        <Text style={[typography.small, { color: c.textSoft }, styles.center]}>
          Enviamos un SMS de 6 dígitos a{'\n'}
          <Text style={{ color: c.text, fontWeight: '700' }}>{route.params.phone}</Text>
        </Text>
      </View>

      <OtpInput value={code} onChange={setCode} onComplete={onSubmit} />

      <Text style={styles.resend}>
        Reenviar código en <Text style={{ color: c.text, fontWeight: '700' }}>28 s</Text>
      </Text>

      <View style={{ marginTop: spacing.xl }}>
        <Button title="Verificar" onPress={() => onSubmit()} loading={loading} />
      </View>
    </Screen>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  headerWrap: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xl + 4 },
  center: { textAlign: 'center', marginTop: spacing.xs },
  resend: { textAlign: 'center', marginTop: spacing.lg, fontSize: 13, color: c.muted },
});
