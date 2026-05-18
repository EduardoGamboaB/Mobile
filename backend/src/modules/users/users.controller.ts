import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  CurrentCompany,
  CurrentUser,
  JwtPayload,
} from '../../common/decorators/current-user.decorator';
import { Feature } from '../../shared/tiers';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return user;
  }

  /** Listar usuarios de la compañía — requiere multi-usuario (Business+). */
  @RequireFeature(Feature.MultiUser)
  @Get()
  list(@CurrentCompany() companyId: string) {
    return this.users.listByCompany(companyId);
  }
}
