import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import type { PendingItem } from '@/models';

const KEY = 'g3.offline.queue.v1';

async function readAll(): Promise<PendingItem[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PendingItem[];
  } catch {
    return [];
  }
}

async function writeAll(items: PendingItem[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

export const offlineQueue = {
  async enqueue<T>(kind: PendingItem['kind'], payload: T): Promise<PendingItem<T>> {
    const items = await readAll();
    const item: PendingItem<T> = {
      id: String(uuid.v4()),
      kind,
      payload,
      attempts: 0,
      lastError: null,
      createdAt: Date.now(),
    };
    items.push(item);
    await writeAll(items);
    return item;
  },

  async list(): Promise<PendingItem[]> {
    return readAll();
  },

  async remove(id: string): Promise<void> {
    const items = await readAll();
    await writeAll(items.filter((i) => i.id !== id));
  },

  async markFailed(id: string, err: string): Promise<void> {
    const items = await readAll();
    const next = items.map((i) =>
      i.id === id ? { ...i, attempts: i.attempts + 1, lastError: err } : i,
    );
    await writeAll(next);
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(KEY);
  },
};
