import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trailer } from './trailer.entity';
import { TrailersService } from './trailers.service';
import { TrailersController } from './trailers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Trailer])],
  providers: [TrailersService],
  controllers: [TrailersController],
  exports: [TrailersService],
})
export class TrailersModule {}
