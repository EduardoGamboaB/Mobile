import { UnauthorizedException } from '@nestjs/common';
import { BillingController, assertInternal } from '../src/billing.controller';

const req = (token?: string) => ({ header: (n: string) => (n === 'x-internal-token' ? token : undefined) }) as never;

describe('endpoints internos de billing (apply-tier / start-trial)', () => {
  test('assertInternal exige el token interno en tiempo constante', () => {
    expect(() => assertInternal(req('secreto-interno-32-caracteres-xx'), 'secreto-interno-32-caracteres-xx')).not.toThrow();
    expect(() => assertInternal(req('otro'), 'secreto-interno-32-caracteres-xx')).toThrow(UnauthorizedException);
    expect(() => assertInternal(req(undefined), 'x')).toThrow(UnauthorizedException);
    // Sin INTERNAL_TOKEN configurado nadie pasa (falla cerrado).
    expect(() => assertInternal(req(''), undefined)).toThrow(UnauthorizedException);
  });

  test('un usuario autenticado sin token interno no puede subirse de plan', async () => {
    const svc = { applyTier: jest.fn(), applyStripeEvent: jest.fn(), startTrial: jest.fn() };
    const ctl = new BillingController(svc as never);
    const prev = process.env.INTERNAL_TOKEN;
    process.env.INTERNAL_TOKEN = 'secreto-interno-32-caracteres-xx';
    try {
      await expect(
        ctl.applyTier(req(undefined), { companyId: 'cmp_x', tier: 'enterprise', stripeSubscriptionId: null, currentPeriodEnd: null }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(() => ctl.startTrial(req('mal'), { companyId: 'cmp_x' })).toThrow(UnauthorizedException);
      expect(svc.applyTier).not.toHaveBeenCalled();
      expect(svc.startTrial).not.toHaveBeenCalled();
    } finally {
      process.env.INTERNAL_TOKEN = prev;
    }
  });
});
