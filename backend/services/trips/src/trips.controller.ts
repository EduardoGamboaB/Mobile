import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { TierValue, TripStatus } from '@g3/contracts';
import { TripsService, type CreateTripInput, type RequestCtx } from './trips.service';

function ctx(req: Request): RequestCtx {
  const companyId = req.header('x-company-id');
  const tier = req.header('x-tier') as TierValue | undefined;
  if (!companyId || !tier) throw new Error('x-company-id y x-tier requeridos');
  return { companyId, tier };
}

@Controller('/trips')
export class TripsController {
  constructor(@Inject(TripsService) private readonly svc: TripsService) {}

  @Get() list(@Req() req: Request, @Query('status') status?: TripStatus, @Query('driverId') driverId?: string) {
    return this.svc.list(ctx(req), { status, driverId });
  }
  @Get(':id') get(@Req() req: Request, @Param('id') id: string) { return this.svc.get(ctx(req), id); }
  @Post() create(@Req() req: Request, @Body() body: CreateTripInput) { return this.svc.create(ctx(req), body); }
  @Patch(':id/status') @HttpCode(200) setStatus(
    @Req() req: Request, @Param('id') id: string, @Body() body: { status: TripStatus },
  ) {
    return this.svc.setStatus(ctx(req), id, body.status);
  }
  @Post(':id/release-payment') @HttpCode(200) release(@Req() req: Request, @Param('id') id: string) {
    return this.svc.releasePayment(ctx(req), id);
  }
}
