import NetInfo from '@react-native-community/netinfo';
import { pending, pendingCount, remove, markFailed } from '@/db/outbox';
import { loadSettings } from '@/db/settings';
import { useSyncStore } from '@/stores/syncStore';

/**
 * Motor de sincronización offline → online (outbox pattern).
 *
 * La app siempre escribe primero en SQLite; cada cambio queda encolado en la
 * tabla `outbox`. Cuando hay conexión y un backend configurado
 * (Configuración → Sincronización), los cambios se empujan vía REST:
 *
 *   POST {syncUrl}/{entity}   body: { op, entityId, payload }
 *   Authorization: Bearer {syncApiKey}
 *
 * Cualquier backend que acepte ese contrato funciona (Supabase Edge
 * Functions, NestJS, Express…). Sin backend configurado la app opera
 * 100 % offline sin encolar errores.
 */

let syncing = false;
let unsubscribe: (() => void) | null = null;

export const syncNow = async (): Promise<void> => {
  if (syncing) return;
  const settings = await loadSettings();
  const store = useSyncStore.getState();

  if (!settings.syncUrl) {
    store.setStatus({ pendingCount: await pendingCount(), lastResult: 'offline-only' });
    return;
  }

  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    store.setStatus({ online: false, pendingCount: await pendingCount() });
    return;
  }

  syncing = true;
  store.setStatus({ online: true, syncing: true });
  try {
    let batch = await pending(50);
    while (batch.length > 0) {
      for (const entry of batch) {
        try {
          const res = await fetch(`${settings.syncUrl.replace(/\/$/, '')}/${entry.entity}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(settings.syncApiKey ? { Authorization: `Bearer ${settings.syncApiKey}` } : {}),
            },
            body: JSON.stringify({
              op: entry.op,
              entityId: entry.entityId,
              payload: JSON.parse(entry.payload),
              queuedAt: entry.createdAt,
            }),
          });
          if (res.ok) {
            await remove(entry.id);
          } else {
            await markFailed(entry.id, `HTTP ${res.status}`);
            if (res.status >= 500) throw new Error(`HTTP ${res.status}`); // backend caído: detener el lote
          }
        } catch (e) {
          await markFailed(entry.id, e instanceof Error ? e.message : 'network');
          throw e; // sin red o backend caído: reintentar después
        }
      }
      batch = await pending(50);
    }
    store.setStatus({
      syncing: false,
      pendingCount: await pendingCount(),
      lastSyncAt: new Date().toISOString(),
      lastResult: 'ok',
    });
  } catch {
    store.setStatus({
      syncing: false,
      pendingCount: await pendingCount(),
      lastResult: 'error',
    });
  } finally {
    syncing = false;
  }
};

/** Arranca el listener de conectividad: sincroniza al recuperar la red. */
export const startSyncEngine = () => {
  if (unsubscribe) return;
  unsubscribe = NetInfo.addEventListener((state) => {
    useSyncStore.getState().setStatus({ online: !!state.isConnected });
    if (state.isConnected) void syncNow();
  });
  void syncNow();
};

export const stopSyncEngine = () => {
  unsubscribe?.();
  unsubscribe = null;
};
