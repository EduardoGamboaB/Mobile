import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { AppBar } from '@/components/common/AppBar';
import { Card } from '@/components/common/Card';
import { IconTile, tileIconColor, type IconTileTone } from '@/components/common/IconTile';
import {
  TruckIcon,
  CheckCircleIcon,
  IdCardIcon,
  DollarIcon,
  BellIcon,
} from '@/components/icons';
import { demoStore } from '@/demo';
import { colors, spacing, typography } from '@/theme';
import type { DemoNotification } from '@/demo/data';

const ICON_MAP: Record<DemoNotification['kind'], { icon: React.FC<{ size?: number; color?: string }>; tone: IconTileTone }> = {
  trip:     { icon: TruckIcon,        tone: 'blue' },
  incident: { icon: CheckCircleIcon,  tone: 'success' },
  doc:      { icon: IdCardIcon,       tone: 'amber' },
  payment:  { icon: DollarIcon,       tone: 'blue' },
  dispatch: { icon: BellIcon,         tone: 'amber' },
};

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} día${d === 1 ? '' : 's'}`;
}

export function NotificationsScreen() {
  const nav = useNavigation();
  const [items, setItems] = useState<DemoNotification[]>([]);

  useEffect(() => {
    demoStore.listNotifications().then(setItems);
  }, []);

  const markAllRead = async () => {
    await demoStore.markAllRead();
    setItems(await demoStore.listNotifications());
  };

  const today = items.filter((n) => Date.now() - new Date(n.createdAt).getTime() < 86_400_000);
  const earlier = items.filter((n) => Date.now() - new Date(n.createdAt).getTime() >= 86_400_000);

  return (
    <Screen padded={false}>
      <View style={{ padding: spacing.lg + 4 }}>
        <AppBar
          title="Notificaciones"
          right={
            <Pressable onPress={markAllRead}>
              <Text style={styles.action}>Marcar leídas</Text>
            </Pressable>
          }
        />
      </View>
      <FlatList
        contentContainerStyle={{ paddingHorizontal: spacing.lg + 4, paddingBottom: spacing.xxl }}
        data={[
          ...(today.length ? [{ kind: 'header', label: 'Hoy' } as const] : []),
          ...today.map((n) => ({ kind: 'item', n } as const)),
          ...(earlier.length ? [{ kind: 'header', label: 'Anteriores' } as const] : []),
          ...earlier.map((n) => ({ kind: 'item', n } as const)),
        ]}
        keyExtractor={(row, i) => (row.kind === 'item' ? row.n.id : `h-${i}`)}
        renderItem={({ item }) => {
          if (item.kind === 'header') {
            return <Text style={styles.section}>{item.label}</Text>;
          }
          const conf = ICON_MAP[item.n.kind];
          const Icon = conf.icon;
          return (
            <Card
              borderLeftColor={item.n.read ? undefined : colors.blue}
              style={styles.row}
            >
              <IconTile tone={conf.tone}>
                <Icon color={tileIconColor(conf.tone)} />
              </IconTile>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={typography.bodyStrong}>{item.n.title}</Text>
                <Text style={[typography.small, { marginTop: 2 }]}>{item.n.body}</Text>
                <Text style={[typography.caption, { marginTop: 4 }]}>
                  {relTime(item.n.createdAt)}
                </Text>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          <Text style={[typography.body, { textAlign: 'center', marginTop: spacing.xl }]}>
            No hay notificaciones.
          </Text>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  action: { fontSize: 13, color: colors.blue, fontWeight: '600' },
  section: { ...typography.eyebrow, marginTop: spacing.md, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
});
