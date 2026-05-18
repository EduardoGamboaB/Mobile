import { Body, Controller, Get, Post, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreateCheckoutDto, ChangePlanDto } from './dto/subscriptions.dto';
import {
  CurrentCompany,
  CurrentUser,
  JwtPayload,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  FEATURES_BY_TIER,
  TIER_LABEL,
  TIER_PRICE_MXN,
  TIER_LIMITS,
} from '../../shared/tiers';

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subs: SubscriptionsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Suscripción activa de la compañía' })
  async me(@CurrentCompany() companyId: string) {
    const sub = await this.subs.getActiveByCompany(companyId);
    return {
      ...sub,
      label: TIER_LABEL[sub.tier],
      features: FEATURES_BY_TIER[sub.tier],
      limits: TIER_LIMITS[sub.tier],
      pricePerUnitMxn: TIER_PRICE_MXN[sub.tier],
    };
  }

  @Get('catalog')
  @ApiOperation({ summary: 'Catálogo de tiers — para mostrar en planes' })
  catalog() {
    return Object.entries(TIER_LABEL).map(([tier, label]) => ({
      tier,
      label,
      pricePerUnitMxn: TIER_PRICE_MXN[tier as keyof typeof TIER_LABEL],
      features: FEATURES_BY_TIER[tier as keyof typeof TIER_LABEL],
      limits: TIER_LIMITS[tier as keyof typeof TIER_LABEL],
    }));
  }

  @Roles('owner', 'admin')
  @Post('checkout')
  @ApiOperation({ summary: 'Inicia checkout de Stripe para upgrade/compra' })
  checkout(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.subs.createCheckout({
      companyId,
      userEmail: (user as JwtPayload & { email?: string }).email ?? `${user.sub}@g3.local`,
      tier: dto.tier,
      units: dto.units,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
    });
  }

  @Roles('owner', 'admin')
  @HttpCode(202)
  @Post('cancel')
  @ApiOperation({ summary: 'Cancelar al final del periodo (no inmediato)' })
  cancel(@CurrentCompany() companyId: string) {
    return this.subs.cancelAtPeriodEnd(companyId);
  }

  /**
   * Cambio manual (downgrade administrativo). Producción usa el flujo
   * Stripe pero esto sirve para soporte interno.
   */
  @Roles('owner', 'admin')
  @Post('change-plan')
  changePlan(
    @CurrentCompany() companyId: string,
    @Body() dto: ChangePlanDto,
  ) {
    return this.subs.applyTier({
      companyId,
      tier: dto.tier,
      units: dto.units ?? 1,
    });
  }
}
