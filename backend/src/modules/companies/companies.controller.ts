import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dto/company.dto';
import { CurrentCompany } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('companies')
@ApiBearerAuth()
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get('me')
  me(@CurrentCompany() companyId: string) {
    return this.companies.findOne(companyId);
  }

  @Roles('owner', 'admin')
  @Patch('me')
  updateMe(@CurrentCompany() companyId: string, @Body() dto: UpdateCompanyDto) {
    return this.companies.update(companyId, dto);
  }
}
