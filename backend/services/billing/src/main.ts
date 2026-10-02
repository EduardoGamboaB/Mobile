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
  serviceFetchFromEnv,
  createRedisFromEnv,
  type ReadinessCheck,
} from '@g3/platform';
import { IntegrationsClient, invalidationChannel, subscribeToIntegrationChanges } from '@g3/integrations';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { InMemorySubscriptionRepo, InMemoryWebhookEventRepo } from './repos/in-memory.subscription.repo';
import { PgSubscriptionRepo, PgWebhookEventRepo } from './repos/pg.subscription.repo';
import { FakeStripeProvider } from './billing/fake.stripe.provider';
import { RecordingEventBus } from './event.bus';
import { IntegrationBillingProvider } from './billing/integration.billing.provider';
import { MIGRATIONS_DIR, SERVICE } from './migrate';

@Module({})
class BillingAppModule {
  static with(svc: BillingService): DynamicModule {
    return {
      module: BillingAppModule,
      controllers: [BillingController],
      providers: [{ provide: BillingService, useValue: svc }],
    };
  }
}

/**
 * Conexión Redis dedicada en modo suscriptor: invalida la caché (60 s) del
 * IntegrationsClient en cuanto alguien cambia una configuración.
 */
function watchIntegrationChanges(client: IntegrationsClient, warn: (m: string, f?: Record<string, unknown>) => void) {
  const subscriber = createRedisFromEnv();
  if (!subscriber) return;
  subscriber.on('error', (e: Error) => warn('redis (suscriptor de integraciones)', { error: e.message }));
  subscribeToIntegrationChanges(subscriber, client, { channel: invalidationChannel(), onError: (m) => warn(m) }).catch(
    (e: unknown) => warn('sin invalidación de integraciones (la caché expira en 60 s)', { error: (e as Error).message }),
  );
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

  const integrations = new IntegrationsClient({
    baseUrl: process.env.INTEGRATIONS_URL,
    internalToken: process.env.INTERNAL_TOKEN,
    // x-internal-token y, con SERVICE_AUTH=gcp, ID token de Cloud Run.
    fetch: serviceFetchFromEnv(),
    onError: (m) => log.warn(m),
  });
  watchIntegrationChanges(integrations, log.warn);

  const svc = new BillingService(
    pool ? new PgSubscriptionRepo(pool) : new InMemorySubscriptionRepo(),
    // Stripe desde integrations (plataforma) → STRIPE_* → Fake si no hay nada.
    new IntegrationBillingProvider(integrations, new FakeStripeProvider()),
    new RecordingEventBus(),
    pool ? new PgWebhookEventRepo(pool) : new InMemoryWebhookEventRepo(),
  );

  const app = await NestFactory.create(BillingAppModule.with(svc), { cors: false });
  const checks: ReadinessCheck[] = pool ? [{ name: 'db', check: () => pingDb(pool) }] : [];
  registerHealthRoutes(app.getHttpAdapter().getInstance(), SERVICE, checks);
  app.setGlobalPrefix('api');
  onShutdown(log, [() => app.close(), async () => pool?.end()]);

  const port = Number(process.env.PORT ?? '8082');
  await app.listen(port, '0.0.0.0');
  log.info(`billing-service escuchando en :${port}`);
}

if (require.main === module) {
  bootstrap().catch((e: unknown) => {
    createLogger(SERVICE).error('no se pudo arrancar', { error: (e as Error).message });
    process.exit(1);
  });
}
