import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BcryptPasswordHasher } from './password.hasher';
import { JwtTokenIssuer } from './token.issuer';
import { InMemoryUserRepo } from './repos/in-memory.user.repo';
import { InMemoryCompanyRepo } from './repos/in-memory.company.repo';
import { RecordingEventBus, type EventBus } from './event.bus';
import { PubSubEventBus } from './pubsub.bus';

const env = (k: string, fallback?: string): string => process.env[k] ?? fallback ?? '';

@Module({
  controllers: [AuthController],
  providers: [
    {
      provide: AuthService,
      useFactory: () => {
        const users = new InMemoryUserRepo();
        const companies = new InMemoryCompanyRepo();
        const hasher = new BcryptPasswordHasher(Number(env('BCRYPT_ROUNDS', '12')));
        const tokens = new JwtTokenIssuer({
          accessSecret: env('JWT_ACCESS_SECRET', 'a'.repeat(32)),
          refreshSecret: env('JWT_REFRESH_SECRET', 'b'.repeat(32)),
          accessTtlSec: Number(env('JWT_ACCESS_TTL', '3600')),
          refreshTtlSec: Number(env('JWT_REFRESH_TTL', '604800')),
        });
        const bus: EventBus =
          env('GCP_PROJECT_ID') !== '' ? new PubSubEventBus() : new RecordingEventBus();
        return new AuthService(users, companies, hasher, tokens, bus);
      },
    },
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
