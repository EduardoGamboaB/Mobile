import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Almacén de sincronización. Usa el SQLite integrado de Node (>= 22.5),
 * sin dependencias nativas que compilar. Cada entidad del POS se guarda
 * como documento JSON versionado por fecha de recepción, suficiente para
 * el patrón outbox (push) y para pulls incrementales por `since`.
 */

export const ENTITIES = [
  'products',
  'suppliers',
  'customers',
  'purchases',
  'sales',
  'invoices',
  'movements',
] as const;

export type Entity = (typeof ENTITIES)[number];

export const isEntity = (value: string): value is Entity =>
  (ENTITIES as readonly string[]).includes(value);

export interface StoredRecord {
  entity: string;
  id: string;
  payload: string;
  deleted: number;
  queuedAt: string;
  receivedAt: string;
}

export class SyncStore {
  private db: DatabaseSync;

  constructor(path = ':memory:') {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS records (
        entity TEXT NOT NULL,
        id TEXT NOT NULL,
        payload TEXT NOT NULL,
        deleted INTEGER NOT NULL DEFAULT 0,
        queuedAt TEXT NOT NULL DEFAULT '',
        receivedAt TEXT NOT NULL,
        PRIMARY KEY (entity, id)
      );
      CREATE INDEX IF NOT EXISTS idx_records_received ON records(entity, receivedAt);
    `);
  }

  upsert(entity: Entity, id: string, payload: unknown, queuedAt: string): void {
    this.db
      .prepare(
        `INSERT INTO records (entity, id, payload, deleted, queuedAt, receivedAt)
         VALUES (?, ?, ?, 0, ?, ?)
         ON CONFLICT(entity, id) DO UPDATE SET
           payload = excluded.payload, deleted = 0,
           queuedAt = excluded.queuedAt, receivedAt = excluded.receivedAt`,
      )
      .run(entity, id, JSON.stringify(payload), queuedAt, new Date().toISOString());
  }

  markDeleted(entity: Entity, id: string, queuedAt: string): void {
    this.db
      .prepare(
        `INSERT INTO records (entity, id, payload, deleted, queuedAt, receivedAt)
         VALUES (?, ?, '{}', 1, ?, ?)
         ON CONFLICT(entity, id) DO UPDATE SET
           deleted = 1, queuedAt = excluded.queuedAt, receivedAt = excluded.receivedAt`,
      )
      .run(entity, id, queuedAt, new Date().toISOString());
  }

  list(entity: Entity, since = '', limit = 500): StoredRecord[] {
    return this.db
      .prepare(
        `SELECT * FROM records WHERE entity = ? AND receivedAt > ?
         ORDER BY receivedAt LIMIT ?`,
      )
      .all(entity, since, limit) as unknown as StoredRecord[];
  }

  get(entity: Entity, id: string): StoredRecord | undefined {
    return this.db
      .prepare('SELECT * FROM records WHERE entity = ? AND id = ?')
      .get(entity, id) as unknown as StoredRecord | undefined;
  }

  stats(): Record<string, number> {
    const rows = this.db
      .prepare('SELECT entity, COUNT(*) AS count FROM records WHERE deleted = 0 GROUP BY entity')
      .all() as unknown as { entity: string; count: number }[];
    const out: Record<string, number> = {};
    for (const entity of ENTITIES) out[entity] = 0;
    for (const row of rows) out[row.entity] = row.count;
    return out;
  }

  close(): void {
    this.db.close();
  }
}
