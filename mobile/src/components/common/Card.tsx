import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { useColors, radius, spacing } from '@/theme';

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
  const c = useColors();
  const variantStyle: ViewStyle =
    variant === 'flat'
      ? { backgroundColor: c.surface }
      : variant === 'accent'
        ? { backgroundColor: c.navy }
        : { backgroundColor: c.bg, borderWidth: 1, borderColor: c.border };

  const merged: ViewStyle[] = [
    {
      borderRadius: radius.card,
      padding: spacing.lg + 2,
      marginBottom: spacing.md,
    },
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
