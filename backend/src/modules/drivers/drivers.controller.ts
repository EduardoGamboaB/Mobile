import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DriversService } from './drivers.service';
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';
import { CurrentCompany } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('drivers')
@ApiBearerAuth()
@Controller('drivers')
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @Get()
  list(@CurrentCompany() companyId: string) {
    return this.drivers.list(companyId);
  }

  @Get(':id')
  findOne(@CurrentCompany() companyId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.drivers.findOne(companyId, id);
  }

  @Roles('owner', 'admin', 'dispatcher')
  @Post()
  create(@CurrentCompany() companyId: string, @Body() dto: CreateDriverDto) {
    return this.drivers.create(companyId, dto);
  }

  @Roles('owner', 'admin', 'dispatcher')
  @Patch(':id')
  update(
    @CurrentCompany() companyId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDriverDto,
  ) {
    return this.drivers.update(companyId, id, dto);
  }

  @Roles('owner', 'admin')
  @Delete(':id')
  remove(@CurrentCompany() companyId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.drivers.remove(companyId, id);
  }
}
