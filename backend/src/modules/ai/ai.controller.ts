import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AIService } from './ai.service';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Feature } from '../../shared/tiers';
import {
  CurrentCompany,
  CurrentUser,
  JwtPayload,
} from '../../common/decorators/current-user.decorator';
import type {
  ClassifyEventInput, ExtractEvidenceInput, RouteIncidentInput,
  AssistantReplyInput, InspectionPhotoInput,
} from './types';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AIController {
  constructor(private readonly ai: AIService) {}

  @RequireFeature(Feature.AILogbookClassifier)
  @Post('classify-logbook')
  classifyLogbook(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: ClassifyEventInput,
  ) {
    return this.ai.classifyLogbookEvent({ companyId, tier: user.tier }, body);
  }

  @RequireFeature(Feature.AIOcrEvidence)
  @Post('extract-evidence')
  extractEvidence(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: ExtractEvidenceInput,
  ) {
    return this.ai.extractEvidence({ companyId, tier: user.tier }, body);
  }

  @RequireFeature(Feature.AIIncidentRouter)
  @Post('route-incident')
  routeIncident(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: RouteIncidentInput,
  ) {
    return this.ai.routeIncident({ companyId, tier: user.tier }, body);
  }

  @RequireFeature(Feature.AIAssistantChat)
  @Post('assistant-reply')
  assistantReply(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: AssistantReplyInput,
  ) {
    return this.ai.assistantReply({ companyId, tier: user.tier }, body);
  }

  @RequireFeature(Feature.AIInspectionAnalysis)
  @Post('analyze-inspection-photo')
  analyzeInspection(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: InspectionPhotoInput,
  ) {
    return this.ai.analyzeInspectionPhoto({ companyId, tier: user.tier }, body);
  }
}
