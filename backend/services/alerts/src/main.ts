import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { InMemoryAlertRepo } from './in-memory.alert.repo';
import { RecordingEventBus } from './event.bus';
import { HttpErrorFilter } from './http-error.filter';
import {
  AlertRulesController,
  IncidentsController,
  NotificationContactsController,
} from './incidents/incidents.controller';
import { IncidentsService } from './incidents/incidents.service';
import { InMemoryAlertRuleRepo, InMemoryIncidentRepo } from './incidents/in-memory.incidents.repo';
import {
  ExpoPushNotifier,
  InMemoryContactDirectory,
  RecordingNotifier,
  WhatsAppCloudNotifier,
  type Notifier,
} from './incidents/notifier';

/**
 * Canales reales solo si hay credenciales; si no, se registran en memoria
 * (desarrollo local) para no enviar nada por accidente.
 */
function buildNotifiers(): Notifier[] {
  const http = (url: string, init: { method: string; headers: Record<string, string>; body: string }) =>
    fetch(url, init);
  const push: Notifier = process.env.EXPO_PUSH_ENABLED === '1'
    ? new ExpoPushNotifier(http, process.env.EXPO_ACCESS_TOKEN)
    : new RecordingNotifier('push');
  const wa: Notifier =
    process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN
      ? new WhatsAppCloudNotifier(http, {
          phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
          accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
          template: process.env.WHATSAPP_TEMPLATE,
        })
      : new RecordingNotifier('whatsapp');
  return [push, wa];
}

@Module({
  controllers: [AlertsController, IncidentsController, AlertRulesController, NotificationContactsController],
  providers: [
    { provide: AlertsService, useFactory: () => new AlertsService(new InMemoryAlertRepo(), new RecordingEventBus()) },
    {
      provide: IncidentsService,
      useFactory: () =>
        new IncidentsService({
          incidents: new InMemoryIncidentRepo(),
          rules: new InMemoryAlertRuleRepo(),
          contacts: new InMemoryContactDirectory(),
          notifiers: buildNotifiers(),
          bus: new RecordingEventBus(),
        }),
    },
  ],
})
class AlertsAppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AlertsAppModule, { cors: false });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpErrorFilter());
  const port = Number(process.env.PORT ?? '8086');
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[alerts-service] up on :${port}`);
}
if (require.main === module) bootstrap();
