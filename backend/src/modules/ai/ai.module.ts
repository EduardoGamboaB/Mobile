import { Global, Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { StubAIProvider } from './providers/stub.provider';
import { VertexAIProvider } from './providers/vertex.provider';

@Global()
@Module({
  providers: [AIService, StubAIProvider, VertexAIProvider],
  controllers: [AIController],
  exports: [AIService],
})
export class AiModule {}
