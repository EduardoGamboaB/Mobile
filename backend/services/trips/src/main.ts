import 'reflect-metadata';
import * as path from 'path';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  assertProductionEnv,
  createLogger,
  createPool,
  dbConfigFromEnv,
  isProduction,
  onShutdown,
  pingDb,
  registerHealthRoutes,
  runMigrations,
  type ReadinessCheck,
} from '@g3/platform';
import { ExpensePolicyController, InternalTripsController, TripsController } from './trips.controller';
import { TripsService, type OpsRepos } from './trips.service';
import { InMemoryTripRepo } from './in-memory.trip.repo';
import { RecordingEventBus } from './event.bus';
import {
  InMemoryEvidenceRepo,
  InMemoryExpensePolicyRepo,
  InMemoryLogbookRepo,
  StubEvidenceStorage,
} from './in-memory.ops.repo';
import { PgEvidenceRepo, PgExpensePolicyRepo, PgLogbookRepo, PgTripRepo } from './pg.repos';
import type { TripRepo } from './repos';
import { auditSinkFromEnv, NoopAuditSink, type AuditSink } from './audit.sink';

export const SERVICE = 'trips';
export const MIGRATIONS_DIR = path.join(__dirname, '../migrations');
const log = createLogger(`${SERVICE}-service`);

type Pool = ReturnType<typeof createPool>;

export interface TripsRepos {
  trips: TripRepo;
  ops: Omit<OpsRepos, 'storage'>;
}

/** Postgres si hay pool; memoria si no (solo dev/tests). */
export function buildRepos(pool: Pool | null): TripsRepos {
  if (pool) {
    return {
      trips: new PgTripRepo(pool),
      ops: { logbook: new PgLogbookRepo(pool), evidences: new PgEvidenceRepo(pool), policies: new PgExpensePolicyRepo(pool) },
    };
  }
  return {
    trips: new InMemoryTripRepo(),
    ops: { logbook: new InMemoryLogbookRepo(), evidences: new InMemoryEvidenceRepo(), policies: new InMemoryExpensePolicyRepo() },
  };
}

function buildModule(audit: AuditSink, repos: TripsRepos) {
  @Module({
    // InternalTripsController antes que TripsController: `/trips/internal/*` no es un id de viaje.
    controllers: [InternalTripsController, TripsController, ExpensePolicyController],
    providers: [
      {
        provide: TripsService,
        useFactory: () =>
          new TripsService(
            repos.trips,
            // TODO(prod): Pub/Sub (`g3-domain-events`).
            new RecordingEventBus(),
            { ...repos.ops, storage: new StubEvidenceStorage() },
            { audit, log: (m) => log.error(m) },
          ),
      },
    ],
  })
  class TripsAppModule {}
  return TripsAppModule;
}

export async function createTripsApp(
  opts: { logger?: false; audit?: AuditSink; repos?: TripsRepos; readiness?: ReadinessCheck[] } = {},
) {
  const audit = opts.audit ?? auditSinkFromEnv();
  if (audit instanceof NoopAuditSink && opts.logger !== false) {
    log.warn('AUTH_URL/INTERNAL_TOKEN sin configurar: cambios de política de gastos sin auditoría');
  }
  const app = await NestFactory.create(buildModule(audit, opts.repos ?? buildRepos(null)), {
    cors: false,
    ...(opts.logger === false ? { logger: false as const } : {}),
  });
  // /health y /ready quedan fuera del prefijo /api (probes de Cloud Run).
  registerHealthRoutes(app.getHttpAdapter().getInstance(), SERVICE, opts.readiness ?? []);
  app.setGlobalPrefix('api');
  return app;
}

async function bootstrap() {
  assertProductionEnv(SERVICE, ['INTERNAL_TOKEN', 'AUTH_URL']);
  const dbCfg = dbConfigFromEnv(SERVICE);
  if (!dbCfg && isProduction()) throw new Error(`[${SERVICE}] DATABASE_URL o DB_HOST es obligatoria en producción`);
  const pool = dbCfg ? createPool(dbCfg) : null;
  if (pool && process.env.DB_MIGRATE_ON_BOOT === '1') {
    await runMigrations(pool, { schema: dbCfg!.schema, dir: MIGRATIONS_DIR, log: (m) => log.info(m) });
  }
  if (!pool) log.warn('sin DATABASE_URL/DB_HOST: repos en memoria (solo desarrollo)');

  const app = await createTripsApp({
    repos: buildRepos(pool),
    readiness: pool ? [{ name: 'db', check: () => pingDb(pool) }] : [],
  });
  const port = Number(process.env.PORT ?? '8085');
  await app.listen(port, '0.0.0.0');
  onShutdown(log, [() => app.close(), async () => pool?.end()]);
  log.info(`up on :${port}`, { storage: pool ? 'postgres' : 'memory' });
}
if (require.main === module) {
  bootstrap().catch((e: unknown) => {
    log.error('no arrancó', { error: (e as Error).message });
    process.exit(1);
  });
}
