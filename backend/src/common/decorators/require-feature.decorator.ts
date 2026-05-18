import { SetMetadata } from '@nestjs/common';
import type { FeatureValue } from '../../shared/tiers';

export const REQUIRE_FEATURE_KEY = 'g3:require_feature';

/**
 * Marca un endpoint como gated por una feature flag. El `TierFeatureGuard`
 * intercepta y, si la suscripción de la compañía no incluye la feature,
 * responde 402 PAYMENT REQUIRED con un payload accionable.
 *
 * Ejemplo:
 *   @RequireFeature(Feature.PaymentAuthorization)
 *   @Post(':id/release')
 *   release(...) { ... }
 */
export const RequireFeature = (...features: FeatureValue[]) =>
  SetMetadata(REQUIRE_FEATURE_KEY, features);
