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
import { IntegrationsClient } from '@g3/integrations';
import {
  InMemoryContactDirectory,
  ResolvedPushNotifier,
  ResolvedWhatsAppNotifier,
  type Notifier,
} from './incidents/notifier';

/**
 * Canales resueltos POR COMPAÑÍA del incidente vía el servicio integrations
 * (push: plataforma → entorno; WhatsApp: compañía → plataforma → entorno).
 * Sin INTEGRATIONS_URL/INTERNAL_TOKEN se usan solo las variables de entorno
 * (EXPO_PUSH_ENABLED/EXPO_ACCESS_TOKEN, WHATSAPP_*); sin nada, el canal queda
 * en modo registro para no enviar por accidente.
 */
export function buildNotifiers(env: Record<string, string | undefined> = process.env): Notifier[] {
  const integrations = new IntegrationsClient({
    baseUrl: env.INTEGRATIONS_URL,
    internalToken: env.INTERNAL_TOKEN,
    env,
    onError: (m) => console.warn(m),
  });
  return [new ResolvedPushNotifier(integrations), new ResolvedWhatsAppNotifier(integrations)];
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
