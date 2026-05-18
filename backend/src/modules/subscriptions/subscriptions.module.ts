import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from './subscription.entity';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { StripeBillingProvider } from './billing/stripe.provider';
import { CompaniesModule } from '../companies/companies.module';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription]),
    forwardRef(() => CompaniesModule),
    forwardRef(() => UsersModule),
    EventsModule,
  ],
  providers: [SubscriptionsService, StripeBillingProvider],
  controllers: [SubscriptionsController],
  exports: [SubscriptionsService, StripeBillingProvider],
})
export class SubscriptionsModule {}
