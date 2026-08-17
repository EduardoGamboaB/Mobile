import { getDb } from './database';
import { DEFAULT_SETTINGS, type BusinessSettings } from '@/models/types';

const KEY = 'business';

export const loadSettings = async (): Promise<BusinessSettings> => {
  const row = await getDb().getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [KEY],
  );
  if (!row) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(row.value) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

export const persistSettings = async (settings: BusinessSettings): Promise<void> => {
  await getDb().runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [KEY, JSON.stringify(settings)],
  );
};
