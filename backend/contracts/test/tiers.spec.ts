import {
  Tier,
  Feature,
  TIER_PRICE_MXN,
  TIER_LIMITS,
  FEATURES_BY_TIER,
  tierHas,
  minTierFor,
  tierRank,
  isAtLeast,
} from '../src/tiers';

describe('tier catalog (TDD: catalog drives gating across all services)', () => {
  describe('shape', () => {
    test('hay exactamente 5 tiers en orden conocido', () => {
      expect(Object.values(Tier)).toEqual([
        'free',
        'starter',
        'pro',
        'business',
        'enterprise',
      ]);
    });

    test('cada tier tiene precio MXN (enterprise null = cotización)', () => {
      expect(TIER_PRICE_MXN.free).toBe(0);
      expect(TIER_PRICE_MXN.starter).toBe(349);
      expect(TIER_PRICE_MXN.pro).toBe(899);
      expect(TIER_PRICE_MXN.business).toBe(2499);
      expect(TIER_PRICE_MXN.enterprise).toBeNull();
    });

    test('cada tier tiene límites operativos', () => {
      expect(TIER_LIMITS.free).toEqual({ units: 1, users: 1, tripsPerMonth: 20 });
      expect(TIER_LIMITS.starter.units).toBe(3);
      expect(TIER_LIMITS.pro.units).toBe(5);
      expect(TIER_LIMITS.business.units).toBe(30);
      expect(TIER_LIMITS.enterprise.units).toBe(Number.POSITIVE_INFINITY);
    });
  });

  describe('feature inclusion (acumulativo por tier)', () => {
    test('free incluye operación básica', () => {
      expect(tierHas('free', Feature.Logbook)).toBe(true);
      expect(tierHas('free', Feature.TripsBasic)).toBe(true);
    });

    test('free no incluye features Pro+', () => {
      expect(tierHas('free', Feature.FleetMap)).toBe(false);
      expect(tierHas('free', Feature.AIAssistantChat)).toBe(false);
    });

    test('starter desbloquea PaymentAuthorization y OCR', () => {
      expect(tierHas('starter', Feature.PaymentAuthorization)).toBe(true);
      expect(tierHas('starter', Feature.EvidenceOcr)).toBe(true);
    });

    test('pro desbloquea FleetMap, AI agents y scoring', () => {
      expect(tierHas('pro', Feature.FleetMap)).toBe(true);
      expect(tierHas('pro', Feature.AIAssistantChat)).toBe(true);
      expect(tierHas('pro', Feature.DriverScoring)).toBe(true);
    });

    test('business desbloquea multi-user, ERP, API access', () => {
      expect(tierHas('business', Feature.MultiUser)).toBe(true);
      expect(tierHas('business', Feature.ApiAccess)).toBe(true);
      expect(tierHas('business', Feature.ErpIntegration)).toBe(true);
    });

    test('enterprise incluye todo', () => {
      const allFeatures = Object.values(Feature);
      for (const f of allFeatures) {
        expect(tierHas('enterprise', f)).toBe(true);
      }
    });

    test('FEATURES_BY_TIER es acumulativo: starter ⊇ free', () => {
      const free = FEATURES_BY_TIER.free;
      for (const f of free) expect(FEATURES_BY_TIER.starter).toContain(f);
    });

    test('FEATURES_BY_TIER es acumulativo: pro ⊇ starter', () => {
      const starter = FEATURES_BY_TIER.starter;
      for (const f of starter) expect(FEATURES_BY_TIER.pro).toContain(f);
    });
  });

  describe('minTierFor: descubre el tier mínimo que incluye una feature', () => {
    test('basicas devuelven free', () => {
      expect(minTierFor(Feature.Logbook)).toBe('free');
    });
    test('PaymentAuthorization mínimo starter', () => {
      expect(minTierFor(Feature.PaymentAuthorization)).toBe('starter');
    });
    test('FleetMap mínimo pro', () => {
      expect(minTierFor(Feature.FleetMap)).toBe('pro');
    });
    test('MultiUser mínimo business', () => {
      expect(minTierFor(Feature.MultiUser)).toBe('business');
    });
  });

  describe('tierRank / isAtLeast: comparaciones para gating', () => {
    test('tierRank ordena monotónicamente', () => {
      expect(tierRank('free')).toBeLessThan(tierRank('starter'));
      expect(tierRank('starter')).toBeLessThan(tierRank('pro'));
      expect(tierRank('pro')).toBeLessThan(tierRank('business'));
      expect(tierRank('business')).toBeLessThan(tierRank('enterprise'));
    });

    test('isAtLeast usa el rank', () => {
      expect(isAtLeast('pro', 'starter')).toBe(true);
      expect(isAtLeast('pro', 'pro')).toBe(true);
      expect(isAtLeast('starter', 'pro')).toBe(false);
    });
  });
});
