import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import type { LoginDto, RefreshDto, RegisterCompanyDto } from '@g3/contracts';
import { AuthService } from './auth.service';

@Controller('/auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('register-company')
  register(@Body() body: RegisterCompanyDto) {
    return this.auth.registerCompany(body);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() body: LoginDto) {
    return this.auth.login(body);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() body: RefreshDto) {
    return this.auth.refresh(body);
  }
}
