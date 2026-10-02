import 'reflect-metadata';
import { Module, type DynamicModule } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { globalFetch, SecretResolver } from '@g3/integrations';
import { IntegrationsController, IntegrationsInternalController, INTERNAL_TOKEN } from './integrations.controller';
import { IntegrationsService, type IntegrationsServiceDeps } from './integrations.service';
import { InMemoryIntegrationRepo } from './integrations.repo';
import { AesGcmSecretCipher, loadEncryptionKey } from './secret-cipher';
import { HttpAuditSink, LogAuditSink } from './audit';
import { HttpErrorFilter } from './http-error.filter';

type Env = Record<string, string | undefined>;

/** Dependencias de runtime a partir del entorno. En producción falla si falta algo crítico. */
export function depsFromEnv(env: Env = process.env): { deps: IntegrationsServiceDeps; internalToken: string } {
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
      repo: new InMemoryIntegrationRepo(),
      cipher: new AesGcmSecretCipher(loadEncryptionKey(env)),
      secrets: new SecretResolver({ env }),
      audit: authUrl && internalToken ? new HttpAuditSink(authUrl, internalToken) : new LogAuditSink(),
      fetch: globalFetch,
      env,
      platformCompanyId,
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

export async function createIntegrationsApp(opts: { deps?: IntegrationsServiceDeps; internalToken?: string; logger?: false } = {}) {
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
  http.get('/health', (_req, res) => res.json({ ok: true }));
  return app;
}

async function bootstrap() {
  const app = await createIntegrationsApp();
  const port = Number(process.env.PORT ?? '8088');
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[integrations-service] up on :${port}`);
}
if (require.main === module) bootstrap();
