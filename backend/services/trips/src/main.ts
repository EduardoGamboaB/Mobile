import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpensePolicyController, TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { InMemoryTripRepo } from './in-memory.trip.repo';
import { RecordingEventBus } from './event.bus';
import {
  InMemoryEvidenceRepo,
  InMemoryExpensePolicyRepo,
  InMemoryLogbookRepo,
  StubEvidenceStorage,
} from './in-memory.ops.repo';

@Module({
  controllers: [TripsController, ExpensePolicyController],
  providers: [
    {
      provide: TripsService,
      useFactory: () =>
        new TripsService(new InMemoryTripRepo(), new RecordingEventBus(), {
          logbook: new InMemoryLogbookRepo(),
          evidences: new InMemoryEvidenceRepo(),
          policies: new InMemoryExpensePolicyRepo(),
          storage: new StubEvidenceStorage(),
        }),
    },
  ],
})
export class TripsAppModule {}

export async function createTripsApp(opts: { logger?: false } = {}) {
  const app = await NestFactory.create(TripsAppModule, {
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
