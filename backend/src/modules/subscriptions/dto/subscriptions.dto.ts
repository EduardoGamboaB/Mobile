import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsUrl, Min } from 'class-validator';
import { Tier, TierValue } from '../../../shared/tiers';

export class CreateCheckoutDto {
  @ApiProperty({ enum: Object.values(Tier) })
  @IsEnum(Tier)
  tier!: TierValue;

  @ApiProperty({ example: 3 })
  @IsInt() @Min(1)
  units!: number;

  @ApiProperty({ example: 'https://admin.g3logistics.mx/plans/success' })
  @IsUrl({ require_tld: false })
  successUrl!: string;

  @ApiProperty({ example: 'https://admin.g3logistics.mx/plans?canceled=1' })
  @IsUrl({ require_tld: false })
  cancelUrl!: string;
}

export class ChangePlanDto {
  @ApiProperty({ enum: Object.values(Tier) })
  @IsEnum(Tier)
  tier!: TierValue;

  @ApiProperty({ example: 3, required: false })
  @IsOptional() @IsInt() @Min(1)
  units?: number;
}
