import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'despacho@g3logistics.mx' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'demo1234' })
  @IsString()
  @MinLength(6)
  password!: string;
}

export class RegisterCompanyDto {
  @ApiProperty({ example: 'G3 Logistics' })
  @IsString()
  companyName!: string;

  @ApiProperty({ example: 'GLO250101AB1', required: false })
  @IsOptional()
  @IsString()
  rfc?: string;

  @ApiProperty({ example: 'Eduardo Gamboa' })
  @IsString()
  ownerName!: string;

  @ApiProperty({ example: 'eduardo@g3logistics.mx' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'demo1234' })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}
