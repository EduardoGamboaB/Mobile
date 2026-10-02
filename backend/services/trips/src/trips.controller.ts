import { timingSafeEqual } from 'crypto';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
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
    ip: req.header('x-client-ip') ?? undefined,
    userAgent: req.header('user-agent') ?? undefined,
  };
}

/**
 * Endpoints servicio→servicio: `x-internal-token` = INTERNAL_TOKEN, comparado
 * en tiempo constante. El gateway responde 404 a `/api/trips/internal/*`.
 */
function requireInternal(req: Request) {
  const expected = Buffer.from(process.env.INTERNAL_TOKEN ?? '');
  const got = Buffer.from(req.header('x-internal-token') ?? '');
  if (expected.length === 0 || got.length !== expected.length || !timingSafeEqual(got, expected)) {
    throw new UnauthorizedException('Token interno inválido');
  }
}

@Controller('/trips/internal')
export class InternalTripsController {
  constructor(@Inject(TripsService) private readonly svc: TripsService) {}

  /** Viaje activo de un vehículo (tracto o remolque). Lo usa fleet para enriquecer señales a alerts. */
  @Get('active-by-vehicle/:vehicleId') async activeByVehicle(
    @Req() req: Request,
    @Param('vehicleId') vehicleId: string,
    @Query('companyId') companyId?: string,
  ) {
    requireInternal(req);
    if (!companyId) throw new BadRequestException('companyId requerido');
    const trip = await this.svc.activeTripByVehicle(companyId, vehicleId);
    if (!trip) throw new NotFoundException('Sin viaje activo para el vehículo');
    return trip;
  }
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
