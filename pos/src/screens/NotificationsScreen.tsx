import React, { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useNotificationsStore } from '@/stores/notificationsStore';
import { formatDate } from '@/utils/ids';
import { Button, EmptyState } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme';

const TYPE_ICON: Record<string, string> = {
  low_stock: '⚠️',
  out_of_stock: '🚫',
  sync: '🔄',
  system: 'ℹ️',
};

const NotificationsScreen: React.FC = () => {
  const { items, unread, refresh, read, readAll } = useNotificationsStore();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return (
    <View style={styles.container}>
      {unread > 0 && (
        <View style={{ padding: spacing.md }}>
          <Button title={`Marcar todas como leídas (${unread})`} variant="secondary" onPress={() => void readAll()} />
        </View>
      )}
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: spacing.md, paddingTop: 0 }}
        ListEmptyComponent={
          <EmptyState
            icon="🔔"
            title="Sin notificaciones"
            subtitle="Aquí verás alertas de stock mínimo, productos agotados y avisos del sistema."
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.row, !item.read && styles.rowUnread]}
            onPress={() => void read(item.id)}
          >
            <Text style={{ fontSize: 22 }}>{TYPE_ICON[item.type] ?? '🔔'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, !item.read && { fontWeight: '700' }]}>{item.title}</Text>
              {item.body ? <Text style={typography.caption}>{item.body}</Text> : null}
              <Text style={[typography.caption, { marginTop: 2 }]}>{formatDate(item.date)}</Text>
            </View>
            {!item.read && <View style={styles.dot} />}
          </Pressable>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  rowUnread: { borderColor: colors.accent },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
});

export default NotificationsScreen;
