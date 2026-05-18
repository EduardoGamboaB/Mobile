import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tractor } from './tractor.entity';
import { TractorsService } from './tractors.service';
import { TractorsController } from './tractors.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tractor]), SubscriptionsModule],
  providers: [TractorsService],
  controllers: [TractorsController],
  exports: [TractorsService],
})
export class TractorsModule {}
