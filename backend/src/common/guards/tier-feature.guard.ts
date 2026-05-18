import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  REQUIRE_FEATURE_KEY,
} from '../decorators/require-feature.decorator';
import {
  FEATURES_BY_TIER,
  minTierFor,
  TIER_LABEL,
  type FeatureValue,
  type TierValue,
} from '../../shared/tiers';
import { JwtPayload } from '../decorators/current-user.decorator';

/**
 * Bloquea endpoints anotados con `@RequireFeature(...)` cuando la
 * suscripción de la compañía no incluye la feature requerida.
 *
 * Responde 402 Payment Required con un payload accionable para que
 * tanto el admin web como la app móvil puedan abrir el flujo de
 * upgrade sin lógica adicional.
 */
@Injectable()
export class TierFeatureGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<FeatureValue[]>(
      REQUIRE_FEATURE_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest();
    const user = req.user as JwtPayload | undefined;
    if (!user) {
      // Sin JWT (debió fallar JwtAuthGuard antes); por seguridad bloqueamos.
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const tier: TierValue = user.tier;
    const enabled = FEATURES_BY_TIER[tier];
    const missing = required.filter((f) => !enabled.includes(f));
    if (missing.length === 0) return true;

    const upgrades = missing.map((f) => ({
      feature: f,
      requiredTier: minTierFor(f),
      requiredTierLabel: TIER_LABEL[minTierFor(f)],
    }));

    throw new HttpException(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        error: 'Upgrade required',
        message:
          'Tu plan actual no incluye esta funcionalidad. Mejora tu suscripción para continuar.',
        currentTier: tier,
        currentTierLabel: TIER_LABEL[tier],
        missingFeatures: missing,
        suggestedUpgrade: upgrades[0]?.requiredTier,
        details: upgrades,
        upgradeUrl: '/subscriptions/checkout',
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
