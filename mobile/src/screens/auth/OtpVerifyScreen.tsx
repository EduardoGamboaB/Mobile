import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet, Alert, Pressable } from 'react-native';
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
import { authErrorMessage, otpSentHint } from '@/utils/authMessages';

/** Espera antes de permitir reenviar el código (el backend además limita por número). */
const RESEND_AFTER_SEC = 30;

export function OtpVerifyScreen() {
  const c = useColors();
  const styles = makeStyles(c);
  const route = useRoute<RouteProp<AuthStackParamList, 'OtpVerify'>>();
  const [code, setCode] = useState('');
  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const signInWithPhone = useAuthStore((s) => s.signInWithPhone);
  const loading = useAuthStore((s) => s.loading);
  const [resendIn, setResendIn] = useState(RESEND_AFTER_SEC);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const onResend = async () => {
    try {
      await signInWithPhone(route.params.phone);
      setCode('');
      setResendIn(RESEND_AFTER_SEC);
      Alert.alert('Código reenviado', otpSentHint(route.params.phone));
    } catch (e) {
      const m = authErrorMessage(e, 'otp_request');
      Alert.alert(m.title, m.message);
    }
  };

  const onSubmit = async (value?: string) => {
    const v = value ?? code;
    if (v.length !== 6) {
      Alert.alert('Código incompleto', 'Debe tener 6 dígitos.');
      return;
    }
    try {
      await verifyOtp(route.params.phone, v);
    } catch (e) {
      const m = authErrorMessage(e, 'otp_verify');
      setCode('');
      Alert.alert(m.title, m.message);
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
          {otpSentHint(route.params.phone)}
        </Text>
      </View>

      <OtpInput value={code} onChange={setCode} onComplete={onSubmit} />

      {resendIn > 0 ? (
        <Text style={styles.resend}>
          Reenviar código en <Text style={{ color: c.text, fontWeight: '700' }}>{resendIn} s</Text>
        </Text>
      ) : (
        <Pressable onPress={onResend} disabled={loading} accessibilityRole="button">
          <Text style={[styles.resend, { color: c.blue, fontWeight: '700' }]}>Reenviar código</Text>
        </Pressable>
      )}

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
