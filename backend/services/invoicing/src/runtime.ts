import { IntegrationsClient, type FetchLike } from '@g3/integrations';
import {
  assertProductionEnv,
  createPool,
  dbConfigFromEnv,
  isProduction,
  pingDb,
  serviceFetchFromEnv,
  type ReadinessCheck,
} from '@g3/platform';
import { CartaPorteGenerator } from './carta-porte/generator';
import { CFDIGenerator } from './cfdi/generator';
import { InvoiceService } from './invoice.service';
import { InMemoryInvoiceRepo, type InvoiceRepo } from './invoice.repo';
import { PgInvoiceRepo } from './pg.invoice.repo';
import { buildPacProvider } from './pac/pac.factory';
import { migrate, SERVICE } from './migrate';

type Env = Record<string, string | undefined>;

/**
 * Arranque de invoicing para quien lo hospede (hoy no expone HTTP propio):
 * repo de timbrado en Postgres (memoria sin base, solo dev), PAC por
 * compañía resuelto vía integrations con `serviceFetchFromEnv()` y
 * migraciones opcionales al arrancar (`DB_MIGRATE_ON_BOOT=1`).
 */
export async function invoicingRuntimeFromEnv(env: Env = process.env, opts: { fetch?: FetchLike } = {}) {
  assertProductionEnv(SERVICE, ['INTERNAL_TOKEN', 'INTEGRATIONS_URL'], env as NodeJS.ProcessEnv);
  const cfg = dbConfigFromEnv(SERVICE, env as NodeJS.ProcessEnv);
  if (!cfg && isProduction(env as NodeJS.ProcessEnv)) {
    throw new Error(`[${SERVICE}] DATABASE_URL o DB_HOST es obligatorio en producción (idempotencia del timbrado)`);
  }
  const pool = cfg ? createPool(cfg) : null;
  if (pool && cfg && env.DB_MIGRATE_ON_BOOT === '1') await migrate(pool, cfg);
  const repo: InvoiceRepo = pool ? new PgInvoiceRepo(pool) : new InMemoryInvoiceRepo();
  const integrations = new IntegrationsClient({
    baseUrl: env.INTEGRATIONS_URL,
    internalToken: env.INTERNAL_TOKEN,
    fetch: opts.fetch ?? serviceFetchFromEnv(env as NodeJS.ProcessEnv),
    env,
    onError: (m) => console.warn(m),
  });
  const generator = new CartaPorteGenerator(new CFDIGenerator());
  const readiness: ReadinessCheck[] = pool ? [{ name: 'db', check: () => pingDb(pool) }] : [];
  return {
    repo,
    integrations,
    readiness,
    /** InvoiceService con el PAC de la compañía (primary/backup) y timbrado idempotente. */
    async invoiceServiceFor(companyId: string) {
      return new InvoiceService(generator, await buildPacProvider(companyId, integrations), { repo });
    },
    close: async () => {
      await pool?.end();
    },
  };
}
