import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { AlertDto, TierValue } from '@g3/contracts';
import { AlertsService, type CreateAlertInput, type RequestCtx } from './alerts.service';

function ctx(req: Request): RequestCtx {
  const companyId = req.header('x-company-id');
  const tier = req.header('x-tier') as TierValue | undefined;
  if (!companyId || !tier) throw new Error('x-company-id y x-tier requeridos');
  return { companyId, tier };
}

@Controller('/alerts')
export class AlertsController {
  constructor(@Inject(AlertsService) private readonly svc: AlertsService) {}
  @Get() list(@Req() req: Request, @Query('resolved') resolved?: string, @Query('level') level?: AlertDto['level']) {
    return this.svc.list(ctx(req), { resolved: resolved === undefined ? undefined : resolved === 'true', level });
  }
  @Post() create(@Req() req: Request, @Body() body: CreateAlertInput) { return this.svc.create(ctx(req), body); }
  @Patch(':id') @HttpCode(200) resolve(@Req() req: Request, @Param('id') id: string) {
    return this.svc.resolve(ctx(req), id);
  }
}
