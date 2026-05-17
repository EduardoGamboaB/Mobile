import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '@/theme';

export type BannerTone = 'info' | 'warning' | 'danger' | 'success';

interface Props {
  icon?: ReactNode;
  children: ReactNode;
  tone?: BannerTone;
}

const tones: Record<BannerTone, { bg: string; fg: string }> = {
  info:    { bg: colors.blueLight, fg: colors.blue },
  warning: { bg: colors.warningBg, fg: '#92400E' },
  danger:  { bg: colors.dangerBg,  fg: '#991B1B' },
  success: { bg: colors.successBg, fg: '#166534' },
};

export function Banner({ icon, children, tone = 'info' }: Props) {
  const { bg, fg } = tones[tone];
  return (
    <View style={[styles.bar, { backgroundColor: bg }]}>
      {icon ? <View style={{ marginRight: spacing.sm }}>{icon}</View> : null}
      <Text style={[styles.text, { color: fg }]}>{children}</Text>
    </View>
  );
}

export const bannerIconColor = (tone: BannerTone): string => tones[tone].fg;

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
