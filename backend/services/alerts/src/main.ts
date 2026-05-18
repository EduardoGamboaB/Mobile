import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { InMemoryAlertRepo } from './in-memory.alert.repo';
import { RecordingEventBus } from './event.bus';

@Module({
  controllers: [AlertsController],
  providers: [{ provide: AlertsService, useFactory: () => new AlertsService(new InMemoryAlertRepo(), new RecordingEventBus()) }],
})
class AlertsAppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AlertsAppModule, { cors: false });
  app.setGlobalPrefix('api');
  const port = Number(process.env.PORT ?? '8086');
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[alerts-service] up on :${port}`);
}
if (require.main === module) bootstrap();
