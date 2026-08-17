import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { addNotification, hasUnread } from '@/db/notifications';
import { formatQty } from '@/utils/money';
import { useNotificationsStore } from '@/stores/notificationsStore';
import type { Product } from '@/models/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const initNotifications = async () => {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('alerts', {
        name: 'Alertas del negocio',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    await Notifications.requestPermissionsAsync();
  } catch {
    // Sin permisos el centro de notificaciones interno sigue funcionando.
  }
};

const pushLocal = async (title: string, body: string) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null, // inmediata
    });
  } catch {
    // Expo Go / sin permisos: solo queda el registro interno.
  }
};

/**
 * Revisa el nivel de stock de un producto después de un movimiento y genera
 * la alerta correspondiente (agotado o mínimo alcanzado). Deduplica alertas
 * sin leer por producto.
 */
export const checkLowStock = async (product: Product): Promise<void> => {
  if (!product.active) return;
  if (product.stock <= 0) {
    if (await hasUnread('out_of_stock', product.id)) return;
    const title = 'Producto agotado';
    const body = `"${product.name}" se quedó sin existencias.`;
    await addNotification('out_of_stock', title, body, product.id);
    await pushLocal(title, body);
    await useNotificationsStore.getState().refresh();
    return;
  }
  if (product.minStock > 0 && product.stock <= product.minStock) {
    if (await hasUnread('low_stock', product.id)) return;
    const title = 'Stock mínimo alcanzado';
    const body = `"${product.name}" tiene ${formatQty(product.stock)} ${product.unit} (mínimo: ${formatQty(product.minStock)}).`;
    await addNotification('low_stock', title, body, product.id);
    await pushLocal(title, body);
    await useNotificationsStore.getState().refresh();
  }
};

export const notifySystem = async (title: string, body: string) => {
  await addNotification('system', title, body);
  await pushLocal(title, body);
  await useNotificationsStore.getState().refresh();
};
