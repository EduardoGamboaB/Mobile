import { Body, Controller, Get, HttpCode, Inject, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { TierValue } from '@g3/contracts';
import { BillingService } from './billing.service';

function companyId(req: Request): string {
  const id = req.header('x-company-id');
  if (!id) throw new Error('x-company-id requerido (gateway lo inyecta tras validar JWT)');
  return id;
}

@Controller('/subscriptions')
export class BillingController {
  constructor(@Inject(BillingService) private readonly svc: BillingService) {}

  @Get('me')
  me(@Req() req: Request) {
    return this.svc.getMine(companyId(req));
  }

  @Get('catalog')
  catalog() {
    return this.svc.catalog();
  }

  @Post('checkout')
  @HttpCode(200)
  checkout(
    @Req() req: Request,
    @Body() body: { tier: TierValue; units: number; successUrl: string; cancelUrl: string },
  ) {
    return this.svc.createCheckout(companyId(req), body);
  }

  @Post('cancel')
  @HttpCode(200)
  cancel(@Req() req: Request) {
    return this.svc.cancel(companyId(req));
  }

  // endpoint interno llamado por webhook handler (gateway). Con `eventId`
  // (event.id de Stripe) es idempotente: un reintento no repite efectos.
  @Post('apply-tier')
  @HttpCode(200)
  async applyTier(
    @Body()
    body: {
      companyId: string;
      tier: TierValue;
      stripeSubscriptionId: string | null;
      currentPeriodEnd: string | null;
      eventId?: string;
      eventType?: string;
    },
  ) {
    const meta = { stripeSubscriptionId: body.stripeSubscriptionId, currentPeriodEnd: body.currentPeriodEnd };
    if (body.eventId) {
      const r = await this.svc.applyStripeEvent({
        ...meta,
        eventId: body.eventId,
        eventType: body.eventType ?? 'unknown',
        companyId: body.companyId,
        tier: body.tier,
      });
      return r.subscription;
    }
    return this.svc.applyTier(body.companyId, body.tier, meta);
  }

  // endpoint interno llamado desde auth-service tras registerCompany
  @Post('start-trial')
  @HttpCode(200)
  startTrial(@Body() body: { companyId: string }) {
    return this.svc.startTrial(body.companyId);
  }
}
