import React, { useState } from 'react';
import { Text, View, StyleSheet, ScrollView, Alert } from 'react-native';
import Constants from 'expo-constants';
import { Screen } from '@/components/common/Screen';
import { Card } from '@/components/common/Card';
import { AppBar } from '@/components/common/AppBar';
import { IconTile, tileIconColor } from '@/components/common/IconTile';
import { Toggle } from '@/components/common/Toggle';
import {
  MoonIcon,
  GlobeIcon,
  BellIcon,
  MailIcon,
  LockIcon,
  LogOutIcon,
  ChevronRightIcon,
} from '@/components/icons';
import { useAuthStore } from '@/stores/auth';
import { colors, spacing, typography } from '@/theme';

export function SettingsScreen() {
  const signOut = useAuthStore((s) => s.signOut);
  const [night, setNight] = useState(true);
  const [push, setPush] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);

  const version = (Constants.expoConfig?.version ?? '0.1.0') + ' (build ' +
    ((Constants.expoConfig as { runtimeVersion?: string })?.runtimeVersion ?? 'dev') + ')';

  const onLogout = () => {
    Alert.alert('Cerrar sesión', '¿Salir de la app?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg + 4 }}>
        <AppBar title="Ajustes" />

        <Text style={typography.eyebrow}>Apariencia</Text>
        <Card variant="flat" padding={0}>
          <SettingRow
            icon={<MoonIcon color={tileIconColor('blue')} />}
            title="Modo nocturno"
            hint="Activar de noche automáticamente"
            right={<Toggle value={night} onChange={setNight} />}
          />
          <SettingRow
            icon={<GlobeIcon color={tileIconColor('blue')} />}
            title="Idioma"
            hint="Español"
            right={<ChevronRightIcon color={colors.muted} />}
            last
          />
        </Card>

        <Text style={[typography.eyebrow, { marginTop: spacing.md }]}>Notificaciones</Text>
        <Card variant="flat" padding={0}>
          <SettingRow
            icon={<BellIcon color={tileIconColor('blue')} />}
            title="Push"
            hint="Nuevos viajes e incidencias"
            right={<Toggle value={push} onChange={setPush} />}
          />
          <SettingRow
            icon={<MailIcon color={tileIconColor('blue')} />}
            title="Por correo"
            hint="Resumen semanal"
            right={<Toggle value={emailDigest} onChange={setEmailDigest} />}
            last
          />
        </Card>

        <Text style={[typography.eyebrow, { marginTop: spacing.md }]}>Cuenta</Text>
        <Card variant="flat" padding={0}>
          <SettingRow
            icon={<LockIcon color={tileIconColor('blue')} />}
            title="Cambiar contraseña"
            right={<ChevronRightIcon color={colors.muted} />}
          />
          <SettingRow
            tone="danger"
            icon={<LogOutIcon color={tileIconColor('danger')} />}
            title="Cerrar sesión"
            right={<ChevronRightIcon color={colors.muted} />}
            onPress={onLogout}
            last
          />
        </Card>

        <Text style={styles.version}>G3 Logistics · v{version}</Text>
      </ScrollView>
    </Screen>
  );
}

function SettingRow({
  icon,
  title,
  hint,
  right,
  last,
  onPress,
  tone = 'blue',
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  right?: React.ReactNode;
  last?: boolean;
  onPress?: () => void;
  tone?: 'blue' | 'danger';
}) {
  return (
    <View
      style={[styles.row, last && styles.lastRow]}
      onTouchEnd={onPress}
    >
      <IconTile tone={tone}>{icon}</IconTile>
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={[typography.bodyStrong, tone === 'danger' && { color: colors.danger }]}>
          {title}
        </Text>
        {hint ? <Text style={typography.caption}>{hint}</Text> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lastRow: { borderBottomWidth: 0 },
  version: { textAlign: 'center', color: colors.muted, fontSize: 12, marginTop: spacing.lg },
});
