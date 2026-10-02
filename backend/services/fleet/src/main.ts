import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { TractorsController, TrailersController } from './fleet.controller';
import { DevicesController, TelemetryController, VehiclesController } from './telemetry.controller';
import { FleetService } from './fleet.service';
import { DevicesService } from './devices.service';
import { TelemetryService } from './telemetry/telemetry.service';
import {
  InMemoryDeviceRepo,
  InMemoryIngestTokenRepo,
  InMemoryTelemetryRepo,
  InMemoryTractorRepo,
  InMemoryTrailerRepo,
} from './in-memory.repos';
import type { EventBus } from './event.bus';
import { eventBusFromEnv } from './incident-signals';
import { HttpErrorFilter } from './http-error.filter';

/** Construye el módulo con repos compartidos (en prod: TypeORM/Postgres). */
function buildModule(bus: EventBus) {
  const tractors = new InMemoryTractorRepo();
  const trailers = new InMemoryTrailerRepo();
  const devices = new InMemoryDeviceRepo();
  const telemetry = new InMemoryTelemetryRepo();
  const tokens = new InMemoryIngestTokenRepo();

  @Module({
    controllers: [TractorsController, TrailersController, DevicesController, TelemetryController, VehiclesController],
    providers: [
      { provide: FleetService, useFactory: () => new FleetService(tractors, trailers, telemetry) },
      { provide: DevicesService, useFactory: () => new DevicesService(devices, tractors, trailers) },
      {
        provide: TelemetryService,
        useFactory: () => new TelemetryService({ devices, telemetry, tokens, tractors, trailers, bus }),
      },
    ],
  })
  class FleetAppModule {}
  return FleetAppModule;
}

/** App configurada (prefijo, body parsers, filtro de errores). Exportada para tests HTTP. */
export async function createFleetApp(opts: { bus?: EventBus; logger?: false } = {}) {
  // Con ALERTS_URL + INTERNAL_TOKEN: reenvía posiciones al centro de incidentes
  // (incident-signals.ts); si no, NoopEventBus.
  // TODO(prod): PubSubEventBus (patrón de services/auth/src/pubsub.bus.ts).
  const app = await NestFactory.create<NestExpressApplication>(buildModule(opts.bus ?? eventBusFromEnv()), {
    cors: false,
    bodyParser: false,
    ...(opts.logger === false ? { logger: false } : {}),
  });
  app.setGlobalPrefix('api');
  // Suntech/Queclink pueden mandar ASCII crudo como text/plain al webhook.
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('text', { type: ['text/plain'], limit: '1mb' });
  app.useGlobalFilters(new HttpErrorFilter());
  return app;
}

async function bootstrap() {
  const app = await createFleetApp();
  const port = Number(process.env.PORT ?? '8084');
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[fleet-service] up on :${port}`);
}
if (require.main === module) bootstrap();
