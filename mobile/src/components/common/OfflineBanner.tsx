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
    backgroundColor: colors.warning,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  text: { color: colors.bg, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
});
