import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { AIService } from './ai.service';
import type {
  AssistantReplyInput,
  ClassifyEventInput,
  DriverInsightsInput,
  ExtractEvidenceInput,
  InspectionPhotoInput,
  RouteIncidentInput,
} from './types';

@Controller('/ai')
export class AIController {
  constructor(@Inject(AIService) private readonly ai: AIService) {}

  @Post('classify-logbook') @HttpCode(200) classify(@Body() body: ClassifyEventInput) {
    return this.ai.classifyLogbookEvent(body);
  }
  @Post('extract-evidence') @HttpCode(200) extract(@Body() body: ExtractEvidenceInput) {
    return this.ai.extractEvidence(body);
  }
  @Post('route-incident') @HttpCode(200) route(@Body() body: RouteIncidentInput) {
    return this.ai.routeIncident(body);
  }
  @Post('assistant-reply') @HttpCode(200) assist(@Body() body: AssistantReplyInput) {
    return this.ai.assistantReply(body);
  }
  @Post('analyze-inspection-photo') @HttpCode(200) inspect(@Body() body: InspectionPhotoInput) {
    return this.ai.analyzeInspectionPhoto(body);
  }
  @Post('driver-insights') @HttpCode(200) insights(@Body() body: DriverInsightsInput) {
    return this.ai.driverInsights(body);
  }
}
