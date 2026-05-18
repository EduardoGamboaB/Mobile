import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { envSchema } from './config/env.schema';
import { dataSourceOptions } from './database/data-source';

import { HealthController } from './common/health.controller';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
import { TierFeatureGuard } from './common/guards/tier-feature.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

import { AuthModule } from './modules/auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { UsersModule } from './modules/users/users.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { TractorsModule } from './modules/tractors/tractors.module';
import { TrailersModule } from './modules/trailers/trailers.module';
import { TripsModule } from './modules/trips/trips.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { EventsModule } from './modules/events/events.module';
import { AiModule } from './modules/ai/ai.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (raw) => envSchema.parse(raw),
      envFilePath: ['.env.local', '.env'],
    }),

    TypeOrmModule.forRoot(dataSourceOptions),

    // Rate limit global (más adelante personalizar por tier en BusinessModule).
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1_000, limit: 30 },
      { name: 'long',  ttl: 60_000, limit: 600 },
    ]),

    // Bus de eventos + AI compartido como dependencias horizontales
    EventsModule,
    AiModule,

    // Auth y multi-tenant root
    AuthModule,
    CompaniesModule,
    UsersModule,

    // Comercio
    SubscriptionsModule,
    WebhooksModule,

    // Dominio operativo
    DriversModule,
    TractorsModule,
    TrailersModule,
    TripsModule,
    AlertsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Orden de guardas: throttle → jwt → tier feature gating
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TierFeatureGuard },
    // Interceptor de tenant: inyecta companyId desde el JWT a cada request
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
  ],
})
export class AppModule {}
