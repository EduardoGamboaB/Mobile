import 'reflect-metadata';
import { Module, type DynamicModule } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  assertProductionEnv,
  createLogger,
  createPool,
  dbConfigFromEnv,
  onShutdown,
  pingDb,
  registerHealthRoutes,
  runMigrations,
  type ReadinessCheck,
} from '@g3/platform';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { InMemoryDriverRepo } from './in-memory.driver.repo';
import { PgDriverRepo } from './pg.driver.repo';
import { MIGRATIONS_DIR, SERVICE } from './migrate';

@Module({})
class DriversAppModule {
  static with(svc: DriversService): DynamicModule {
    return {
      module: DriversAppModule,
      controllers: [DriversController],
      providers: [{ provide: DriversService, useValue: svc }],
    };
  }
}

async function bootstrap() {
  const log = createLogger(SERVICE);
  // En producción la base es obligatoria (DATABASE_URL o, en docker-compose, DB_HOST).
  assertProductionEnv(SERVICE, [process.env.DB_HOST ? 'DB_HOST' : 'DATABASE_URL']);

  const dbCfg = dbConfigFromEnv(SERVICE);
  const pool = dbCfg ? createPool(dbCfg) : null;
  if (pool && dbCfg) {
    if (process.env.DB_MIGRATE_ON_BOOT === '1') {
      await runMigrations(pool, { schema: dbCfg.schema, dir: MIGRATIONS_DIR, log: (m) => log.info(m) });
    }
    log.info('persistencia: postgres', { schema: dbCfg.schema });
  } else {
    log.warn('persistencia: memoria (solo dev; los datos se pierden al reiniciar)');
  }
  const repo = pool ? new PgDriverRepo(pool) : new InMemoryDriverRepo();

  const app = await NestFactory.create(DriversAppModule.with(new DriversService(repo)), { cors: false });
  const checks: ReadinessCheck[] = pool ? [{ name: 'db', check: () => pingDb(pool) }] : [];
  registerHealthRoutes(app.getHttpAdapter().getInstance(), SERVICE, checks);
  app.setGlobalPrefix('api');
  onShutdown(log, [() => app.close(), async () => pool?.end()]);

  const port = Number(process.env.PORT ?? '8083');
  await app.listen(port, '0.0.0.0');
  log.info(`drivers-service escuchando en :${port}`);
}

if (require.main === module) {
  bootstrap().catch((e: unknown) => {
    createLogger(SERVICE).error('no se pudo arrancar', { error: (e as Error).message });
    process.exit(1);
  });
}
