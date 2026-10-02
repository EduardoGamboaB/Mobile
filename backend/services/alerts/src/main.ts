import 'reflect-metadata';
import { Module, type DynamicModule } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { Pool } from 'pg';
import {
  invalidationChannel,
  IntegrationsClient,
  subscribeToIntegrationChanges,
  type FetchLike,
} from '@g3/integrations';
import {
  assertProductionEnv,
  createLogger,
  createPool,
  createRedisFromEnv,
  dbConfigFromEnv,
  isProduction,
  onShutdown,
  pingDb,
  registerHealthRoutes,
  serviceFetchFromEnv,
  type ReadinessCheck,
} from '@g3/platform';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { InMemoryAlertRepo } from './in-memory.alert.repo';
import { PgAlertRepo } from './pg.alert.repo';
import { RecordingEventBus } from './event.bus';
import { HttpErrorFilter } from './http-error.filter';
import {
  AlertRulesController,
  IncidentsController,
  NotificationContactsController,
} from './incidents/incidents.controller';
import { IncidentsService } from './incidents/incidents.service';
import {
  InMemoryAlertRuleRepo,
  InMemoryIncidentRepo,
  InMemoryVehicleSignalRepo,
} from './incidents/in-memory.incidents.repo';
import {
  PgAlertRuleRepo,
  PgContactDirectory,
  PgIncidentRepo,
  PgVehicleSignalRepo,
} from './incidents/pg.incidents.repo';
import {
  InMemoryContactDirectory,
  ResolvedPushNotifier,
  ResolvedWhatsAppNotifier,
  type Notifier,
} from './incidents/notifier';
import { migrate, SERVICE } from './migrate';

/** Cliente del servicio integrations: llamada interna con `serviceFetchFromEnv()` (ID token en Cloud Run). */
export function buildIntegrationsClient(env: Record<string, string | undefined> = process.env, fetchImpl?: FetchLike) {
  return new IntegrationsClient({
    baseUrl: env.INTEGRATIONS_URL,
    internalToken: env.INTERNAL_TOKEN,
    fetch: fetchImpl ?? serviceFetchFromEnv(env as NodeJS.ProcessEnv),
    env,
    onError: (m) => console.warn(m),
  });
}

/**
 * Canales resueltos POR COMPAÑÍA del incidente vía el servicio integrations
 * (push: plataforma → entorno; WhatsApp: compañía → plataforma → entorno).
 * Sin INTEGRATIONS_URL/INTERNAL_TOKEN se usan solo las variables de entorno
 * (EXPO_PUSH_ENABLED/EXPO_ACCESS_TOKEN, WHATSAPP_*); sin nada, el canal queda
 * en modo registro para no enviar por accidente.
 */
export function buildNotifiers(
  env: Record<string, string | undefined> = process.env,
  integrations: IntegrationsClient = buildIntegrationsClient(env),
): Notifier[] {
  return [new ResolvedPushNotifier(integrations), new ResolvedWhatsAppNotifier(integrations)];
}

/** Servicios con repos de Postgres si hay pool; en memoria si no (solo dev). */
export function buildServices(pool: Pool | null, notifiers: Notifier[]) {
  const bus = new RecordingEventBus();
  return {
    alerts: new AlertsService(pool ? new PgAlertRepo(pool) : new InMemoryAlertRepo(), bus),
    incidents: new IncidentsService({
      incidents: pool ? new PgIncidentRepo(pool) : new InMemoryIncidentRepo(),
      rules: pool ? new PgAlertRuleRepo(pool) : new InMemoryAlertRuleRepo(),
      contacts: pool ? new PgContactDirectory(pool) : new InMemoryContactDirectory(),
      signals: pool ? new PgVehicleSignalRepo(pool) : new InMemoryVehicleSignalRepo(),
      notifiers,
      bus,
    }),
  };
}

@Module({})
export class AlertsAppModule {
  static register(svcs: ReturnType<typeof buildServices>): DynamicModule {
    return {
      module: AlertsAppModule,
      controllers: [AlertsController, IncidentsController, AlertRulesController, NotificationContactsController],
      providers: [
        { provide: AlertsService, useValue: svcs.alerts },
        { provide: IncidentsService, useValue: svcs.incidents },
      ],
    };
  }
}

async function bootstrap() {
  const log = createLogger(SERVICE);
  assertProductionEnv(SERVICE, ['INTERNAL_TOKEN', 'INTEGRATIONS_URL', 'REDIS_URL']);
  const dbCfg = dbConfigFromEnv(SERVICE);
  if (!dbCfg && isProduction()) throw new Error(`[${SERVICE}] DATABASE_URL o DB_HOST es obligatorio en producción`);
  if (!dbCfg) log.warn('sin DATABASE_URL/DB_HOST: incidentes en memoria (solo desarrollo, una réplica)');

  const pool = dbCfg ? createPool(dbCfg) : null;
  if (pool && dbCfg && process.env.DB_MIGRATE_ON_BOOT === '1') await migrate(pool, dbCfg, log);

  const integrations = buildIntegrationsClient();
  // Conexión dedicada en modo suscriptor: invalida la caché (60 s) de
  // integraciones en cuanto alguien cambia una configuración.
  const subscriber = createRedisFromEnv();
  subscriber?.on('error', (e: Error) => log.warn('redis', { error: e.message }));
  if (subscriber) {
    subscribeToIntegrationChanges(subscriber, integrations, { channel: invalidationChannel(), onError: (m) => log.warn(m) }).catch(
      (e: unknown) => log.warn('sin invalidación de integraciones (la caché expira en 60 s)', { error: (e as Error).message }),
    );
  }

  const app = await NestFactory.create(AlertsAppModule.register(buildServices(pool, buildNotifiers(process.env, integrations))), {
    cors: false,
  });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpErrorFilter());
  const checks: ReadinessCheck[] = [];
  if (pool) checks.push({ name: 'db', check: () => pingDb(pool) });
  if (subscriber) {
    checks.push({
      name: 'redis',
      check: async () => {
        if (subscriber.status !== 'ready') throw new Error(`redis ${subscriber.status}`);
      },
    });
  }
  registerHealthRoutes(app.getHttpAdapter().getInstance(), SERVICE, checks);
  onShutdown(log, [() => app.close(), async () => pool?.end(), async () => subscriber?.quit()]);

  const port = Number(process.env.PORT ?? '8086');
  await app.listen(port, '0.0.0.0');
  log.info(`escuchando en :${port}`, { db: !!pool, redis: !!subscriber });
}
if (require.main === module) {
  bootstrap().catch((e: unknown) => {
    createLogger(SERVICE).error('no arrancó', { error: (e as Error).message });
    process.exit(1);
  });
}
