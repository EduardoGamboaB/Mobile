import {
  Controller, Get, Param, ParseUUIDPipe, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { CurrentCompany } from '../../common/decorators/current-user.decorator';

@ApiTags('alerts')
@ApiBearerAuth()
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  @ApiQuery({ name: 'open', required: false, type: Boolean })
  list(@CurrentCompany() companyId: string, @Query('open') open?: string) {
    const acknowledged = open === undefined ? undefined : open === 'false';
    return this.alerts.list(companyId, { acknowledged });
  }

  @Post(':id/acknowledge')
  acknowledge(@CurrentCompany() companyId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.alerts.acknowledge(companyId, id);
  }
}
