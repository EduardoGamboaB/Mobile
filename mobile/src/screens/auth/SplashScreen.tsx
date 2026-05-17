import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { spacing } from '@/theme';

/**
 * Splash con identidad G3 — bg navy fijo (no reactivo al tema) para que el
 * logo se mantenga legible en ambos modos del resto de la app.
 */
export function SplashScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <View style={styles.logoRow}>
          <Text style={styles.g}>G</Text>
          <Text style={styles.three}>3</Text>
        </View>
        <Text style={styles.subtitle}>LOGISTICS</Text>
        <View style={styles.bar} />
        <Text style={styles.tag}>APP DE OPERADOR · V1.0</Text>
      </View>
      <Text style={styles.footer}>Operación · Tecnología · Datos</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0E2A47', alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  g:     { color: '#FFFFFF', fontSize: 96, fontWeight: '900', fontStyle: 'italic', letterSpacing: -4, lineHeight: 96 },
  three: { color: '#5BA8DD', fontSize: 96, fontWeight: '900', fontStyle: 'italic', letterSpacing: -4, lineHeight: 96 },
  subtitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', letterSpacing: 6, marginTop: -4 },
  bar: { width: 48, height: 2, backgroundColor: '#2E86C1', marginVertical: spacing.lg },
  tag: { color: 'rgba(255,255,255,0.65)', fontSize: 13, letterSpacing: 2 },
  footer: {
    position: 'absolute',
    bottom: spacing.xxl + 4,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    letterSpacing: 1,
  },
});
