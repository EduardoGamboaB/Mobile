import React, { ReactNode } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string | null;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  containerStyle?: ViewStyle;
}

export function TextField({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  containerStyle,
  style,
  multiline,
  ...rest
}: Props) {
  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.input,
          multiline && styles.inputMulti,
          error ? styles.inputError : null,
        ]}
      >
        {leftIcon ? <View style={{ marginRight: spacing.sm }}>{leftIcon}</View> : null}
        <TextInput
          placeholderTextColor={colors.muted}
          style={[styles.text, multiline && { textAlignVertical: 'top' }, style]}
          multiline={multiline}
          {...rest}
        />
        {rightIcon ? <View style={{ marginLeft: spacing.sm }}>{rightIcon}</View> : null}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md + 2 },
  label: { ...typography.eyebrow, marginBottom: 6 },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    paddingHorizontal: spacing.md + 4,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  inputMulti: { height: 100, paddingVertical: spacing.md, alignItems: 'flex-start' },
  inputError: { borderColor: colors.danger },
  text: { flex: 1, fontSize: 16, color: colors.text },
  error: { color: colors.danger, fontSize: 12, marginTop: spacing.xs },
  hint: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },
});
