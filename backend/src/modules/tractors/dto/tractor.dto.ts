import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateTractorDto {
  @ApiProperty() @IsString() number!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() brand?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() model?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() year?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() plates?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() vin?: string;
  @ApiProperty({ required: false, enum: ['diesel', 'electrico', 'hibrido'] })
  @IsOptional() @IsEnum(['diesel', 'electrico', 'hibrido']) fuel?: 'diesel' | 'electrico' | 'hibrido';
  @ApiProperty({ required: false }) @IsOptional() @IsInt() horsepower?: number;
  @ApiProperty({ required: false, enum: ['active', 'maintenance', 'parked'] })
  @IsOptional() @IsEnum(['active', 'maintenance', 'parked']) status?: 'active' | 'maintenance' | 'parked';
  @ApiProperty({ required: false }) @IsOptional() @IsInt() mileageKm?: number;
}

export class UpdateTractorDto extends CreateTractorDto {}
