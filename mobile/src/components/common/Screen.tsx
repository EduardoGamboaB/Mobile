import React, { ReactNode } from 'react';
import { View, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';
import { OfflineBanner } from './OfflineBanner';
import { DemoBanner } from './DemoBanner';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  /** 'bg' (blanco), 'cream' (surface), o un color custom. Por defecto cream. */
  background?: 'bg' | 'cream' | string;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  hideBanners?: boolean;
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  background = 'cream',
  style,
  contentStyle,
  hideBanners,
}: Props) {
  const bg =
    background === 'bg'
      ? colors.bg
      : background === 'cream'
        ? colors.surface
        : background;

  const inner = (
    <View style={[styles.inner, padded && styles.padded, contentStyle]}>{children}</View>
  );
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }, style]} edges={['top']}>
      {!hideBanners ? <DemoBanner /> : null}
      {!hideBanners ? <OfflineBanner /> : null}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[padded && styles.padded, contentStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  inner: { flex: 1 },
  padded: { padding: spacing.lg + 4 },
});
