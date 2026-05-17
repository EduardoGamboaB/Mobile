import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { isDemo } from '@/demo';
import { colors, spacing } from '@/theme';

export function DemoBanner() {
  if (!isDemo) return null;
  return (
    <View style={styles.bar}>
      <Text style={styles.text}>MODO DEMO · DATOS FICTICIOS · SIN SUPABASE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.danger,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  text: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
});
