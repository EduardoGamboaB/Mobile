import React from 'react';
import { Text, View, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
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
  SparklesIcon,
} from '@/components/icons';
import { Chip } from '@/components/common/Chip';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { useSubscriptionStore } from '@/stores/subscription';
import { TierLabel } from '@/constants/tiers';
import { useColors, spacing, typography } from '@/theme';
import type { ColorPalette } from '@/theme';
import type { AppNav } from '@/navigation/types';

export function SettingsScreen() {
  const c = useColors();
  const styles = makeStyles(c);
  const nav = useNavigation<AppNav<'Settings'>>();
  const signOut = useAuthStore((s) => s.signOut);
  const night = useThemeStore((s) => s.night);
  const setNight = useThemeStore((s) => s.setNight);
  const tier = useSubscriptionStore((s) => s.tier);
  const [push, setPush] = React.useState(true);
  const [emailDigest, setEmailDigest] = React.useState(false);

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

        <Text style={[typography.eyebrow, { color: c.muted }]}>Mi plan</Text>
        <Card variant="flat" padding={0}>
          <SettingRow
            icon={<SparklesIcon color={tileIconColor('blue')} />}
            title={`Plan ${TierLabel[tier]}`}
            hint="Cambiar plan, ver beneficios y facturación"
            right={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Chip label={TierLabel[tier]} variant={tier === 'free' ? 'gray' : 'blue'} />
                <ChevronRightIcon color={c.muted} />
              </View>
            }
            onPress={() => nav.navigate('Plans')}
            last
          />
        </Card>

        <Text style={[typography.eyebrow, { color: c.muted }, { marginTop: spacing.md }]}>Apariencia</Text>
        <Card variant="flat" padding={0}>
          <SettingRow
            icon={<MoonIcon color={tileIconColor('blue')} />}
            title="Modo nocturno"
            hint="Activar de noche para reducir fatiga visual"
            right={<Toggle value={night} onChange={setNight} />}
          />
          <SettingRow
            icon={<GlobeIcon color={tileIconColor('blue')} />}
            title="Idioma"
            hint="Español"
            right={<ChevronRightIcon color={c.muted} />}
            last
          />
        </Card>

        <Text style={[typography.eyebrow, { color: c.muted }, { marginTop: spacing.md }]}>Notificaciones</Text>
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

        <Text style={[typography.eyebrow, { color: c.muted }, { marginTop: spacing.md }]}>Cuenta</Text>
        <Card variant="flat" padding={0}>
          <SettingRow
            icon={<LockIcon color={tileIconColor('blue')} />}
            title="Cambiar contraseña"
            right={<ChevronRightIcon color={c.muted} />}
          />
          <SettingRow
            tone="danger"
            icon={<LogOutIcon color={tileIconColor('danger')} />}
            title="Cerrar sesión"
            right={<ChevronRightIcon color={c.muted} />}
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
  const c = useColors();
  const styles = makeStyles(c);
  return (
    <Pressable onPress={onPress} style={[styles.row, last && styles.lastRow]}>
      <IconTile tone={tone}>{icon}</IconTile>
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={[typography.bodyStrong, { color: c.text }, tone === 'danger' && { color: c.danger }]}>
          {title}
        </Text>
        {hint ? <Text style={[typography.caption, { color: c.muted }]}>{hint}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  lastRow: { borderBottomWidth: 0 },
  version: { textAlign: 'center', color: c.muted, fontSize: 12, marginTop: spacing.lg },
});
