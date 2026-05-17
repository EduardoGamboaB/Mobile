import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '@/components/common/Screen';
import { AppBar } from '@/components/common/AppBar';
import { Card } from '@/components/common/Card';
import { Chip } from '@/components/common/Chip';
import { IconTile } from '@/components/common/IconTile';
import { SearchIcon } from '@/components/icons';
import { demoStore } from '@/demo';
import { useColors, spacing, typography } from '@/theme';
import type { ColorPalette } from '@/theme';
import type { DemoChatPreview } from '@/demo/data';
import type { AppNav } from '@/navigation/types';

function relDay(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 24) return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const d = Math.floor(h / 24);
  if (d === 1) return 'ayer';
  if (d < 7) return `${d} d`;
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

function Avatar({ chat }: { chat: DemoChatPreview }) {
  const c = useColors();
  const styles = makeStyles(c);
  return (
    <View
      style={[
        styles.avatar,
        {
          backgroundColor: chat.avatarGradient[0],
        },
      ]}
    >
      <Text style={styles.avatarText}>{chat.initials}</Text>
    </View>
  );
}

export function ChatListScreen() {
  const c = useColors();
  const styles = makeStyles(c);
  const nav = useNavigation<AppNav<'ChatList'>>();
  const [chats, setChats] = useState<DemoChatPreview[]>([]);

  useEffect(() => {
    demoStore.listChats().then(setChats);
  }, []);

  return (
    <Screen padded={false}>
      <View style={{ padding: spacing.lg + 4 }}>
        <AppBar
          title="Mensajes"
          right={
            <IconTile tone="navy">
              <SearchIcon color={c.navy} />
            </IconTile>
          }
        />
      </View>
      <FlatList
        contentContainerStyle={{ paddingHorizontal: spacing.lg + 4, paddingBottom: spacing.xxl }}
        data={chats}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => nav.navigate('ChatThread', { chatId: item.id, title: item.name })}>
            <Card style={styles.row}>
              <Avatar chat={item} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <View style={styles.head}>
                  <Text style={[typography.bodyStrong, { color: c.text }]}>{item.name}</Text>
                  <Text style={[typography.caption, { color: c.muted }]}>{relDay(item.lastAt)}</Text>
                </View>
                <Text style={[typography.small, { color: c.textSoft }, { marginTop: 2 }]} numberOfLines={1}>
                  {item.lastMessage}
                </Text>
              </View>
              {item.unread ? (
                <Chip label={String(item.unread)} variant="blue" style={{ marginLeft: spacing.sm }} />
              ) : null}
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const makeStyles = (c: ColorPalette) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
