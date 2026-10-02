/**
 * Mantenimiento de la telemetría particionada (`node dist/maintenance.js`).
 * En producción: Cloud Run Job disparado por Cloud Scheduler una vez al día
 * (es idempotente).
 *
 * 1. Asegura las particiones del mes anterior, el actual y los 3 siguientes.
 * 2. Retención: borra con DROP las particiones de meses anteriores a
 *    `TELEMETRY_RETENTION_MONTHS` (por defecto 13) contados desde el mes en
 *    curso. `TELEMETRY_RETENTION_MONTHS=0` desactiva el borrado.
 */
import { createLogger, createPool, dbConfigFromEnv } from '@g3/platform';
import { PgTelemetryRepo } from './pg.repos';

const SERVICE = 'fleet';
const log = createLogger(`${SERVICE}-maintenance`);

export const DEFAULT_RETENTION_MONTHS = 13;

export function retentionMonthsFromEnv(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.TELEMETRY_RETENTION_MONTHS;
  if (raw == null || raw === '') return DEFAULT_RETENTION_MONTHS;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) throw new Error(`TELEMETRY_RETENTION_MONTHS inválida: ${raw}`);
  return n;
}

async function main() {
  const cfg = dbConfigFromEnv(SERVICE);
  if (!cfg) throw new Error('DATABASE_URL o DB_HOST requerida');
  const months = retentionMonthsFromEnv();
  const pool = createPool(cfg);
  try {
    const telemetry = new PgTelemetryRepo(pool);
    await telemetry.ensureWindow();
    const dropped = months > 0 ? await telemetry.dropPartitionsOlderThan(months) : [];
    log.info('mantenimiento de telemetría', { retentionMonths: months, dropped });
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((e: unknown) => {
    log.error('mantenimiento fallido', { error: (e as Error).message });
    process.exit(1);
  });
}
