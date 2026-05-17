import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { colors, radius, spacing } from '@/theme';

export type CardVariant = 'default' | 'flat' | 'accent';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  variant?: CardVariant;
  borderLeftColor?: string;
  padding?: number;
  style?: ViewStyle;
}

export function Card({ children, onPress, variant = 'default', borderLeftColor, padding, style }: Props) {
  const variantStyle =
    variant === 'flat'
      ? styles.flat
      : variant === 'accent'
        ? styles.accent
        : styles.default;
  const merged: ViewStyle[] = [
    styles.card,
    variantStyle,
    padding != null ? { padding } : null,
    borderLeftColor ? { borderLeftWidth: 4, borderLeftColor } : null,
    style,
  ].filter(Boolean) as ViewStyle[];

  const content = <View style={merged}>{children}</View>;
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: spacing.lg + 2,
    marginBottom: spacing.md,
  },
  default: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  flat: {
    backgroundColor: colors.surface,
  },
  accent: {
    // Gradiente real va envuelto fuera; aquí dejamos navy plano y delegamos.
    backgroundColor: colors.navy,
  },
});
