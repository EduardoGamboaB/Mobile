import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TractorsService } from './tractors.service';
import { CreateTractorDto, UpdateTractorDto } from './dto/tractor.dto';
import { CurrentCompany } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Feature } from '../../shared/tiers';

@ApiTags('tractors')
@ApiBearerAuth()
@Controller('tractors')
export class TractorsController {
  constructor(private readonly tractors: TractorsService) {}

  @Get()
  list(@CurrentCompany() companyId: string) { return this.tractors.list(companyId); }

  @Get(':id')
  findOne(@CurrentCompany() companyId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.tractors.findOne(companyId, id);
  }

  @Roles('owner', 'admin', 'dispatcher')
  @Post()
  create(@CurrentCompany() companyId: string, @Body() dto: CreateTractorDto) {
    return this.tractors.create(companyId, dto);
  }

  @Roles('owner', 'admin', 'dispatcher')
  @Patch(':id')
  update(
    @CurrentCompany() companyId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTractorDto,
  ) {
    return this.tractors.update(companyId, id, dto);
  }

  @Roles('owner', 'admin')
  @Delete(':id')
  remove(@CurrentCompany() companyId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.tractors.remove(companyId, id);
  }

  /** Endpoint reservado para futura integración Pro+ (mapa en vivo). */
  @RequireFeature(Feature.FleetMap)
  @Get('live/positions')
  livePositions(@CurrentCompany() companyId: string) {
    return { companyId, message: 'Live positions endpoint reservado (stream WebSocket en V2)' };
  }
}
