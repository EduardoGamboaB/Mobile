import React, { ReactNode } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  PressableProps,
  View,
} from 'react-native';
import { useColors, radius, spacing } from '@/theme';

type Variant = 'primary' | 'accent' | 'outline' | 'ghost' | 'danger';
type Size = 'lg' | 'md' | 'sm';

interface Props extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  style?: ViewStyle;
}

const sizeStyles: Record<Size, { h: number; fs: number; px: number }> = {
  lg: { h: 54, fs: 15, px: spacing.lg + 2 },
  md: { h: 44, fs: 14, px: spacing.lg },
  sm: { h: 38, fs: 13, px: spacing.md + 2 },
};

export function Button({
  title,
  variant = 'primary',
  size = 'lg',
  loading,
  disabled,
  fullWidth = true,
  leftIcon,
  rightIcon,
  style,
  ...rest
}: Props) {
  const c = useColors();
  const variantStyles: Record<Variant, { bg: string; fg: string; border: string }> = {
    primary: { bg: c.navy,    fg: '#FFFFFF', border: 'transparent' },
    accent:  { bg: c.blue,    fg: '#FFFFFF', border: 'transparent' },
    outline: { bg: c.bg,      fg: c.text,    border: c.border },
    ghost:   { bg: 'transparent', fg: c.text, border: 'transparent' },
    danger:  { bg: c.danger,  fg: '#FFFFFF', border: 'transparent' },
  };
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  return (
    <Pressable
      {...rest}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          height: s.h,
          paddingHorizontal: s.px,
          backgroundColor: v.bg,
          borderColor: v.border,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.inner}>
          {leftIcon ? <View style={{ marginRight: spacing.sm }}>{leftIcon}</View> : null}
          <Text style={[styles.text, { color: v.fg, fontSize: s.fs }]}>{title}</Text>
          {rightIcon ? <View style={{ marginLeft: spacing.sm }}>{rightIcon}</View> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.button,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '700', letterSpacing: 0.2 },
});
