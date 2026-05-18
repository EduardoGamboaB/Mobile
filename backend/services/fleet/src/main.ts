import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { TractorsController, TrailersController } from './fleet.controller';
import { FleetService } from './fleet.service';
import { InMemoryTractorRepo, InMemoryTrailerRepo } from './in-memory.repos';

@Module({
  controllers: [TractorsController, TrailersController],
  providers: [
    {
      provide: FleetService,
      useFactory: () => new FleetService(new InMemoryTractorRepo(), new InMemoryTrailerRepo()),
    },
  ],
})
class FleetAppModule {}

async function bootstrap() {
  const app = await NestFactory.create(FleetAppModule, { cors: false });
  app.setGlobalPrefix('api');
  const port = Number(process.env.PORT ?? '8084');
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[fleet-service] up on :${port}`);
}
if (require.main === module) bootstrap();
