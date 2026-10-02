/**
 * Endpoints autenticados de seguridad: MFA del usuario, política por
 * compañía, SSO, cambios de rol y bitácora de auditoría.
 * Identidad = headers del gateway, re-validados contra la DB (`actorFrom`).
 */
import { timingSafeEqual } from 'crypto';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Optional,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import {
  AUDIT_ACTIONS,
  type AuditAction,
  type AuditActorDto,
  type ChangeUserRoleDto,
  type MfaCodeDto,
  type SsoCallbackDto,
  type SsoStartDto,
  type UpdateSecurityPolicyDto,
  type UpdateSsoConfigDto,
} from '@g3/contracts';
import { AUDIT_INGEST_TOKEN, AUTH_CONTAINER } from './tokens';
import type { AuthContainer } from './container';
import { actorFrom, metaFrom, run, type HttpRequestLike } from './http';
import { AuthError } from './errors';
import { assertAdmin } from './security/actor';

@Controller('/auth/mfa')
export class MfaController {
  constructor(@Inject(AUTH_CONTAINER) private readonly c: AuthContainer) {}

  private async user(req: HttpRequestLike) {
    const actor = await actorFrom(this.c, req);
    return { actor, user: (await this.c.users.findById(actor.userId))! };
  }

  @Get('status')
  status(@Req() req: HttpRequestLike) {
    return run(async () => this.c.mfa.status((await this.user(req)).user));
  }

  @Post('enroll')
  @HttpCode(200)
  enroll(@Req() req: HttpRequestLike) {
    return run(async () => this.c.mfa.beginEnrollment((await this.user(req)).user));
  }

  @Post('confirm')
  @HttpCode(200)
  confirm(@Body() body: MfaCodeDto, @Req() req: HttpRequestLike) {
    return run(async () => {
      const { actor, user } = await this.user(req);
      return this.c.mfa.confirmEnrollment(user, body?.code, actor);
    });
  }

  @Post('disable')
  @HttpCode(200)
  disable(@Body() body: MfaCodeDto, @Req() req: HttpRequestLike) {
    return run(async () => {
      const { actor, user } = await this.user(req);
      await this.c.mfa.disable(user, body?.code, actor);
      return { ok: true };
    });
  }

  @Post('recovery-codes')
  @HttpCode(200)
  regenerate(@Body() body: MfaCodeDto, @Req() req: HttpRequestLike) {
    return run(async () => {
      const { actor, user } = await this.user(req);
      return this.c.mfa.regenerateRecoveryCodes(user, body?.code, actor);
    });
  }
}

@Controller('/auth/security-policy')
export class SecurityPolicyController {
  constructor(@Inject(AUTH_CONTAINER) private readonly c: AuthContainer) {}

  @Get()
  get(@Req() req: HttpRequestLike) {
    return run(async () => this.c.policies.get((await actorFrom(this.c, req)).companyId));
  }

  @Put()
  update(@Body() body: UpdateSecurityPolicyDto, @Req() req: HttpRequestLike) {
    return run(async () => this.c.policies.update(await actorFrom(this.c, req), body));
  }
}

@Controller('/auth/sso')
export class SsoController {
  constructor(@Inject(AUTH_CONTAINER) private readonly c: AuthContainer) {}

  /** Público: ¿el dominio del correo tiene SSO? (para mostrar el botón). */
  @Get('discover')
  discover(@Query('email') email: string) {
    return run(() => this.c.sso.discover(String(email ?? '')));
  }

  /** Público. */
  @Post('start')
  @HttpCode(200)
  start(@Body() body: SsoStartDto) {
    return run(() => this.c.sso.start(body));
  }

  /** Público: canjea code+state por la sesión G3. */
  @Post('callback')
  @HttpCode(200)
  callback(@Body() body: SsoCallbackDto, @Req() req: HttpRequestLike) {
    return run(() => this.c.sso.callback(body, metaFrom(req)));
  }

  @Get('config')
  getConfig(@Req() req: HttpRequestLike) {
    return run(async () => this.c.sso.getConfig(await actorFrom(this.c, req)));
  }

  @Put('config')
  updateConfig(@Body() body: UpdateSsoConfigDto, @Req() req: HttpRequestLike) {
    return run(async () => this.c.sso.updateConfig(await actorFrom(this.c, req), body));
  }
}

@Controller('/users')
export class UsersController {
  constructor(@Inject(AUTH_CONTAINER) private readonly c: AuthContainer) {}

  /** Da acceso a G3 Drive (OTP por SMS) a un chofer del servicio drivers. */
  @Post('drivers')
  grantDriver(
    @Body() body: { driverId: string; phone: string; fullName: string; email?: string | null },
    @Req() req: HttpRequestLike,
  ) {
    return run(async () => this.c.passwordless.grantDriverAccess(await actorFrom(this.c, req), body));
  }

  @Patch(':id/role')
  changeRole(@Param('id') id: string, @Body() body: ChangeUserRoleDto, @Req() req: HttpRequestLike) {
    return run(async () => this.c.auth.changeUserRole(await actorFrom(this.c, req), id, body?.role));
  }
}

/** Acciones que otros servicios pueden registrar vía ingesta interna. */
/** Eventos que otros servicios pueden registrar (política de gastos, integraciones). */
const INGESTABLE: readonly AuditAction[] = [
  'expense_policy.updated',
  'integration.updated',
  'integration.deleted',
  'integration.tested',
];

interface IngestBody {
  companyId: string;
  actor: AuditActorDto;
  action: AuditAction;
  resource: { type: string; id: string | null };
  ip: string | null;
  userAgent: string | null;
  metadata?: Record<string, unknown>;
}

@Controller('/audit')
export class AuditController {
  constructor(
    @Inject(AUTH_CONTAINER) private readonly c: AuthContainer,
    @Optional() @Inject(AUDIT_INGEST_TOKEN) private readonly ingestToken: string = '',
  ) {}

  @Get('events')
  list(@Query() q: Record<string, string | undefined>, @Req() req: HttpRequestLike) {
    return run(async () => {
      const actor = await actorFrom(this.c, req);
      assertAdmin(actor);
      if (q.action && !AUDIT_ACTIONS.includes(q.action as AuditAction)) {
        throw new AuthError(400, 'Acción de auditoría desconocida');
      }
      return this.c.audit.query(actor.companyId, {
        page: q.page ? Number(q.page) : undefined,
        pageSize: q.pageSize ? Number(q.pageSize) : undefined,
        action: q.action as AuditAction | undefined,
        actorId: q.actorId,
        resourceType: q.resourceType,
        from: q.from,
        to: q.to,
      });
    });
  }

  @Get('verify')
  verify(@Req() req: HttpRequestLike) {
    return run(async () => {
      const actor = await actorFrom(this.c, req);
      assertAdmin(actor);
      return this.c.audit.verify(actor.companyId);
    });
  }

  /**
   * Ingesta servicio→servicio (p.ej. el dueño de la política de gastos).
   * Requiere `x-internal-token` = AUDIT_INGEST_TOKEN; sin token configurado
   * queda deshabilitada. En prod: reemplazar por OIDC de service account
   * (Cloud Run invoker) y bloquear la ruta en el gateway.
   */
  @Post('events')
  @HttpCode(201)
  ingest(@Body() body: IngestBody, @Req() req: HttpRequestLike) {
    return run(async () => {
      const given = req.headers['x-internal-token'];
      const token = Array.isArray(given) ? given[0] : given ?? '';
      const a = Buffer.from(token);
      const b = Buffer.from(this.ingestToken ?? '');
      if (b.length < 32 || a.length !== b.length || !timingSafeEqual(a, b)) {
        throw new AuthError(401, 'No autorizado');
      }
      if (!body?.companyId || !INGESTABLE.includes(body.action)) {
        throw new AuthError(400, 'Evento de auditoría no permitido');
      }
      return this.c.audit.record({
        companyId: body.companyId,
        actor: body.actor ?? { type: 'system', userId: null, role: null },
        action: body.action,
        resource: body.resource ?? { type: 'unknown', id: null },
        ip: body.ip ?? null,
        userAgent: body.userAgent ?? null,
        metadata: body.metadata ?? {},
      });
    });
  }
}
