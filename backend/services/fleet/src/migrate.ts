/**
 * Aplica las migraciones de fleet y termina. En producción corre como Cloud
 * Run Job antes del deploy (`node dist/migrate.js`).
 */
import * as path from 'path';
import { createLogger, createPool, dbConfigFromEnv, runMigrations } from '@g3/platform';

const SERVICE = 'fleet';
const log = createLogger(`${SERVICE}-migrate`);

async function main() {
  const cfg = dbConfigFromEnv(SERVICE);
  if (!cfg) throw new Error('DATABASE_URL o DB_HOST requerida para migrar');
  const pool = createPool(cfg);
  try {
    const applied = await runMigrations(pool, {
      schema: cfg.schema,
      dir: path.join(__dirname, '../migrations'),
      log: (m) => log.info(m),
    });
    log.info(applied.length ? `migraciones aplicadas: ${applied.join(', ')}` : 'sin migraciones pendientes');
  } finally {
    await pool.end();
  }
}

main().catch((e: unknown) => {
  log.error('migración fallida', { error: (e as Error).message });
  process.exit(1);
});
