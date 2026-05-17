import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Text, View, StyleSheet, Alert } from 'react-native';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { offlineQueue } from '@/services/offlineQueue';
import { syncService } from '@/services/sync';
import { spacing, typography } from '@/theme';
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
        contentContainerStyle={{ padding: spacing.lg }}
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <Card>
            <Text style={typography.bodyStrong}>{KIND_LABEL[item.kind]}</Text>
            <Text style={typography.small}>
              Creado: {new Date(item.createdAt).toLocaleString()}
            </Text>
            <Text style={typography.small}>Intentos: {item.attempts}</Text>
            {item.lastError ? (
              <Text style={[typography.small, { color: '#DC2626' }]}>{item.lastError}</Text>
            ) : null}
          </Card>
        )}
        ListEmptyComponent={
          <Text style={[typography.body, { textAlign: 'center', marginTop: spacing.xl }]}>
            No hay elementos pendientes. ¡Todo sincronizado!
          </Text>
        }
        ListHeaderComponent={
          items.length > 0 ? (
            <View style={{ marginBottom: spacing.md }}>
              <Button
                title={busy ? 'SINCRONIZANDO…' : 'REINTENTAR TODO'}
                onPress={onSync}
                loading={busy}
              />
            </View>
          ) : null
        }
      />
    </Screen>
  );
}
