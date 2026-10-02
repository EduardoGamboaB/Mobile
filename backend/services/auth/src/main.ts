import 'reflect-metadata';
import { createHash } from 'crypto';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AuthController } from './auth.controller';
import {
  AuditController,
  MfaController,
  SecurityPolicyController,
  SsoController,
  UsersController,
} from './security.controllers';
import { buildAuthContainer } from './container';
import { AUDIT_INGEST_TOKEN, AUTH_CONTAINER } from './tokens';
import { RecordingEventBus, type EventBus } from './event.bus';
import { PubSubEventBus } from './pubsub.bus';
import { FetchOidcDiscovery, FetchTokenExchanger, JwksSignatureVerifier } from './sso/oidc';
import { IntegrationsClient, SecretResolver } from '@g3/integrations';
import { ProviderEmailSender, ProviderSmsSender } from './passwordless/provider-senders';

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

@Module({
  controllers: [
    AuthController,
    MfaController,
    SecurityPolicyController,
    SsoController,
    UsersController,
    AuditController,
  ],
  providers: [
    {
      provide: AUTH_CONTAINER,
      useFactory: () => {
        const secretResolver = new SecretResolver();
        // Sin INTEGRATIONS_URL/INTERNAL_TOKEN solo usa variables de entorno (o modo registro).
        const integrations = new IntegrationsClient({
          baseUrl: env('INTEGRATIONS_URL'),
          internalToken: env('INTERNAL_TOKEN'),
          onError: (m) => console.warn(m),
        });
        const bus: EventBus =
          env('GCP_PROJECT_ID') !== '' ? new PubSubEventBus() : new RecordingEventBus();
        return buildAuthContainer({
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
      },
    },
    // Ingesta interna de auditoría (trips, integrations…): AUDIT_INGEST_TOKEN o, si no, INTERNAL_TOKEN.
    { provide: AUDIT_INGEST_TOKEN, useValue: env('AUDIT_INGEST_TOKEN') || env('INTERNAL_TOKEN') },
  ],
})
class AuthAppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AuthAppModule, { cors: false });
  app.setGlobalPrefix('api');
  await app.listen(Number(env('PORT', '8081')), '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[auth-service] up on :${env('PORT', '8081')}`);
}

if (require.main === module) {
  bootstrap();
}
