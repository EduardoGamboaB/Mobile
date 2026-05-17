import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetwork } from '@/hooks/useNetwork';
import { colors, spacing } from '@/theme';

export function OfflineBanner() {
  const online = useNetwork();
  if (online) return null;
  return (
    <View style={styles.bar}>
      <Text style={styles.text}>SIN CONEXIÓN · LOS REGISTROS SE GUARDAN LOCALMENTE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#92400E',
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  text: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
});
