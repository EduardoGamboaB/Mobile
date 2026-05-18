import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() rfc?: string | null;
  @ApiProperty({ required: false }) @IsOptional() @IsString() city?: string | null;
}

export class UpdateCompanyDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() rfc?: string | null;
  @ApiProperty({ required: false }) @IsOptional() @IsString() city?: string | null;
}
