import 'reflect-metadata';
import { Module, type DynamicModule } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  globalFetch,
  invalidationChannel,
  redisChangePublisher,
  SecretResolver,
  type FetchLike,
  type IntegrationChange,
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
import { IntegrationsController, IntegrationsInternalController, INTERNAL_TOKEN } from './integrations.controller';
import { IntegrationsService, type IntegrationsServiceDeps } from './integrations.service';
import { InMemoryIntegrationRepo, type IntegrationRepo } from './integrations.repo';
import { PgIntegrationRepo } from './pg.integrations.repo';
import { AesGcmSecretCipher, loadEncryptionKey } from './secret-cipher';
import { HttpAuditSink, LogAuditSink } from './audit';
import { HttpErrorFilter } from './http-error.filter';
import { migrate, SERVICE } from './migrate';

type Env = Record<string, string | undefined>;

export interface RuntimeOverrides {
  repo?: IntegrationRepo;
  publishChange?: (change: IntegrationChange) => Promise<void>;
  /** `fetch` servicio→servicio (auditoría a auth). Default: `serviceFetchFromEnv(env)`. */
  serviceFetch?: FetchLike;
}

/** Dependencias de runtime a partir del entorno. En producción falla si falta algo crítico. */
export function depsFromEnv(env: Env = process.env, over: RuntimeOverrides = {}): { deps: IntegrationsServiceDeps; internalToken: string } {
  const isProd = env.NODE_ENV === 'production';
  const internalToken = env.INTERNAL_TOKEN ?? '';
  if (isProd && internalToken.length < 32) {
    throw new Error('[integrations-service] INTERNAL_TOKEN es obligatorio en producción (≥ 32 caracteres)');
  }
  const platformCompanyId = env.G3_PLATFORM_COMPANY_ID?.trim() || null;
  if (!platformCompanyId) {
    // eslint-disable-next-line no-console
    console.warn('[integrations-service] sin G3_PLATFORM_COMPANY_ID: nadie puede editar el alcance plataforma');
  }
  const authUrl = env.AUTH_URL ?? '';
  return {
    internalToken,
    deps: {
      repo: over.repo ?? new InMemoryIntegrationRepo(),
      cipher: new AesGcmSecretCipher(loadEncryptionKey(env)),
      secrets: new SecretResolver({ env }),
      // Auditoría a auth: llamada interna (x-internal-token + ID token de Cloud Run).
      audit:
        authUrl && internalToken
          ? new HttpAuditSink(authUrl, internalToken, over.serviceFetch ?? serviceFetchFromEnv(env as NodeJS.ProcessEnv))
          : new LogAuditSink(),
      // "Probar conexión" sale a proveedores externos: fetch global, NUNCA el
      // serviceFetch (no debe llevar el token interno ni el ID token).
      fetch: globalFetch,
      env,
      platformCompanyId,
      publishChange: over.publishChange,
    },
  };
}

@Module({})
export class IntegrationsAppModule {
  static register(deps: IntegrationsServiceDeps, internalToken: string): DynamicModule {
    return {
      module: IntegrationsAppModule,
      // El interno primero: `integrations/internal/resolve` no debe caer en `:category/:slot`.
      controllers: [IntegrationsInternalController, IntegrationsController],
      providers: [
        { provide: IntegrationsService, useValue: new IntegrationsService(deps) },
        { provide: INTERNAL_TOKEN, useValue: internalToken },
      ],
    };
  }
}

export async function createIntegrationsApp(
  opts: { deps?: IntegrationsServiceDeps; internalToken?: string; logger?: false; readiness?: ReadinessCheck[] } = {},
) {
  const fromEnv = opts.deps ? null : depsFromEnv();
  const deps = opts.deps ?? fromEnv!.deps;
  const internalToken = opts.internalToken ?? fromEnv?.internalToken ?? '';
  const app = await NestFactory.create(IntegrationsAppModule.register(deps, internalToken), {
    cors: false,
    ...(opts.logger === false ? { logger: false as const } : {}),
  });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpErrorFilter());
  const http = app.getHttpAdapter().getInstance() as import('express').Express;
  registerHealthRoutes(http, SERVICE, opts.readiness ?? []);
  return app;
}

async function bootstrap() {
  const log = createLogger(SERVICE);
  assertProductionEnv(SERVICE, ['INTERNAL_TOKEN', 'INTEGRATIONS_ENCRYPTION_KEY', 'AUTH_URL', 'REDIS_URL']);
  const dbCfg = dbConfigFromEnv(SERVICE);
  if (!dbCfg && isProduction()) throw new Error(`[${SERVICE}] DATABASE_URL o DB_HOST es obligatorio en producción`);
  if (!dbCfg) log.warn('sin DATABASE_URL/DB_HOST: configuraciones en memoria (solo desarrollo)');

  const pool = dbCfg ? createPool(dbCfg) : null;
  if (pool && dbCfg && process.env.DB_MIGRATE_ON_BOOT === '1') await migrate(pool, dbCfg, log);
  // Conexión para PUBLISH de invalidaciones (sin Redis las cachés expiran en ≤ 60 s).
  const redis = createRedisFromEnv();
  redis?.on('error', (e: Error) => log.warn('redis', { error: e.message }));

  const { deps, internalToken } = depsFromEnv(process.env, {
    repo: pool ? new PgIntegrationRepo(pool) : undefined,
    publishChange: redis ? redisChangePublisher(redis, { channel: invalidationChannel(), onError: (m) => log.warn(m) }) : undefined,
  });
  const checks: ReadinessCheck[] = [];
  if (pool) checks.push({ name: 'db', check: () => pingDb(pool) });
  if (redis) checks.push({ name: 'redis', check: async () => void (await redis.ping()) });

  const app = await createIntegrationsApp({ deps, internalToken, readiness: checks });
  onShutdown(log, [() => app.close(), async () => pool?.end(), async () => redis?.quit()]);
  const port = Number(process.env.PORT ?? '8088');
  await app.listen(port, '0.0.0.0');
  log.info(`escuchando en :${port}`, { db: !!pool, redis: !!redis });
}
if (require.main === module) {
  bootstrap().catch((e: unknown) => {
    createLogger(SERVICE).error('no arrancó', { error: (e as Error).message });
    process.exit(1);
  });
}
