import 'reflect-metadata';
import * as path from 'path';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
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
import { TractorsController, TrailersController } from './fleet.controller';
import { DevicesController, TelemetryController, VehiclesController } from './telemetry.controller';
import { FleetService } from './fleet.service';
import { DevicesService } from './devices.service';
import { TelemetryService } from './telemetry/telemetry.service';
import {
  InMemoryDeviceRepo,
  InMemoryIngestTokenRepo,
  InMemoryTelemetryRepo,
  InMemoryTractorRepo,
  InMemoryTrailerRepo,
} from './in-memory.repos';
import {
  PgDeviceRepo,
  PgIngestTokenRepo,
  PgTelemetryRepo,
  PgTractorRepo,
  PgTrailerRepo,
} from './pg.repos';
import type { DeviceRepo, IngestTokenRepo, TelemetryRepo, TractorRepo, TrailerRepo } from './repos';
import type { EventBus } from './event.bus';
import { eventBusFromEnv, IncidentSignalBus } from './incident-signals';
import { HttpErrorFilter } from './http-error.filter';

export const SERVICE = 'fleet';
export const MIGRATIONS_DIR = path.join(__dirname, '../migrations');
const log = createLogger(`${SERVICE}-service`);

type Pool = ReturnType<typeof createPool>;

export interface FleetRepos {
  tractors: TractorRepo;
  trailers: TrailerRepo;
  devices: DeviceRepo;
  telemetry: TelemetryRepo;
  tokens: IngestTokenRepo;
}

/** Postgres si hay pool; memoria si no (solo dev/tests). */
export function buildRepos(pool: Pool | null): FleetRepos {
  if (pool) {
    return {
      tractors: new PgTractorRepo(pool),
      trailers: new PgTrailerRepo(pool),
      devices: new PgDeviceRepo(pool),
      telemetry: new PgTelemetryRepo(pool),
      tokens: new PgIngestTokenRepo(pool),
    };
  }
  return {
    tractors: new InMemoryTractorRepo(),
    trailers: new InMemoryTrailerRepo(),
    devices: new InMemoryDeviceRepo(),
    telemetry: new InMemoryTelemetryRepo(),
    tokens: new InMemoryIngestTokenRepo(),
  };
}

function buildModule(bus: EventBus, r: FleetRepos) {
  @Module({
    controllers: [TractorsController, TrailersController, DevicesController, TelemetryController, VehiclesController],
    providers: [
      { provide: FleetService, useFactory: () => new FleetService(r.tractors, r.trailers, r.telemetry) },
      { provide: DevicesService, useFactory: () => new DevicesService(r.devices, r.tractors, r.trailers) },
      {
        provide: TelemetryService,
        useFactory: () =>
          new TelemetryService({
            devices: r.devices,
            telemetry: r.telemetry,
            tokens: r.tokens,
            tractors: r.tractors,
            trailers: r.trailers,
            bus,
          }),
      },
    ],
  })
  class FleetAppModule {}
  return FleetAppModule;
}

/** App configurada (prefijo, body parsers, filtro de errores). Exportada para tests HTTP. */
export async function createFleetApp(
  opts: { bus?: EventBus; logger?: false; repos?: FleetRepos; readiness?: ReadinessCheck[] } = {},
) {
  // Con ALERTS_URL + INTERNAL_TOKEN: reenvía posiciones al centro de incidentes
  // (incident-signals.ts); si no, NoopEventBus.
  // TODO(prod): PubSubEventBus (patrón de services/auth/src/pubsub.bus.ts).
  const bus = opts.bus ?? eventBusFromEnv(process.env, (m) => log.warn(m));
  const app = await NestFactory.create<NestExpressApplication>(buildModule(bus, opts.repos ?? buildRepos(null)), {
    cors: false,
    bodyParser: false,
    ...(opts.logger === false ? { logger: false } : {}),
  });
  // /health y /ready quedan fuera del prefijo /api (probes de Cloud Run).
  registerHealthRoutes(app.getHttpAdapter().getInstance(), SERVICE, opts.readiness ?? []);
  app.setGlobalPrefix('api');
  // Suntech/Queclink pueden mandar ASCII crudo como text/plain al webhook.
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('text', { type: ['text/plain'], limit: '1mb' });
  app.useGlobalFilters(new HttpErrorFilter());
  return app;
}

async function bootstrap() {
  assertProductionEnv(SERVICE, ['INTERNAL_TOKEN', 'ALERTS_URL', 'TRIPS_URL']);
  const dbCfg = dbConfigFromEnv(SERVICE);
  if (!dbCfg && isProduction()) throw new Error(`[${SERVICE}] DATABASE_URL o DB_HOST es obligatoria en producción`);
  const pool = dbCfg ? createPool(dbCfg) : null;
  if (pool && process.env.DB_MIGRATE_ON_BOOT === '1') {
    await runMigrations(pool, { schema: dbCfg!.schema, dir: MIGRATIONS_DIR, log: (m) => log.info(m) });
  }
  if (!pool) log.warn('sin DATABASE_URL/DB_HOST: repos en memoria (solo desarrollo)');

  const repos = buildRepos(pool);
  if (repos.telemetry instanceof PgTelemetryRepo) {
    // No es fatal: la ingesta crea la partición que falte al vuelo.
    await repos.telemetry.ensureWindow().catch((e: unknown) =>
      log.warn('no se pudieron asegurar las particiones de telemetría', { error: (e as Error).message }),
    );
  }

  const bus = eventBusFromEnv(process.env, (m) => log.warn(m));
  const app = await createFleetApp({
    bus,
    repos,
    readiness: pool ? [{ name: 'db', check: () => pingDb(pool) }] : [],
  });
  const port = Number(process.env.PORT ?? '8084');
  await app.listen(port, '0.0.0.0');
  onShutdown(log, [
    () => app.close(),
    async () => (bus instanceof IncidentSignalBus ? bus.drain() : undefined),
    async () => pool?.end(),
  ]);
  log.info(`up on :${port}`, { storage: pool ? 'postgres' : 'memory' });
}
if (require.main === module) {
  bootstrap().catch((e: unknown) => {
    log.error('no arrancó', { error: (e as Error).message });
    process.exit(1);
  });
}
