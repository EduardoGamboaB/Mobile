import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateDriverDto {
  @ApiProperty() @IsString() fullName!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() phone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail() email?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() federalLicense?: string;
  @ApiProperty({ required: false, example: '2027-05-12' })
  @IsOptional() @IsDateString() licenseExpiresAt?: string;
  @ApiProperty({ required: false, enum: ['active', 'inactive'], default: 'active' })
  @IsOptional() @IsEnum(['active', 'inactive']) status?: 'active' | 'inactive';
}

export class UpdateDriverDto extends CreateDriverDto {}
