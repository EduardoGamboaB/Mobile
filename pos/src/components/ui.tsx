import React from 'react';
import {
  ActivityIndicator,
  KeyboardTypeOptions,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

// ── Botón ────────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export const Button: React.FC<{
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}> = ({ title, onPress, variant = 'primary', disabled, loading, style }) => {
  const bg =
    variant === 'primary' ? colors.accent
    : variant === 'danger' ? colors.danger
    : variant === 'secondary' ? colors.primarySoft
    : 'transparent';
  const fg = variant === 'ghost' ? colors.accent : colors.white;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: colors.accent },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
      )}
    </Pressable>
  );
};

// ── Input con etiqueta ───────────────────────────────────────────────────────

export const Field: React.FC<{
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  rightElement?: React.ReactNode;
}> = ({ label, value, onChangeText, placeholder, keyboardType, multiline, autoCapitalize, rightElement }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <TextInput
        style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }, { flex: 1 }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
      />
      {rightElement}
    </View>
  </View>
);

// ── Tarjeta ──────────────────────────────────────────────────────────────────

export const Card: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

// ── Encabezado de sección ────────────────────────────────────────────────────

export const SectionHeader: React.FC<{ title: string; right?: React.ReactNode }> = ({ title, right }) => (
  <View style={styles.sectionHeader}>
    <Text style={typography.subtitle}>{title}</Text>
    {right}
  </View>
);

// ── Estado vacío ─────────────────────────────────────────────────────────────

export const EmptyState: React.FC<{ icon?: string; title: string; subtitle?: string }> = ({
  icon = '📦',
  title,
  subtitle,
}) => (
  <View style={styles.empty}>
    <Text style={{ fontSize: 40 }}>{icon}</Text>
    <Text style={[typography.subtitle, { marginTop: spacing.sm }]}>{title}</Text>
    {subtitle ? <Text style={[typography.caption, { textAlign: 'center', marginTop: 4 }]}>{subtitle}</Text> : null}
  </View>
);

// ── Insignia (badge) ─────────────────────────────────────────────────────────

export const Badge: React.FC<{ text: string; tone?: 'success' | 'warning' | 'danger' | 'neutral' }> = ({
  text,
  tone = 'neutral',
}) => {
  const map = {
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    neutral: { bg: colors.border, fg: colors.textSecondary },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: map.bg }]}>
      <Text style={{ color: map.fg, fontSize: 11, fontWeight: '600' }}>{text}</Text>
    </View>
  );
};

// ── Métrica para reportes ────────────────────────────────────────────────────

export const StatTile: React.FC<{ label: string; value: string; tone?: 'accent' | 'success' | 'warning' | 'danger' }> = ({
  label,
  value,
  tone,
}) => (
  <View style={styles.statTile}>
    <Text style={typography.caption}>{label}</Text>
    <Text
      style={[
        { fontSize: 18, fontWeight: '700', marginTop: 2 },
        { color: tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : tone === 'danger' ? colors.danger : colors.text },
      ]}
    >
      {value}
    </Text>
  </View>
);

// ── Barra de búsqueda ────────────────────────────────────────────────────────

export const SearchBar: React.FC<{
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  onScanPress?: () => void;
}> = ({ value, onChangeText, placeholder = 'Buscar…', onScanPress }) => (
  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
    <TextInput
      style={[styles.input, { flex: 1 }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      autoCapitalize="none"
    />
    {onScanPress ? (
      <Pressable style={styles.scanButton} onPress={onScanPress}>
        <Text style={{ fontSize: 18 }}>📷</Text>
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 15, fontWeight: '600' },
  field: { marginBottom: spacing.md },
  fieldLabel: { ...typography.caption, marginBottom: 4, fontWeight: '600' },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  empty: { alignItems: 'center', padding: spacing.xl },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  statTile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  scanButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
});
