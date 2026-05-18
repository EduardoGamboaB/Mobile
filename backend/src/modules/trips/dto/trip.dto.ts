import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID,
} from 'class-validator';

export class CreateTripDto {
  @ApiProperty() @IsString() client!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() cargo?: string;
  @ApiProperty() @IsString() origin!: string;
  @ApiProperty() @IsString() destination!: string;
  @ApiProperty() @IsUUID() driverId!: string;
  @ApiProperty() @IsUUID() tractorId!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsUUID() trailerId?: string;
  @ApiProperty() @IsDateString() loadDate!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() etaUnload?: string;
  @ApiProperty() @IsNumber() tons!: number;
  @ApiProperty() @IsNumber() pricePerTon!: number;
}

export class UpdateTripStatusDto {
  @ApiProperty({ enum: ['scheduled', 'loading', 'in_transit', 'unloading', 'finished', 'cancelled'] })
  @IsEnum(['scheduled', 'loading', 'in_transit', 'unloading', 'finished', 'cancelled'])
  status!: 'scheduled' | 'loading' | 'in_transit' | 'unloading' | 'finished' | 'cancelled';
}
