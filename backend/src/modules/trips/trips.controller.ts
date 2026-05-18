import {
  Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { CreateTripDto, UpdateTripStatusDto } from './dto/trip.dto';
import { CurrentCompany } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { Feature } from '../../shared/tiers';

@ApiTags('trips')
@ApiBearerAuth()
@Controller('trips')
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Get()
  list(@CurrentCompany() companyId: string) {
    return this.trips.list(companyId);
  }

  @Get(':id')
  findOne(@CurrentCompany() companyId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.trips.findOne(companyId, id);
  }

  @Roles('owner', 'admin', 'dispatcher')
  @Post()
  create(@CurrentCompany() companyId: string, @Body() dto: CreateTripDto) {
    return this.trips.create(companyId, dto);
  }

  @Patch(':id/status')
  advanceStatus(
    @CurrentCompany() companyId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTripStatusDto,
  ) {
    return this.trips.advanceStatus(companyId, id, dto.status);
  }

  /** Liberación de pago — feature de Starter+. */
  @RequireFeature(Feature.PaymentAuthorization)
  @Roles('owner', 'admin')
  @Post(':id/release-payment')
  release(@CurrentCompany() companyId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.trips.releasePayment(companyId, id);
  }
}
