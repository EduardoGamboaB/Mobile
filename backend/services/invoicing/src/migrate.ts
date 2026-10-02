import * as path from 'path';
import type { Pool } from 'pg';
import { createLogger, createPool, dbConfigFromEnv, runMigrations, type DbConfig } from '@g3/platform';

export const SERVICE = 'invoicing';
/** `migrations/` junto a `src/` y `dist/` (en la imagen: /app/migrations). */
export const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

export function migrate(pool: Pool, cfg: DbConfig, log = createLogger(SERVICE)) {
  return runMigrations(pool, { schema: cfg.schema, dir: MIGRATIONS_DIR, log: (m) => log.info(m) });
}

/** `node dist/migrate.js`: aplica las migraciones y termina (Cloud Run Job antes del deploy). */
async function main() {
  const log = createLogger(SERVICE);
  const cfg = dbConfigFromEnv(SERVICE);
  if (!cfg) throw new Error(`[${SERVICE}] sin base configurada: define DATABASE_URL o DB_HOST`);
  const pool = createPool(cfg);
  try {
    const applied = await migrate(pool, cfg, log);
    log.info(`migraciones al día (${applied.length} nuevas)`, { applied });
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((e: unknown) => {
    createLogger(SERVICE).error('falló la migración', { error: (e as Error).message });
    process.exit(1);
  });
}
