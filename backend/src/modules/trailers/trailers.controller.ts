import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TrailersService } from './trailers.service';
import { CreateTrailerDto, UpdateTrailerDto } from './dto/trailer.dto';
import { CurrentCompany } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('trailers')
@ApiBearerAuth()
@Controller('trailers')
export class TrailersController {
  constructor(private readonly trailers: TrailersService) {}

  @Get()
  list(@CurrentCompany() companyId: string) { return this.trailers.list(companyId); }

  @Get(':id')
  findOne(@CurrentCompany() companyId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.trailers.findOne(companyId, id);
  }

  @Roles('owner', 'admin', 'dispatcher')
  @Post()
  create(@CurrentCompany() companyId: string, @Body() dto: CreateTrailerDto) {
    return this.trailers.create(companyId, dto);
  }

  @Roles('owner', 'admin', 'dispatcher')
  @Patch(':id')
  update(
    @CurrentCompany() companyId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTrailerDto,
  ) {
    return this.trailers.update(companyId, id, dto);
  }

  @Roles('owner', 'admin')
  @Delete(':id')
  remove(@CurrentCompany() companyId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.trailers.remove(companyId, id);
  }
}
