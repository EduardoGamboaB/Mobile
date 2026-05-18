import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { InMemorySubscriptionRepo } from './repos/in-memory.subscription.repo';
import { FakeStripeProvider } from './billing/fake.stripe.provider';
import { RecordingEventBus } from './event.bus';

@Module({
  controllers: [BillingController],
  providers: [
    {
      provide: BillingService,
      useFactory: () =>
        new BillingService(
          new InMemorySubscriptionRepo(),
          new FakeStripeProvider(),
          new RecordingEventBus(),
        ),
    },
  ],
})
class BillingAppModule {}

async function bootstrap() {
  const app = await NestFactory.create(BillingAppModule, { cors: false });
  app.setGlobalPrefix('api');
  const port = Number(process.env.PORT ?? '8082');
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`[billing-service] up on :${port}`);
}

if (require.main === module) {
  bootstrap();
}
