import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { json } from 'express';
import { StripeWebhookController } from './stripe.webhook.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [SubscriptionsModule],
  controllers: [StripeWebhookController],
})
export class WebhooksModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Stripe necesita el cuerpo crudo para verificar firma; usamos un
    // json parser específico que preserva el buffer en req.rawBody.
    consumer
      .apply(
        json({
          verify: (req: { rawBody?: Buffer }, _res, buf: Buffer) => {
            req.rawBody = Buffer.from(buf);
          },
        }),
      )
      .forRoutes({ path: 'webhooks/stripe', method: RequestMethod.POST });
  }
}
