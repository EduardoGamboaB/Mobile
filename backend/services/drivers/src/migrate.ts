/**
 * Aplica las migraciones del schema `drivers` y termina. En producción corre
 * como Cloud Run Job antes del deploy (`node dist/migrate.js`).
 */
import * as path from 'path';
import { createLogger, createPool, dbConfigFromEnv, runMigrations } from '@g3/platform';

export const SERVICE = 'drivers';
/** `src/` (ts-node/tests) y `dist/` (build) están al mismo nivel que `migrations/`. */
export const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

export async function migrate(env: NodeJS.ProcessEnv = process.env): Promise<string[]> {
  const log = createLogger(SERVICE);
  const cfg = dbConfigFromEnv(SERVICE, env);
  if (!cfg) throw new Error(`[${SERVICE}] sin base de datos: define DATABASE_URL o DB_HOST`);
  const pool = createPool(cfg);
  try {
    log.info('aplicando migraciones', { schema: cfg.schema, dir: MIGRATIONS_DIR });
    const applied = await runMigrations(pool, { schema: cfg.schema, dir: MIGRATIONS_DIR, log: (m) => log.info(m) });
    log.info(applied.length ? 'migraciones aplicadas' : 'sin migraciones pendientes', { schema: cfg.schema, applied });
    return applied;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrate().then(
    () => process.exit(0),
    (e: unknown) => {
      createLogger(SERVICE).error('falló la migración', { error: (e as Error).message });
      process.exit(1);
    },
  );
}
