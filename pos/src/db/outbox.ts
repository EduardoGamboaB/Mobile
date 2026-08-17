import { getDb } from './database';
import { nowIso } from '@/utils/ids';
import type { OutboxEntry, OutboxOp } from '@/models/types';

/**
 * Outbox pattern: cada cambio local se encola aquí y el SyncService
 * lo empuja al backend cuando hay conexión.
 */
export const enqueue = async (entity: string, entityId: string, op: OutboxOp, payload: unknown) => {
  await getDb().runAsync(
    'INSERT INTO outbox (entity, entityId, op, payload, createdAt) VALUES (?, ?, ?, ?, ?)',
    [entity, entityId, op, JSON.stringify(payload), nowIso()],
  );
};

export const pending = async (limit = 50): Promise<OutboxEntry[]> =>
  getDb().getAllAsync<OutboxEntry>('SELECT * FROM outbox ORDER BY id LIMIT ?', [limit]);

export const pendingCount = async (): Promise<number> => {
  const row = await getDb().getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM outbox');
  return row?.c ?? 0;
};

export const remove = async (id: number) => {
  await getDb().runAsync('DELETE FROM outbox WHERE id = ?', [id]);
};

export const markFailed = async (id: number, error: string) => {
  await getDb().runAsync('UPDATE outbox SET attempts = attempts + 1, lastError = ? WHERE id = ?', [
    error.slice(0, 500),
    id,
  ]);
};
