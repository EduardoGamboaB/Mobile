import React, { ReactNode } from 'react';
import { View, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/theme';
import { useResponsive } from '@/hooks/useResponsive';
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
  const c = useColors();
  const r = useResponsive();
  const bg =
    background === 'bg'
      ? c.bg
      : background === 'cream'
        ? c.surface
        : background;

  const paddingStyle: ViewStyle | null = padded ? { padding: r.pagePadding } : null;

  const wrapStyle = r.isTablet
    ? { paddingHorizontal: Math.max(r.pagePadding, (r.width - r.contentMaxWidth) / 2) }
    : null;

  const inner = (
    <View style={[styles.inner, paddingStyle, wrapStyle, contentStyle]}>
      {children}
    </View>
  );
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }, style]} edges={['top']}>
      {!hideBanners ? <DemoBanner /> : null}
      {!hideBanners ? <OfflineBanner /> : null}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[paddingStyle, wrapStyle, contentStyle] as ViewStyle[]}
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
});
