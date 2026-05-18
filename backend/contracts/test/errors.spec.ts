import { UpgradeRequiredError, TierLimitExceededError } from '../src/errors';
import { Feature } from '../src/tiers';

describe('UpgradeRequiredError (HTTP 402 payload)', () => {
  test('serializa al contrato que clientes esperan', () => {
    const e = new UpgradeRequiredError({
      currentTier: 'free',
      missingFeatures: [Feature.PaymentAuthorization],
      suggestedUpgrade: 'starter',
    });

    expect(e.status).toBe(402);
    expect(e.toJSON()).toEqual({
      statusCode: 402,
      error: 'Upgrade required',
      message: expect.stringContaining('plan'),
      currentTier: 'free',
      missingFeatures: ['payment_authorization'],
      suggestedUpgrade: 'starter',
      upgradeUrl: '/subscriptions/checkout',
    });
  });

  test('infiere suggestedUpgrade a partir de la feature faltante si no se pasa', () => {
    const e = new UpgradeRequiredError({
      currentTier: 'free',
      missingFeatures: [Feature.FleetMap],
    });
    expect(e.toJSON().suggestedUpgrade).toBe('pro');
  });
});

describe('TierLimitExceededError', () => {
  test('400 con mensaje accionable', () => {
    const e = new TierLimitExceededError({
      limit: 'tripsPerMonth',
      tier: 'free',
      limitValue: 20,
      currentValue: 21,
    });
    expect(e.status).toBe(400);
    expect(e.toJSON().message).toMatch(/20/);
    expect(e.toJSON().message).toMatch(/free/i);
  });
});
