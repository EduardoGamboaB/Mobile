import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { createLogger, onShutdown, registerHealthRoutes } from '@g3/platform';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { StubAIProvider } from './providers/stub.provider';
import { RecordingEventBus } from './event.bus';

const SERVICE = 'ai';

@Module({
  controllers: [AIController],
  providers: [
    {
      provide: AIService,
      useFactory: () => {
        // Por ahora primary=stub. En prod swap por VertexProvider.
        const primary = new StubAIProvider();
        const fb = new StubAIProvider();
        return new AIService(primary, fb, new RecordingEventBus());
      },
    },
  ],
})
class AIAppModule {}

async function bootstrap() {
  const log = createLogger(SERVICE);
  const app = await NestFactory.create(AIAppModule, { cors: false });
  app.setGlobalPrefix('api');
  // Sin estado propio (ni DB ni Redis): /ready solo confirma que el proceso responde.
  registerHealthRoutes(app.getHttpAdapter().getInstance(), SERVICE, []);
  onShutdown(log, [() => app.close()]);
  const port = Number(process.env.PORT ?? '8087');
  await app.listen(port, '0.0.0.0');
  log.info(`escuchando en :${port}`);
}
if (require.main === module) {
  bootstrap().catch((e: unknown) => {
    createLogger(SERVICE).error('no arrancó', { error: (e as Error).message });
    process.exit(1);
  });
}
