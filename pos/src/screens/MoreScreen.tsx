import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNotificationsStore } from '@/stores/notificationsStore';
import { useSyncStore } from '@/stores/syncStore';
import { syncNow } from '@/services/sync';
import { Badge } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface MenuItem {
  icon: string;
  title: string;
  subtitle: string;
  screen: keyof RootStackParamList;
  badge?: number;
}

const MoreScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const unread = useNotificationsStore((s) => s.unread);
  const sync = useSyncStore();

  const items: MenuItem[] = [
    { icon: '🧾', title: 'Ventas', subtitle: 'Historial, reimpresión y cancelaciones', screen: 'Sales' },
    { icon: '📊', title: 'Inventario', subtitle: 'Existencias, valuación y ajustes', screen: 'Inventory' },
    { icon: '👤', title: 'Clientes', subtitle: 'Directorio y datos de facturación', screen: 'Customers' },
    { icon: '🚚', title: 'Proveedores', subtitle: 'Directorio de proveedores', screen: 'Suppliers' },
    { icon: '📥', title: 'Compras', subtitle: 'Recepción de mercancía', screen: 'Purchases' },
    { icon: '🧮', title: 'Facturas', subtitle: 'Facturación y PDF', screen: 'Invoices' },
    { icon: '🔔', title: 'Notificaciones', subtitle: 'Alertas de stock y avisos', screen: 'Notifications', badge: unread },
    { icon: '⚙️', title: 'Configuración', subtitle: 'Negocio, branding, impresora y sincronización', screen: 'Settings' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <Text style={typography.title}>Más opciones</Text>

        <Pressable style={styles.syncCard} onPress={() => void syncNow()}>
          <View style={{ flex: 1 }}>
            <Text style={typography.subtitle}>Sincronización</Text>
            <Text style={typography.caption}>
              {sync.lastResult === 'offline-only'
                ? 'Modo solo offline (sin backend configurado)'
                : sync.pendingCount > 0
                  ? `${sync.pendingCount} cambio(s) pendiente(s) de enviar`
                  : 'Todo sincronizado'}
              {sync.lastSyncAt ? ` · Última: ${new Date(sync.lastSyncAt).toLocaleTimeString()}` : ''}
            </Text>
          </View>
          <Badge
            text={sync.syncing ? 'Sincronizando…' : sync.online ? 'En línea' : 'Sin conexión'}
            tone={sync.online ? 'success' : 'danger'}
          />
        </Pressable>

        {items.map((item) => (
          <Pressable
            key={item.title}
            style={styles.row}
            onPress={() => navigation.navigate(item.screen as never)}
          >
            <Text style={{ fontSize: 24 }}>{item.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={typography.subtitle}>{item.title}</Text>
              <Text style={typography.caption}>{item.subtitle}</Text>
            </View>
            {item.badge ? <Badge text={String(item.badge)} tone="danger" /> : null}
            <Text style={{ color: colors.textMuted, fontSize: 18 }}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  syncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
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
});

export default MoreScreen;
