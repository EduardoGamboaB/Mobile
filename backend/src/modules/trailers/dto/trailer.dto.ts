import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import type { TrailerType } from '../trailer.entity';

const TYPES = ['jaula_42', 'caja_53', 'caja_48', 'refrigerado', 'tolva', 'tanque', 'plataforma', 'lowboy'] as const;

export class CreateTrailerDto {
  @ApiProperty() @IsString() number!: string;
  @ApiProperty({ enum: TYPES }) @IsEnum(TYPES) type!: TrailerType;
  @ApiProperty({ required: false }) @IsOptional() @IsString() plates?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() vin?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() capacityTons?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() tempRange?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsUUID() attachedTractorId?: string;
}

export class UpdateTrailerDto extends CreateTrailerDto {}
