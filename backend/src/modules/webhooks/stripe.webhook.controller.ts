import {
  Controller,
  Post,
  Req,
  Headers,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { StripeBillingProvider } from '../subscriptions/billing/stripe.provider';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import type { TierValue } from '../../shared/tiers';

/**
 * Endpoint que Stripe llama tras eventos de billing. Mantiene la BD
 * en sincronía con la suscripción real del cliente.
 *
 * Configuración de Stripe Dashboard:
 *   URL:  https://api.g3logistics.mx/api/webhooks/stripe
 *   Eventos: checkout.session.completed,
 *           customer.subscription.created,
 *           customer.subscription.updated,
 *           customer.subscription.deleted,
 *           invoice.payment_failed
 */
@ApiExcludeController()
@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger('StripeWebhook');

  constructor(
    private readonly cfg: ConfigService,
    private readonly stripe: StripeBillingProvider,
    private readonly subs: SubscriptionsService,
  ) {}

  @Public()
  @Post()
  async handle(@Req() req: Request, @Headers('stripe-signature') sig: string) {
    const whSecret = this.cfg.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!whSecret) throw new BadRequestException('Webhook secret no configurado');

    const client = this.stripe.webhookClient();
    let event;
    try {
      // En el bootstrap montamos un middleware raw-body sólo para esta ruta;
      // Express lo expone como req.rawBody. Si no está, fallamos limpio.
      const body = (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from('');
      event = client.webhooks.constructEvent(body, sig, whSecret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'firma inválida';
      this.logger.warn(`Webhook signature error: ${msg}`);
      throw new BadRequestException(`Webhook error: ${msg}`);
    }

    this.logger.log(`recibido ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const obj = event.data.object as {
          id?: string;
          metadata?: { tier?: string; companyId?: string };
          items?: { data?: { price?: { id?: string }; quantity?: number }[] };
          current_period_end?: number;
          cancel_at_period_end?: boolean;
          customer?: string | { id?: string };
        };
        // Para checkout.session.completed los datos vienen ligeramente distinto.
        const tier = obj.metadata?.tier as TierValue | undefined;
        const companyId = obj.metadata?.companyId;
        const stripeSubId = obj.id ?? null;
        const item = obj.items?.data?.[0];
        const units = item?.quantity ?? 1;
        const priceId = item?.price?.id ?? null;
        const periodEnd = obj.current_period_end ? new Date(obj.current_period_end * 1000) : null;
        if (companyId && tier) {
          await this.subs.applyTier({
            companyId,
            tier,
            units,
            stripeSubscriptionId: stripeSubId,
            stripePriceId: priceId,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: obj.cancel_at_period_end ?? false,
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const obj = event.data.object as { metadata?: { companyId?: string } };
        const companyId = obj.metadata?.companyId;
        if (companyId) {
          await this.subs.applyTier({
            companyId,
            tier: 'free',
            units: 1,
            stripeSubscriptionId: null,
          });
        }
        break;
      }
      case 'invoice.payment_failed':
        this.logger.warn('Pago fallido — pendiente cobranza');
        break;
      default:
        this.logger.debug(`Evento no manejado: ${event.type}`);
    }

    return { received: true };
  }
}
