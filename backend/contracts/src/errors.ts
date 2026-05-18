import {
  type TierValue,
  type FeatureValue,
  minTierFor,
} from './tiers';

export interface UpgradeRequiredPayload {
  currentTier: TierValue;
  missingFeatures: FeatureValue[];
  suggestedUpgrade?: TierValue;
  upgradeUrl?: string;
}

export class UpgradeRequiredError extends Error {
  readonly status = 402;
  readonly currentTier: TierValue;
  readonly missingFeatures: FeatureValue[];
  readonly suggestedUpgrade: TierValue;
  readonly upgradeUrl: string;

  constructor(p: UpgradeRequiredPayload) {
    super(
      `Tu plan actual (${p.currentTier}) no incluye esta funcionalidad. ` +
        `Necesitas actualizar a un plan superior para acceder.`,
    );
    this.name = 'UpgradeRequiredError';
    this.currentTier = p.currentTier;
    this.missingFeatures = p.missingFeatures;
    this.suggestedUpgrade = p.suggestedUpgrade ?? minTierFor(p.missingFeatures[0]);
    this.upgradeUrl = p.upgradeUrl ?? '/subscriptions/checkout';
  }

  toJSON() {
    return {
      statusCode: this.status,
      error: 'Upgrade required',
      message: this.message,
      currentTier: this.currentTier,
      missingFeatures: this.missingFeatures,
      suggestedUpgrade: this.suggestedUpgrade,
      upgradeUrl: this.upgradeUrl,
    };
  }
}

export interface TierLimitPayload {
  limit: 'units' | 'users' | 'tripsPerMonth';
  tier: TierValue;
  limitValue: number;
  currentValue: number;
}

export class TierLimitExceededError extends Error {
  readonly status = 400;
  readonly payload: TierLimitPayload;

  constructor(p: TierLimitPayload) {
    super(
      `Tu plan ${p.tier} permite hasta ${p.limitValue} ${p.limit}. ` +
        `Sube a un plan superior para aumentar el límite.`,
    );
    this.name = 'TierLimitExceededError';
    this.payload = p;
  }

  toJSON() {
    return {
      statusCode: this.status,
      error: 'Tier limit exceeded',
      message: this.message,
      ...this.payload,
    };
  }
}
