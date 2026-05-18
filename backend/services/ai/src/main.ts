import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { StubAIProvider } from './providers/stub.provider';
import { RecordingEventBus } from './event.bus';

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
  const app = await NestFactory.create(AIAppModule, { cors: false });
  app.setGlobalPrefix('api');
  const port = Number(process.env.PORT ?? '8087');
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[ai-service] up on :${port}`);
}
if (require.main === module) bootstrap();
