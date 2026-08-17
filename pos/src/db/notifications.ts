import { getDb } from './database';
import { newId, nowIso } from '@/utils/ids';
import type { AppNotification, NotificationType } from '@/models/types';

export const addNotification = async (
  type: NotificationType,
  title: string,
  body: string,
  refId = '',
): Promise<AppNotification> => {
  const notification: AppNotification = {
    id: newId(),
    type,
    title,
    body,
    refId,
    date: nowIso(),
    read: 0,
  };
  await getDb().runAsync(
    'INSERT INTO notifications (id, type, title, body, refId, date, read) VALUES (?, ?, ?, ?, ?, ?, 0)',
    [notification.id, notification.type, notification.title, notification.body, notification.refId, notification.date],
  );
  return notification;
};

/**
 * Evita duplicar la misma alerta (mismo tipo + refId) si ya existe una sin leer.
 */
export const hasUnread = async (type: NotificationType, refId: string): Promise<boolean> => {
  const row = await getDb().getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM notifications WHERE type = ? AND refId = ? AND read = 0',
    [type, refId],
  );
  return (row?.c ?? 0) > 0;
};

export const listNotifications = async (limit = 100): Promise<AppNotification[]> =>
  getDb().getAllAsync<AppNotification>('SELECT * FROM notifications ORDER BY date DESC LIMIT ?', [limit]);

export const unreadCount = async (): Promise<number> => {
  const row = await getDb().getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM notifications WHERE read = 0',
  );
  return row?.c ?? 0;
};

export const markRead = async (id: string) => {
  await getDb().runAsync('UPDATE notifications SET read = 1 WHERE id = ?', [id]);
};

export const markAllRead = async () => {
  await getDb().runAsync('UPDATE notifications SET read = 1');
};

export const clearNotifications = async () => {
  await getDb().runAsync('DELETE FROM notifications');
};
