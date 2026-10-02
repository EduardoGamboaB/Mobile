import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { CreateDeviceDto, LinkDeviceDto, TierValue, UpdateDeviceDto, UserRole } from '@g3/contracts';
import type { RequestCtx } from './fleet.service';
import { DevicesService } from './devices.service';
import { TelemetryService } from './telemetry/telemetry.service';

function ctx(req: Request): RequestCtx {
  const companyId = req.header('x-company-id');
  const tier = req.header('x-tier') as TierValue | undefined;
  const role = req.header('x-user-role') as UserRole | undefined;
  if (!companyId || !tier) throw new Error('x-company-id y x-tier requeridos');
  return { companyId, tier, role };
}

@Controller('/devices')
export class DevicesController {
  constructor(@Inject(DevicesService) private readonly svc: DevicesService) {}
  @Get() list(@Req() req: Request) { return this.svc.list(ctx(req)); }
  @Get(':id') get(@Req() req: Request, @Param('id') id: string) { return this.svc.get(ctx(req), id); }
  @Post() create(@Req() req: Request, @Body() body: CreateDeviceDto) { return this.svc.create(ctx(req), body); }
  @Patch(':id') update(@Req() req: Request, @Param('id') id: string, @Body() body: UpdateDeviceDto) {
    return this.svc.update(ctx(req), id, body);
  }
  @Delete(':id') @HttpCode(204) async remove(@Req() req: Request, @Param('id') id: string) {
    await this.svc.remove(ctx(req), id);
  }
  @Post(':id/link') @HttpCode(200) link(@Req() req: Request, @Param('id') id: string, @Body() body: LinkDeviceDto) {
    return this.svc.link(ctx(req), id, body);
  }
  @Post(':id/unlink') @HttpCode(200) unlink(@Req() req: Request, @Param('id') id: string) {
    return this.svc.unlink(ctx(req), id);
  }
}

@Controller('/telemetry')
export class TelemetryController {
  constructor(@Inject(TelemetryService) private readonly svc: TelemetryService) {}

  /**
   * Webhook público (sin JWT): autenticado por `x-g3-ingest-token`.
   * Body: JSON (teltonika/generic, o `{ messages: string[] }` para ASCII) o
   * text/plain con líneas ASCII (suntech/queclink).
   */
  @Post('ingest/:provider') @HttpCode(202)
  ingest(@Req() req: Request, @Param('provider') provider: string, @Body() body: unknown) {
    return this.svc.ingest(provider, req.header('x-g3-ingest-token'), body);
  }

  @Get('ingest-tokens') listTokens(@Req() req: Request) { return this.svc.listIngestTokens(ctx(req)); }
  @Post('ingest-tokens') createToken(@Req() req: Request, @Body() body: { label?: string }) {
    return this.svc.createIngestToken(ctx(req), body ?? {});
  }
  @Delete('ingest-tokens/:id') revokeToken(@Req() req: Request, @Param('id') id: string) {
    return this.svc.revokeIngestToken(ctx(req), id);
  }
  @Get('unknown-devices') unknown(@Req() req: Request) { return this.svc.listUnknownDevices(ctx(req)); }
}

@Controller('/vehicles')
export class VehiclesController {
  constructor(@Inject(TelemetryService) private readonly svc: TelemetryService) {}
  @Get(':id/track')
  track(@Req() req: Request, @Param('id') id: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.vehicleTrack(ctx(req), id, from, to);
  }
}
