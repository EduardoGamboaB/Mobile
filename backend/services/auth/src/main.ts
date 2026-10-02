import 'reflect-metadata';
import { createHash } from 'crypto';
import { Module, type DynamicModule } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  assertProductionEnv,
  createLogger,
  createPool,
  dbConfigFromEnv,
  createRedisFromEnv,
  ephemeralStoreFromEnv,
  RedisEphemeralStore,
  onShutdown,
  pingDb,
  registerHealthRoutes,
  runMigrations,
  serviceFetchFromEnv,
  type EphemeralStore,
  type ReadinessCheck,
} from '@g3/platform';
import { AuthController } from './auth.controller';
import {
  AuditController,
  MfaController,
  SecurityPolicyController,
  SsoController,
  UsersController,
} from './security.controllers';
import { buildAuthContainer, type AuthContainer, type AuthRepos } from './container';
import { AUDIT_INGEST_TOKEN, AUTH_CONTAINER } from './tokens';
import { RecordingEventBus, type EventBus } from './event.bus';
import { PubSubEventBus } from './pubsub.bus';
import { FetchOidcDiscovery, FetchTokenExchanger, JwksSignatureVerifier } from './sso/oidc';
import { IntegrationsClient, SecretResolver } from '@g3/integrations';
import { ProviderEmailSender, ProviderSmsSender } from './passwordless/provider-senders';
import { PgAuditRepo } from './audit/pg.audit.repo';
import { PgCompanyRepo, PgUserRepo } from './repos/pg.user.repo';
import { PgMfaRepo, PgSecurityPolicyRepo, PgSsoConfigRepo } from './repos/pg.security.repos';
import { MIGRATIONS_DIR, SERVICE } from './migrate';

const env = (k: string, fallback?: string): string => process.env[k] ?? fallback ?? '';
const isProd = env('NODE_ENV') === 'production';

/** En producción los secretos son obligatorios (vienen de Secret Manager). */
function secret(k: string, devFallback: string): string {
  const v = env(k);
  if (v) return v;
  if (isProd) throw new Error(`[auth-service] falta ${k} (Secret Manager)`);
  return devFallback;
}

function mfaKey(): Buffer {
  const raw = env('MFA_ENCRYPTION_KEY');
  if (raw) {
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) throw new Error('[auth-service] MFA_ENCRYPTION_KEY debe ser 32 bytes en base64');
    return key;
  }
  if (isProd) throw new Error('[auth-service] falta MFA_ENCRYPTION_KEY (Secret Manager / KMS)');
  return createHash('sha256').update('g3-dev-only-mfa-key').digest();
}

const log = createLogger(SERVICE);

/**
 * Como `ephemeralStoreFromEnv`, pero espera a que Redis esté listo antes de
 * aceptar tráfico: el cliente del kit no tiene cola offline y los comandos
 * enviados antes de conectar fallan ("Stream isn't writeable").
 */
async function ephemeralStore(): Promise<EphemeralStore> {
  const redis = createRedisFromEnv();
  if (!redis) return ephemeralStoreFromEnv(SERVICE);
  if (redis.status !== 'ready') {
    await new Promise<void>((ok, fail) => {
      const t = setTimeout(() => fail(new Error('Redis no respondió en 10 s')), 10_000);
      redis.once('ready', () => {
        clearTimeout(t);
        ok();
      });
    });
  }
  return new RedisEphemeralStore(redis, `g3:${env('G3_ENV', 'dev')}:${SERVICE}`);
}

function buildContainer(repos: Partial<AuthRepos>, ephemeral: EphemeralStore): AuthContainer {
  const secretResolver = new SecretResolver();
  // Sin INTEGRATIONS_URL/INTERNAL_TOKEN solo usa variables de entorno (o modo registro).
  const integrations = new IntegrationsClient({
    baseUrl: env('INTEGRATIONS_URL'),
    internalToken: env('INTERNAL_TOKEN'),
    // x-internal-token y, con SERVICE_AUTH=gcp, ID token de Cloud Run.
    fetch: serviceFetchFromEnv(),
    onError: (m) => log.warn(m),
  });
  const bus: EventBus = env('GCP_PROJECT_ID') !== '' ? new PubSubEventBus() : new RecordingEventBus();
  return buildAuthContainer({
    repos,
    ephemeral,
    bcryptRounds: Number(env('BCRYPT_ROUNDS', '12')),
    jwt: {
      accessSecret: secret('JWT_ACCESS_SECRET', 'a'.repeat(32)),
      refreshSecret: secret('JWT_REFRESH_SECRET', 'b'.repeat(32)),
      accessTtlSec: Number(env('JWT_ACCESS_TTL', '3600')),
      refreshTtlSec: Number(env('JWT_REFRESH_TTL', '604800')),
    },
    mfaTokenSecret: secret('MFA_TOKEN_SECRET', 'm'.repeat(32)),
    mfaEncryptionKey: mfaKey(),
    recoveryPepper: secret('MFA_RECOVERY_PEPPER', 'p'.repeat(32)),
    mfaIssuer: env('MFA_ISSUER', 'G3 Admin'),
    bus,
    sso: {
      redirectUri: env('SSO_REDIRECT_URI', 'http://localhost:3001/login/sso/callback'),
      discovery: new FetchOidcDiscovery(),
      exchanger: new FetchTokenExchanger(),
      signatureVerifier: new JwksSignatureVerifier(),
      // client_secret: `projects/*/secrets/*` (Secret Manager vía metadata server) o `env:VAR`.
      secrets: {
        resolve: async (ref: string) => {
          try {
            return await secretResolver.resolveReference(ref);
          } catch {
            throw new Error('No se pudo resolver el secreto OIDC');
          }
        },
      },
    },
    // OTP de choferes y recuperación de contraseña: proveedor de la compañía del usuario.
    passwordless: {
      sms: new ProviderSmsSender(integrations),
      email: new ProviderEmailSender(integrations),
      resetUrl: env('PASSWORD_RESET_URL', 'https://admin.g3logistics.mx/login/reset'),
    },
  });
}

@Module({})
class AuthAppModule {
  static with(container: AuthContainer): DynamicModule {
    return {
      module: AuthAppModule,
      controllers: [
        AuthController,
        MfaController,
        SecurityPolicyController,
        SsoController,
        UsersController,
        AuditController,
      ],
      providers: [
        { provide: AUTH_CONTAINER, useValue: container },
        // Ingesta interna de auditoría (trips, integrations…): AUDIT_INGEST_TOKEN o, si no, INTERNAL_TOKEN.
        { provide: AUDIT_INGEST_TOKEN, useValue: env('AUDIT_INGEST_TOKEN') || env('INTERNAL_TOKEN') },
      ],
    };
  }
}

async function bootstrap() {
  // En producción: base (DATABASE_URL o DB_HOST) y Redis (estado compartido entre réplicas).
  assertProductionEnv(SERVICE, [env('DB_HOST') ? 'DB_HOST' : 'DATABASE_URL', 'REDIS_URL']);

  const dbCfg = dbConfigFromEnv(SERVICE);
  const pool = dbCfg ? createPool(dbCfg) : null;
  let repos: Partial<AuthRepos> = {};
  if (pool && dbCfg) {
    if (env('DB_MIGRATE_ON_BOOT') === '1') {
      await runMigrations(pool, { schema: dbCfg.schema, dir: MIGRATIONS_DIR, log: (m) => log.info(m) });
    }
    repos = {
      users: new PgUserRepo(pool),
      companies: new PgCompanyRepo(pool),
      audit: new PgAuditRepo(pool),
      policies: new PgSecurityPolicyRepo(pool),
      mfa: new PgMfaRepo(pool),
      ssoConfigs: new PgSsoConfigRepo(pool),
    };
    log.info('persistencia: postgres', { schema: dbCfg.schema });
  } else {
    log.warn('persistencia: memoria (solo dev; los datos se pierden al reiniciar)');
  }
  const ephemeral = await ephemeralStore();
  log.info(env('REDIS_URL') ? 'estado efímero: redis' : 'estado efímero: memoria (solo dev, una réplica)');

  const app = await NestFactory.create(AuthAppModule.with(buildContainer(repos, ephemeral)), { cors: false });
  const checks: ReadinessCheck[] = [];
  if (pool) checks.push({ name: 'db', check: () => pingDb(pool) });
  if (env('REDIS_URL')) checks.push({ name: 'redis', check: () => ephemeral.ping() });
  registerHealthRoutes(app.getHttpAdapter().getInstance(), SERVICE, checks);
  app.setGlobalPrefix('api');
  onShutdown(log, [() => app.close(), async () => pool?.end(), () => ephemeral.close()]);

  const port = Number(env('PORT', '8081'));
  await app.listen(port, '0.0.0.0');
  log.info(`auth-service escuchando en :${port}`);
}

if (require.main === module) {
  bootstrap().catch((e: unknown) => {
    log.error('no se pudo arrancar', { error: (e as Error).message });
    process.exit(1);
  });
}
