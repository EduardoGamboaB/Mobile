import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Text, View, StyleSheet, Alert } from 'react-native';
import { Screen } from '@/components/common/Screen';
import { AppBar } from '@/components/common/AppBar';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Banner, bannerIconColor } from '@/components/common/Banner';
import { IconTile, tileIconColor } from '@/components/common/IconTile';
import {
  CloudOffIcon,
  ConeIcon,
  FuelIcon,
  CameraIcon,
  ClockIcon,
  AlertIcon,
  RefreshIcon,
} from '@/components/icons';
import { offlineQueue } from '@/services/offlineQueue';
import { syncService } from '@/services/sync';
import { colors, spacing, typography } from '@/theme';
import type { PendingItem } from '@/models';

const KIND_LABEL: Record<PendingItem['kind'], string> = {
  logbook: 'Evento de bitácora',
  incident: 'Incidencia',
  evidence: 'Evidencia (foto)',
};

export function PendingSyncScreen() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setItems(await offlineQueue.list());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onSync = async () => {
    setBusy(true);
    const r = await syncService.flush();
    setBusy(false);
    Alert.alert('Sincronización', `Subidos: ${r.ok}. Fallidos: ${r.failed}.`);
    refresh();
  };

  return (
    <Screen padded={false}>
      <FlatList
        contentContainerStyle={{ padding: spacing.lg + 4, paddingBottom: spacing.xxl }}
        data={items}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={
          <View>
            <AppBar title="Pendientes de sincronizar" />
            {items.length > 0 ? (
              <>
                <Banner
                  tone="warning"
                  icon={<CloudOffIcon size={18} color={bannerIconColor('warning')} />}
                >
                  {items.length} elemento{items.length === 1 ? '' : 's'} esperando conexión.
                </Banner>
                <Button
                  title={busy ? 'Sincronizando…' : 'Reintentar todo'}
                  leftIcon={<RefreshIcon size={18} color="#fff" />}
                  onPress={onSync}
                  loading={busy}
                  style={{ marginBottom: spacing.md }}
                />
              </>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const failed = item.attempts >= 2;
          return (
            <Card>
              <View style={styles.row}>
                <IconTile tone="amber">{iconFor(item.kind)}</IconTile>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={typography.bodyStrong}>{KIND_LABEL[item.kind]}</Text>
                  <Text style={typography.caption}>
                    {new Date(item.createdAt).toLocaleString()} · {item.attempts} intento
                    {item.attempts === 1 ? '' : 's'}
                  </Text>
                  {item.lastError ? (
                    <Text style={[typography.caption, { color: colors.danger, marginTop: 2 }]}>
                      {item.lastError}
                    </Text>
                  ) : null}
                </View>
                <IconTile tone={failed ? 'danger' : 'navy'} size="sm">
                  {failed ? (
                    <AlertIcon size={16} color={tileIconColor('danger')} />
                  ) : (
                    <ClockIcon size={16} color={colors.muted} />
                  )}
                </IconTile>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          <Text style={[typography.body, { textAlign: 'center', marginTop: spacing.xl }]}>
            No hay elementos pendientes. ¡Todo sincronizado!
          </Text>
        }
      />
    </Screen>
  );
}

function iconFor(kind: PendingItem['kind']) {
  if (kind === 'logbook') return <ConeIcon color={tileIconColor('amber')} />;
  if (kind === 'incident') return <FuelIcon color={tileIconColor('amber')} />;
  return <CameraIcon color={tileIconColor('amber')} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
