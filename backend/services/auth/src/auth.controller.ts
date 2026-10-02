import { Body, Controller, HttpCode, Inject, Post, Req } from '@nestjs/common';
import type {
  LoginDto,
  MfaChallengeConfirmDto,
  MfaChallengeEnrollDto,
  MfaVerifyDto,
  RefreshDto,
  RegisterCompanyDto,
} from '@g3/contracts';
import { AUTH_CONTAINER } from './tokens';
import type { AuthContainer } from './container';
import { metaFrom, run, type HttpRequestLike } from './http';
import { AuthError } from './errors';

/** Rutas públicas (sin JWT) — ver PUBLIC_PATHS en el gateway. */
@Controller('/auth')
export class AuthController {
  constructor(@Inject(AUTH_CONTAINER) private readonly c: AuthContainer) {}

  @Post('register-company')
  register(@Body() body: RegisterCompanyDto) {
    return run(() => this.c.auth.registerCompany(body));
  }

  /** Devuelve sesión o `{ mfaRequired: true, mfaToken }`. */
  @Post('login')
  @HttpCode(200)
  login(@Body() body: LoginDto, @Req() req: HttpRequestLike) {
    return run(() => this.c.auth.login(body, metaFrom(req)));
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() body: RefreshDto) {
    return run(async () => {
      try {
        return await this.c.auth.refresh(body);
      } catch (e) {
        if (e instanceof AuthError) throw e;
        throw new AuthError(401, 'Sesión inválida');
      }
    });
  }

  /** G3 Drive: código por SMS al teléfono del chofer (siempre 202). */
  @Post('otp/request')
  @HttpCode(202)
  otpRequest(@Body() body: { phone: string }, @Req() req: HttpRequestLike) {
    return run(() => this.c.passwordless.requestOtp(body?.phone, metaFrom(req)));
  }

  @Post('otp/verify')
  @HttpCode(200)
  otpVerify(@Body() body: { phone: string; code: string }, @Req() req: HttpRequestLike) {
    return run(() => this.c.passwordless.verifyOtp(body?.phone, body?.code, metaFrom(req)));
  }

  /** Siempre 202: no revela si el correo existe. */
  @Post('password/forgot')
  @HttpCode(202)
  forgot(@Body() body: { email: string }, @Req() req: HttpRequestLike) {
    return run(() => this.c.passwordless.requestPasswordReset(body?.email, metaFrom(req)));
  }

  @Post('password/reset')
  @HttpCode(200)
  reset(@Body() body: { token: string; newPassword: string }, @Req() req: HttpRequestLike) {
    return run(() => this.c.passwordless.resetPassword(body?.token, body?.newPassword, metaFrom(req)));
  }

  @Post('mfa/verify')
  @HttpCode(200)
  mfaVerify(@Body() body: MfaVerifyDto, @Req() req: HttpRequestLike) {
    return run(() => this.c.auth.verifyMfa(body, metaFrom(req)));
  }

  @Post('mfa/challenge/enroll')
  @HttpCode(200)
  challengeEnroll(@Body() body: MfaChallengeEnrollDto) {
    return run(() => this.c.auth.challengeEnroll(body));
  }

  @Post('mfa/challenge/confirm')
  @HttpCode(200)
  challengeConfirm(@Body() body: MfaChallengeConfirmDto, @Req() req: HttpRequestLike) {
    return run(() => this.c.auth.challengeConfirm(body, metaFrom(req)));
  }
}
