import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { InMemoryTripRepo } from './in-memory.trip.repo';
import { RecordingEventBus } from './event.bus';

@Module({
  controllers: [TripsController],
  providers: [{ provide: TripsService, useFactory: () => new TripsService(new InMemoryTripRepo(), new RecordingEventBus()) }],
})
class TripsAppModule {}

async function bootstrap() {
  const app = await NestFactory.create(TripsAppModule, { cors: false });
  app.setGlobalPrefix('api');
  const port = Number(process.env.PORT ?? '8085');
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[trips-service] up on :${port}`);
}
if (require.main === module) bootstrap();
