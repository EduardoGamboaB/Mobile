import type {
  AlertDTO,
  AuthSession,
  ExpensePolicyDTO,
  LogbookEntryDTO,
  ProfitabilityReportDTO,
  TripProfitabilityDTO,
  CompanyDTO,
  DriverDTO,
  SubscriptionDTO,
  TierCatalogEntry,
  TractorDTO,
  TrailerDTO,
  TripDTO,
} from '../../lib/api/types';
import { Tier } from '../../lib/tiers';

export const fixtures = {
  companyId: 'cmp_test_1',
  userId: 'usr_test_1',

  session(tier: AuthSession['user']['tier'] = Tier.Pro): AuthSession {
    return {
      accessToken: `jwt.${tier}.access`,
      refreshToken: `jwt.${tier}.refresh`,
      user: {
        id: 'usr_test_1',
        email: 'admin@acme.mx',
        role: 'admin',
        companyId: 'cmp_test_1',
        tier,
      },
    };
  },

  subscription(tier: SubscriptionDTO['tier'] = Tier.Pro): SubscriptionDTO {
    return {
      id: 'sub_test_1',
      tier,
      status: 'active',
      units: tier === 'free' ? 1 : 3,
      priceMxn: tier === 'free' ? 0 : tier === 'starter' ? 349 : 899,
      stripeSubscriptionId: tier === 'free' ? null : 'sub_stripe_1',
      currentPeriodEnd: '2026-06-18T00:00:00Z',
      cancelAtPeriodEnd: false,
    };
  },

  catalog(): TierCatalogEntry[] {
    return [
      {
        tier: Tier.Free,
        priceMxn: 0,
        limits: { units: 1, users: 1, tripsPerMonth: 20 },
        features: ['trips_management', 'driver_management'],
      },
      {
        tier: Tier.Starter,
        priceMxn: 349,
        limits: { units: 3, users: 2, tripsPerMonth: 100 },
        features: [
          'trips_management',
          'driver_management',
          'evidence_validation',
          'payment_authorization',
        ],
      },
      {
        tier: Tier.Pro,
        priceMxn: 899,
        limits: { units: 5, users: 5, tripsPerMonth: 500 },
        features: [
          'trips_management',
          'driver_management',
          'evidence_validation',
          'payment_authorization',
          'fleet_map',
          'scoring',
          'ai_insights',
        ],
      },
    ];
  },

  company(): CompanyDTO {
    return {
      id: 'cmp_test_1',
      name: 'Transportes Acme',
      rfc: 'TAC120101AAA',
      contactEmail: 'admin@acme.mx',
      contactPhone: '+525555555555',
      createdAt: '2026-01-01T00:00:00Z',
    };
  },

  driver(over: Partial<DriverDTO> = {}): DriverDTO {
    return {
      id: 'drv_test_1',
      companyId: 'cmp_test_1',
      fullName: 'Pedro Pérez',
      phone: '+525555550001',
      email: 'pedro@acme.mx',
      federalLicense: 'A-12345',
      licenseExpiresAt: '2027-12-31',
      status: 'active',
      createdAt: '2026-01-01T00:00:00Z',
      ...over,
    };
  },

  tractor(over: Partial<TractorDTO> = {}): TractorDTO {
    return {
      id: 'trc_test_1',
      companyId: 'cmp_test_1',
      unitNumber: 'T-001',
      plates: 'XXX-12-34',
      brand: 'Kenworth',
      model: 'T680',
      year: 2022,
      status: 'available',
      lastLat: 19.4326,
      lastLng: -99.1332,
      lastSeenAt: '2026-05-18T08:00:00Z',
      ...over,
    };
  },

  trailer(over: Partial<TrailerDTO> = {}): TrailerDTO {
    return {
      id: 'trl_test_1',
      companyId: 'cmp_test_1',
      unitNumber: 'R-001',
      plates: 'YYY-12-34',
      type: 'caja_53',
      capacityTons: 30,
      status: 'available',
      ...over,
    };
  },

  trip(over: Partial<TripDTO> = {}): TripDTO {
    return {
      id: 'trp_test_1',
      companyId: 'cmp_test_1',
      folio: 'G3-2026-00001',
      status: 'scheduled',
      driverId: 'drv_test_1',
      tractorId: 'trc_test_1',
      trailerId: 'trl_test_1',
      clientName: 'Cementos Mexicanos',
      cargo: 'Cemento',
      origin: 'CDMX',
      destination: 'Tampico',
      scheduledAt: '2026-05-19T08:00:00Z',
      estimatedUnloadAt: null,
      tons: 20,
      pricePerTon: 925,
      freightAmount: 18500,
      driverCommission: 2000,
      estimatedTolls: 900,
      estimatedDiesel: 4000,
      notes: null,
      startedAt: null,
      preClosedAt: null,
      closedAt: null,
      cancelledAt: null,
      paymentStatus: 'pending',
      paymentReleasedAt: null,
      createdAt: '2026-05-18T08:00:00Z',
      updatedAt: '2026-05-18T08:00:00Z',
      ...over,
    };
  },

  logbookEntry(over: Partial<LogbookEntryDTO> = {}): LogbookEntryDTO {
    return {
      id: 'lb_test_1',
      companyId: 'cmp_test_1',
      clientUuid: 'cu_test_1',
      tripId: 'trp_test_1',
      driverId: 'drv_test_1',
      eventType: 'toll',
      occurredAt: '2026-05-19T10:00:00Z',
      locationText: 'Caseta',
      lat: null,
      lng: null,
      odometerKm: null,
      fuel: null,
      expenseAmount: 300,
      expenseConcept: 'Caseta',
      expenseHasReceipt: true,
      comments: null,
      createdAt: '2026-05-19T10:00:00Z',
      ...over,
    };
  },

  expensePolicy(over: Partial<ExpensePolicyDTO> = {}): ExpensePolicyDTO {
    return {
      companyId: 'cmp_test_1',
      allowManualExpense: true,
      manualMaxAmount: 300,
      requireReceipt: false,
      updatedAt: '2026-05-18T08:00:00Z',
      ...over,
    };
  },

  tripProfitability(over: Partial<TripProfitabilityDTO> = {}): TripProfitabilityDTO {
    return {
      tripId: 'trp_test_1',
      folio: 'G3-2026-00001',
      status: 'closed',
      paymentStatus: 'pending',
      driverId: 'drv_test_1',
      tractorId: 'trc_test_1',
      clientName: 'Cementos Mexicanos',
      origin: 'CDMX',
      destination: 'Tampico',
      tripDate: '2026-05-19T08:00:00Z',
      revenue: 18500,
      revenueSource: 'freight',
      tolls: { estimated: 900, actual: 1200, variance: 300, variancePct: 33.3, deviated: true },
      diesel: { estimated: 4000, actual: 3900, variance: -100, variancePct: -2.5, deviated: false },
      otherExpenses: 0,
      driverCommission: 2000,
      totalCost: 7100,
      profit: 11400,
      marginPct: 61.6,
      marginBand: 'healthy',
      expensesWithoutReceipt: 400,
      expensesWithoutReceiptCount: 1,
      expenseEntries: 3,
      deviations: ['tolls'],
      dataIssues: [],
      ...over,
    };
  },

  profitabilityReport(rows: TripProfitabilityDTO[] = []): ProfitabilityReportDTO {
    return {
      filters: {},
      totals: {
        trips: rows.length,
        tripsComputed: rows.length,
        tripsWithIssues: 0,
        tripsDeviated: rows.filter((r) => r.deviations.length > 0).length,
        revenue: rows.reduce((s, r) => s + (r.revenue ?? 0), 0),
        tolls: 0,
        diesel: 0,
        otherExpenses: 0,
        driverCommission: 0,
        estimatedTolls: 0,
        estimatedDiesel: 0,
        operatingExpenses: 0,
        profit: rows.reduce((s, r) => s + (r.profit ?? 0), 0),
        marginPct: null,
        marginBand: 'unknown',
        expensesWithoutReceipt: 0,
        expensesWithoutReceiptCount: 0,
      },
      rows,
      generatedAt: '2026-05-20T00:00:00Z',
    };
  },

  alert(over: Partial<AlertDTO> = {}): AlertDTO {
    return {
      id: 'alt_test_1',
      companyId: 'cmp_test_1',
      level: 'warning',
      type: 'license_expiring',
      message: 'Licencia federal vence en 30 días',
      resolved: false,
      createdAt: '2026-05-18T08:00:00Z',
      ...over,
    };
  },

  upgradeRequired(missingFeature: string, suggested = 'pro') {
    return {
      statusCode: 402,
      error: 'Upgrade required',
      message: 'Tu plan actual no incluye esta funcionalidad',
      currentTier: 'free',
      missingFeatures: [missingFeature],
      suggestedUpgrade: suggested,
      upgradeUrl: '/subscriptions/checkout',
    };
  },
};
