import { timingSafeEqual } from 'crypto';
import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type {
  CreateIncidentDto,
  IncidentStatus,
  IncidentUrgency,
  OperationalSignalDto,
  SosDto,
  TierValue,
} from '@g3/contracts';
import { IncidentsService, type AlertRuleInput, type ManualIncidentInput, type RequestCtx } from './incidents.service';
import { UnauthorizedError } from './errors';

function ctx(req: Request): RequestCtx {
  const companyId = req.header('x-company-id');
  const tier = req.header('x-tier') as TierValue | undefined;
  if (!companyId || !tier) throw new UnauthorizedError('x-company-id y x-tier requeridos');
  return {
    companyId,
    tier,
    userId: req.header('x-user-id') ?? undefined,
    role: req.header('x-user-role') ?? undefined,
    driverId: req.header('x-driver-id') ?? undefined,
  };
}

/**
 * Endpoints internos (Cloud Scheduler / suscripción push de Pub/Sub). El
 * gateway nunca reenvía `x-internal-token`, así que no son alcanzables desde
 * fuera aunque compartan prefijo.
 */
function requireInternal(req: Request) {
  const expected = process.env.INTERNAL_TOKEN ?? '';
  const got = req.header('x-internal-token') ?? '';
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new UnauthorizedError('Token interno inválido');
  }
}

@Controller('/incidents')
export class IncidentsController {
  constructor(@Inject(IncidentsService) private readonly svc: IncidentsService) {}

  @Get() list(
    @Req() req: Request,
    @Query('status') status?: IncidentStatus,
    @Query('urgency') urgency?: IncidentUrgency,
    @Query('assigneeId') assigneeId?: string,
    @Query('tripId') tripId?: string,
    @Query('breached') breached?: string,
  ) {
    return this.svc.list(ctx(req), {
      status,
      urgency,
      assigneeId,
      tripId,
      breached: breached === undefined ? undefined : breached === 'true',
    });
  }
  @Get('mine') mine(@Req() req: Request) { return this.svc.mine(ctx(req)); }
  @Get('summary') summary(@Req() req: Request) { return this.svc.summary(ctx(req)); }

  @Post() report(@Req() req: Request, @Body() body: CreateIncidentDto) { return this.svc.report(ctx(req), body); }
  @Post('manual') manual(@Req() req: Request, @Body() body: ManualIncidentInput) {
    return this.svc.createManual(ctx(req), body);
  }
  @Post('sos') sos(@Req() req: Request, @Body() body: SosDto) { return this.svc.sos(ctx(req), body); }

  @Post('escalations/run') @HttpCode(200) run(@Req() req: Request) {
    requireInternal(req);
    return this.svc.runEscalations();
  }
  @Post('signals') @HttpCode(202) signal(
    @Req() req: Request, @Body() body: { companyId: string; signal: OperationalSignalDto },
  ) {
    requireInternal(req);
    return this.svc.ingestSignal(body.companyId, body.signal);
  }

  @Get(':id') get(@Req() req: Request, @Param('id') id: string) { return this.svc.get(ctx(req), id); }
  @Patch(':id/assign') assign(@Req() req: Request, @Param('id') id: string, @Body() body: { assigneeId: string | null }) {
    return this.svc.assign(ctx(req), id, body.assigneeId ?? null);
  }
  @Post(':id/ack') @HttpCode(200) ack(@Req() req: Request, @Param('id') id: string) {
    return this.svc.acknowledge(ctx(req), id);
  }
  @Post(':id/start') @HttpCode(200) start(@Req() req: Request, @Param('id') id: string) {
    return this.svc.start(ctx(req), id);
  }
  @Post(':id/resolve') @HttpCode(200) resolve(@Req() req: Request, @Param('id') id: string, @Body() body: { note: string }) {
    return this.svc.resolve(ctx(req), id, body.note);
  }
  @Post(':id/close') @HttpCode(200) close(@Req() req: Request, @Param('id') id: string) {
    return this.svc.close(ctx(req), id);
  }
  @Post(':id/reopen') @HttpCode(200) reopen(@Req() req: Request, @Param('id') id: string) {
    return this.svc.reopen(ctx(req), id);
  }
  @Post(':id/comments') comment(@Req() req: Request, @Param('id') id: string, @Body() body: { body: string }) {
    return this.svc.addComment(ctx(req), id, body.body);
  }
  @Post(':id/evidences') @HttpCode(200) evidence(
    @Req() req: Request, @Param('id') id: string, @Body() body: { evidenceId: string },
  ) {
    return this.svc.attachEvidence(ctx(req), id, body.evidenceId);
  }
}

@Controller('/alert-rules')
export class AlertRulesController {
  constructor(@Inject(IncidentsService) private readonly svc: IncidentsService) {}
  @Get() list(@Req() req: Request) { return this.svc.listRules(ctx(req)); }
  @Post() create(@Req() req: Request, @Body() body: AlertRuleInput) { return this.svc.createRule(ctx(req), body); }
  @Patch(':id') update(@Req() req: Request, @Param('id') id: string, @Body() body: Partial<AlertRuleInput>) {
    return this.svc.updateRule(ctx(req), id, body);
  }
  @Delete(':id') @HttpCode(204) async remove(@Req() req: Request, @Param('id') id: string) {
    await this.svc.deleteRule(ctx(req), id);
  }
}

@Controller('/notification-contacts')
export class NotificationContactsController {
  constructor(@Inject(IncidentsService) private readonly svc: IncidentsService) {}
  @Put('me') me(@Req() req: Request, @Body() body: { pushToken?: string | null; whatsapp?: string | null }) {
    return this.svc.upsertMyContact(ctx(req), body);
  }
}
