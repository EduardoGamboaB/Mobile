import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { TierValue } from '@g3/contracts';
import { DriversService, type CreateDriverInput, type RequestCtx } from './drivers.service';

function ctx(req: Request): RequestCtx {
  const companyId = req.header('x-company-id');
  const tier = req.header('x-tier') as TierValue | undefined;
  if (!companyId || !tier) throw new Error('x-company-id y x-tier requeridos');
  return { companyId, tier };
}

@Controller('/drivers')
export class DriversController {
  constructor(@Inject(DriversService) private readonly svc: DriversService) {}
  @Get() list(@Req() req: Request) { return this.svc.list(ctx(req)); }
  @Get(':id') get(@Req() req: Request, @Param('id') id: string) { return this.svc.get(ctx(req), id); }
  @Post() create(@Req() req: Request, @Body() body: CreateDriverInput) { return this.svc.create(ctx(req), body); }
  @Patch(':id') update(@Req() req: Request, @Param('id') id: string, @Body() body: Partial<CreateDriverInput>) {
    return this.svc.update(ctx(req), id, body);
  }
  @Delete(':id') @HttpCode(204) async remove(@Req() req: Request, @Param('id') id: string) {
    await this.svc.remove(ctx(req), id);
  }
}
