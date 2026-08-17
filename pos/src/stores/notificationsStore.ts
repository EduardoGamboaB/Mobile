import { create } from 'zustand';
import { listNotifications, unreadCount, markRead, markAllRead } from '@/db/notifications';
import type { AppNotification } from '@/models/types';

interface NotificationsState {
  items: AppNotification[];
  unread: number;
  refresh: () => Promise<void>;
  read: (id: string) => Promise<void>;
  readAll: () => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  items: [],
  unread: 0,
  refresh: async () => {
    const [items, unread] = await Promise.all([listNotifications(), unreadCount()]);
    set({ items, unread });
  },
  read: async (id) => {
    await markRead(id);
    const [items, unread] = await Promise.all([listNotifications(), unreadCount()]);
    set({ items, unread });
  },
  readAll: async () => {
    await markAllRead();
    const [items, unread] = await Promise.all([listNotifications(), unreadCount()]);
    set({ items, unread });
  },
}));
