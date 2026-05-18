import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { TierValue } from '@g3/contracts';
import { FleetService, type CreateTractorInput, type CreateTrailerInput, type RequestCtx } from './fleet.service';

function ctx(req: Request): RequestCtx {
  const companyId = req.header('x-company-id');
  const tier = req.header('x-tier') as TierValue | undefined;
  if (!companyId || !tier) throw new Error('x-company-id y x-tier requeridos');
  return { companyId, tier };
}

@Controller('/tractors')
export class TractorsController {
  constructor(@Inject(FleetService) private readonly svc: FleetService) {}
  @Get() list(@Req() req: Request) { return this.svc.listTractors(ctx(req)); }
  @Get('live/positions') live(@Req() req: Request) { return this.svc.livePositions(ctx(req)); }
  @Get(':id') get(@Req() req: Request, @Param('id') id: string) { return this.svc.getTractor(ctx(req), id); }
  @Post() create(@Req() req: Request, @Body() body: CreateTractorInput) { return this.svc.createTractor(ctx(req), body); }
  @Patch(':id') update(@Req() req: Request, @Param('id') id: string, @Body() body: Partial<CreateTractorInput>) {
    return this.svc.updateTractor(ctx(req), id, body);
  }
  @Delete(':id') @HttpCode(204) async remove(@Req() req: Request, @Param('id') id: string) {
    await this.svc.removeTractor(ctx(req), id);
  }
}

@Controller('/trailers')
export class TrailersController {
  constructor(@Inject(FleetService) private readonly svc: FleetService) {}
  @Get() list(@Req() req: Request) { return this.svc.listTrailers(ctx(req)); }
  @Get(':id') get(@Req() req: Request, @Param('id') id: string) { return this.svc.getTrailer(ctx(req), id); }
  @Post() create(@Req() req: Request, @Body() body: CreateTrailerInput) { return this.svc.createTrailer(ctx(req), body); }
  @Patch(':id') update(@Req() req: Request, @Param('id') id: string, @Body() body: Partial<CreateTrailerInput>) {
    return this.svc.updateTrailer(ctx(req), id, body);
  }
  @Delete(':id') @HttpCode(204) async remove(@Req() req: Request, @Param('id') id: string) {
    await this.svc.removeTrailer(ctx(req), id);
  }
}
