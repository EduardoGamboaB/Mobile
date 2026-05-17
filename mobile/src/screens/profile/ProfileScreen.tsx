import React from 'react';
import { Text, View, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Chip } from '@/components/common/Chip';
import { Avatar } from '@/components/common/Avatar';
import { IconTile } from '@/components/common/IconTile';
import {
  SettingsIcon,
  PhoneIcon,
  MailIcon,
  IdCardIcon,
  CalendarIcon,
  TruckIcon,
  BuildingIcon,
  LogOutIcon,
} from '@/components/icons';
import { useAuthStore } from '@/stores/auth';
import { colors, spacing, typography } from '@/theme';
import type { TabNav } from '@/navigation/types';

export function ProfileScreen() {
  const nav = useNavigation<TabNav<'Profile'>>();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  const expSoon = (() => {
    if (!profile?.license_expires_at) return false;
    const days = (new Date(profile.license_expires_at).getTime() - Date.now()) / 86_400_000;
    return days >= 0 && days <= 30;
  })();

  const onLogout = () => {
    Alert.alert('Cerrar sesión', '¿Salir de la app?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg + 4, paddingBottom: spacing.xxl }}>
        <View style={styles.headerRow}>
          <Avatar name={profile?.full_name ?? '?'} size={64} />
          <View style={{ flex: 1, marginLeft: spacing.md + 2 }}>
            <Text style={typography.h2}>{profile?.full_name ?? 'Operador'}</Text>
            <View style={styles.badges}>
              <Chip label={profile?.role ?? 'driver'} variant="blue" />
              <Chip label={profile?.status ?? 'pending'} variant="green" />
            </View>
          </View>
          <Pressable onPress={() => nav.navigate('Settings')}>
            <IconTile tone="navy">
              <SettingsIcon color={colors.navy} />
            </IconTile>
          </Pressable>
        </View>

        <Card>
          <Text style={typography.eyebrow}>Contacto</Text>
          <Row icon={<PhoneIcon size={18} color={colors.muted} />} label="Teléfono" value={profile?.phone ?? '—'} />
          <Row icon={<MailIcon size={18} color={colors.muted} />} label="Correo" value={profile?.email ?? '—'} last />
        </Card>

        <Card>
          <Text style={typography.eyebrow}>Documentos</Text>
          <Row icon={<IdCardIcon size={18} color={colors.muted} />} label="Licencia federal" value={profile?.federal_license ?? '—'} />
          <Row
            icon={<CalendarIcon size={18} color={colors.muted} />}
            label="Vence en"
            value={profile?.license_expires_at ?? '—'}
            badge={expSoon ? <Chip label="Renovar" variant="amber" /> : undefined}
            last
          />
        </Card>

        <Card>
          <Text style={typography.eyebrow}>Unidad asignada</Text>
          <Row
            icon={<TruckIcon size={18} color={colors.muted} />}
            label="Número"
            value={`${profile?.assigned_unit_number ?? '—'}${profile?.unit_type ? ` · ${profile.unit_type}` : ''}`}
          />
          <Row
            icon={<BuildingIcon size={18} color={colors.muted} />}
            label="Placas"
            value={`${profile?.tractor_plates ?? '—'}${profile?.trailer_plates ? ` · ${profile.trailer_plates}` : ''}`}
            last
          />
        </Card>

        <Button
          title="Cerrar sesión"
          variant="outline"
          leftIcon={<LogOutIcon size={20} color={colors.danger} />}
          onPress={onLogout}
          style={{ borderColor: '#FCA5A5', marginTop: spacing.md }}
        />
      </ScrollView>
    </Screen>
  );
}

function Row({
  icon,
  label,
  value,
  badge,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.lastRow]}>
      {icon}
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={typography.caption}>{label}</Text>
        <Text style={typography.body}>{value}</Text>
      </View>
      {badge}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  badges: { flexDirection: 'row', gap: spacing.xs + 2, marginTop: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lastRow: { borderBottomWidth: 0 },
});
