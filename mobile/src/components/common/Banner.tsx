import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors, radius, spacing } from '@/theme';

export type BannerTone = 'info' | 'warning' | 'danger' | 'success';

interface Props {
  icon?: ReactNode;
  children: ReactNode;
  tone?: BannerTone;
}

export function Banner({ icon, children, tone = 'info' }: Props) {
  const c = useColors();
  const tones: Record<BannerTone, { bg: string; fg: string }> = {
    info:    { bg: c.infoBg,     fg: c.blue },
    warning: { bg: c.warningBg,  fg: c.warning },
    danger:  { bg: c.dangerBg,   fg: c.danger },
    success: { bg: c.successBg,  fg: c.success },
  };
  const { bg, fg } = tones[tone];
  return (
    <View style={[styles.bar, { backgroundColor: bg }]}>
      {icon ? <View style={{ marginRight: spacing.sm }}>{icon}</View> : null}
      <Text style={[styles.text, { color: fg }]}>{children}</Text>
    </View>
  );
}

export function useBannerIconColor(tone: BannerTone): string {
  const c = useColors();
  const map: Record<BannerTone, string> = {
    info: c.blue,
    warning: c.warning,
    danger: c.danger,
    success: c.success,
  };
  return map[tone];
}

/** @deprecated usar useBannerIconColor — se mantiene para callers existentes. */
export const bannerIconColor = (tone: BannerTone): string => {
  const fallback: Record<BannerTone, string> = {
    info: '#2E86C1',
    warning: '#D97706',
    danger: '#DC2626',
    success: '#16A34A',
  };
  return fallback[tone];
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
    borderRadius: radius.button,
    marginBottom: spacing.md,
  },
  text: { fontSize: 13, fontWeight: '600', flex: 1 },
});
