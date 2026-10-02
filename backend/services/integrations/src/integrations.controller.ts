import { createHash, timingSafeEqual } from 'crypto';
import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { UpsertIntegrationDto } from '@g3/contracts';
import { IntegrationsService, type RequestCtx } from './integrations.service';
import { UnauthorizedError } from './errors';

export const INTERNAL_TOKEN = 'INTEGRATIONS_INTERNAL_TOKEN';

function ctx(req: Request): RequestCtx {
  return {
    companyId: req.header('x-company-id') ?? '',
    userId: req.header('x-user-id') ?? null,
    role: req.header('x-user-role') ?? '',
    ip: req.header('x-client-ip') ?? null,
    userAgent: req.header('user-agent') ?? null,
  };
}

/** Comparación en tiempo constante (hash de ambos lados: misma longitud siempre). */
export function internalTokenMatches(given: string | undefined, expected: string): boolean {
  if (!expected || !given) return false;
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Endpoint INTERNO (servicio → servicio) con secretos en claro. El gateway
 * lo bloquea con 404 y nunca reenvía `x-internal-token`. Se registra antes
 * que `IntegrationsController` para que `internal/resolve` no se tome como
 * `:category/:slot`.
 */
@Controller('integrations/internal')
export class IntegrationsInternalController {
  constructor(
    @Inject(IntegrationsService) private readonly svc: IntegrationsService,
    @Inject(INTERNAL_TOKEN) private readonly internalToken: string,
  ) {}

  @Get('resolve')
  resolve(@Req() req: Request, @Query() q: Record<string, string | undefined>) {
    if (!internalTokenMatches(req.header('x-internal-token'), this.internalToken)) throw new UnauthorizedError('No autorizado');
    return this.svc.resolve(q.companyId || null, q.category ?? '', q.slot || 'default');
  }
}

@Controller('integrations')
export class IntegrationsController {
  constructor(@Inject(IntegrationsService) private readonly svc: IntegrationsService) {}

  @Get('catalog')
  catalog() {
    return this.svc.catalog();
  }

  @Get()
  overview(@Req() req: Request) {
    return this.svc.overview(ctx(req));
  }

  @Get(':category/:slot')
  get(@Req() req: Request, @Param('category') category: string, @Param('slot') slot: string, @Query('scope') scope?: string) {
    return this.svc.get(ctx(req), category, slot, scope);
  }

  @Put(':category/:slot')
  upsert(
    @Req() req: Request,
    @Param('category') category: string,
    @Param('slot') slot: string,
    @Body() body: UpsertIntegrationDto,
    @Query('scope') scope?: string,
  ) {
    return this.svc.upsert(ctx(req), category, slot, scope, body);
  }

  @Delete(':category/:slot')
  @HttpCode(204)
  async remove(@Req() req: Request, @Param('category') category: string, @Param('slot') slot: string, @Query('scope') scope?: string) {
    await this.svc.remove(ctx(req), category, slot, scope);
  }

  @Post(':category/:slot/test')
  @HttpCode(200)
  test(@Req() req: Request, @Param('category') category: string, @Param('slot') slot: string, @Query('scope') scope?: string) {
    return this.svc.test(ctx(req), category, slot, scope);
  }
}
