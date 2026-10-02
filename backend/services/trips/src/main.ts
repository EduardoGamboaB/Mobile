import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpensePolicyController, InternalTripsController, TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { InMemoryTripRepo } from './in-memory.trip.repo';
import { RecordingEventBus } from './event.bus';
import {
  InMemoryEvidenceRepo,
  InMemoryExpensePolicyRepo,
  InMemoryLogbookRepo,
  StubEvidenceStorage,
} from './in-memory.ops.repo';
import { auditSinkFromEnv, NoopAuditSink, type AuditSink } from './audit.sink';

/** Módulo con sus dependencias (en prod: TypeORM/Postgres y Pub/Sub). */
function buildModule(audit: AuditSink) {
  @Module({
    // InternalTripsController antes que TripsController: `/trips/internal/*` no es un id de viaje.
    controllers: [InternalTripsController, TripsController, ExpensePolicyController],
    providers: [
      {
        provide: TripsService,
        useFactory: () =>
          new TripsService(
            new InMemoryTripRepo(),
            new RecordingEventBus(),
            {
              logbook: new InMemoryLogbookRepo(),
              evidences: new InMemoryEvidenceRepo(),
              policies: new InMemoryExpensePolicyRepo(),
              storage: new StubEvidenceStorage(),
            },
            { audit },
          ),
      },
    ],
  })
  class TripsAppModule {}
  return TripsAppModule;
}

export async function createTripsApp(opts: { logger?: false; audit?: AuditSink } = {}) {
  const audit = opts.audit ?? auditSinkFromEnv();
  if (audit instanceof NoopAuditSink && opts.logger !== false) {
    // eslint-disable-next-line no-console
    console.warn('[trips-service] AUTH_URL/INTERNAL_TOKEN sin configurar: cambios de política de gastos sin auditoría');
  }
  const app = await NestFactory.create(buildModule(audit), {
    cors: false,
    ...(opts.logger === false ? { logger: false as const } : {}),
  });
  app.setGlobalPrefix('api');
  return app;
}

async function bootstrap() {
  const app = await createTripsApp();
  const port = Number(process.env.PORT ?? '8085');
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[trips-service] up on :${port}`);
}
if (require.main === module) bootstrap();
