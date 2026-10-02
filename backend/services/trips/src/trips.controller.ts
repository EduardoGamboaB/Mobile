import { Body, Controller, Get, HttpCode, Inject, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type {
  CreateEvidenceDto,
  CreateLogbookEntryDto,
  ProfitabilityQueryDto,
  TierValue,
  TripStatus,
} from '@g3/contracts';
import { TripsService, type CreateTripInput, type ExpensePolicyInput, type RequestCtx } from './trips.service';

/** Contexto que inyecta el gateway tras validar el JWT. */
export function ctx(req: Request): RequestCtx {
  const companyId = req.header('x-company-id');
  const tier = req.header('x-tier') as TierValue | undefined;
  if (!companyId || !tier) throw new Error('x-company-id y x-tier requeridos');
  return {
    companyId,
    tier,
    userId: req.header('x-user-id') ?? undefined,
    role: req.header('x-user-role') ?? undefined,
    driverId: req.header('x-driver-id') ?? undefined,
  };
}

@Controller('/trips')
export class TripsController {
  constructor(@Inject(TripsService) private readonly svc: TripsService) {}

  @Get() list(@Req() req: Request, @Query('status') status?: TripStatus, @Query('driverId') driverId?: string) {
    return this.svc.list(ctx(req), { status, driverId });
  }
  /** Viajes del chofer autenticado (G3 Drive). */
  @Get('mine') mine(@Req() req: Request, @Query('scope') scope?: 'active' | 'history') {
    return this.svc.listMine(ctx(req), scope === 'history' ? 'history' : 'active');
  }
  /**
   * Rentabilidad del periodo (US-25). Declarada ANTES de `:id` para que
   * `profitability` no se lea como id de viaje.
   */
  @Get('profitability') profitability(
    @Req() req: Request,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('driverId') driverId?: string,
    @Query('tractorId') tractorId?: string,
    @Query('status') status?: string,
  ) {
    const q: ProfitabilityQueryDto = { from, to, driverId, tractorId, status };
    return this.svc.profitabilityReport(ctx(req), q);
  }
  @Get(':id/profitability') tripProfitability(@Req() req: Request, @Param('id') id: string) {
    return this.svc.tripProfitability(ctx(req), id);
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

  @Get(':id/logbook') logbook(@Req() req: Request, @Param('id') id: string) {
    return this.svc.listLogbook(ctx(req), id);
  }
  @Post(':id/logbook') addLogbook(@Req() req: Request, @Param('id') id: string, @Body() body: CreateLogbookEntryDto) {
    return this.svc.addLogbookEntry(ctx(req), id, body);
  }

  @Get(':id/evidences') evidences(@Req() req: Request, @Param('id') id: string) {
    return this.svc.listEvidences(ctx(req), id);
  }
  @Post(':id/evidences/upload-url') @HttpCode(200) uploadUrl(
    @Req() req: Request, @Param('id') id: string, @Body() body: { clientUuid: string; mimeType: string },
  ) {
    return this.svc.evidenceUploadUrl(ctx(req), id, body);
  }
  @Post(':id/evidences') registerEvidence(
    @Req() req: Request, @Param('id') id: string, @Body() body: CreateEvidenceDto,
  ) {
    return this.svc.registerEvidence(ctx(req), id, body);
  }
}

@Controller('/expense-policy')
export class ExpensePolicyController {
  constructor(@Inject(TripsService) private readonly svc: TripsService) {}

  @Get() get(@Req() req: Request) { return this.svc.getExpensePolicy(ctx(req)); }
  @Put() put(@Req() req: Request, @Body() body: ExpensePolicyInput) { return this.svc.putExpensePolicy(ctx(req), body); }
}
