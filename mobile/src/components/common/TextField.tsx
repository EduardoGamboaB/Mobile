import React, { ReactNode } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { useColors, radius, spacing, typography } from '@/theme';

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
  const c = useColors();
  return (
    <View style={[{ marginBottom: spacing.md + 2 }, containerStyle]}>
      {label ? (
        <Text style={[typography.eyebrow, { color: c.muted, marginBottom: 6 }]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.input,
          {
            backgroundColor: c.surface,
            borderColor: error ? c.danger : c.border,
          },
          multiline && styles.inputMulti,
        ]}
      >
        {leftIcon ? <View style={{ marginRight: spacing.sm }}>{leftIcon}</View> : null}
        <TextInput
          placeholderTextColor={c.muted}
          style={[
            styles.text,
            { color: c.text },
            multiline && { textAlignVertical: 'top' },
            style,
          ]}
          multiline={multiline}
          {...rest}
        />
        {rightIcon ? <View style={{ marginLeft: spacing.sm }}>{rightIcon}</View> : null}
      </View>
      {error ? (
        <Text style={[styles.error, { color: c.danger }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.hint, { color: c.muted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    paddingHorizontal: spacing.md + 4,
    borderRadius: radius.button,
    borderWidth: 1,
  },
  inputMulti: { height: 100, paddingVertical: spacing.md, alignItems: 'flex-start' },
  text: { flex: 1, fontSize: 16 },
  error: { fontSize: 12, marginTop: spacing.xs },
  hint: { fontSize: 12, marginTop: spacing.xs },
});
