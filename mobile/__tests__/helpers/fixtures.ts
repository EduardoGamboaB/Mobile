import type {
  AlertDTO,
  AuthSession,
  CompanyDTO,
  DriverDTO,
  SubscriptionDTO,
  TierCatalogEntry,
  TractorDTO,
  TrailerDTO,
  TripDTO,
} from '@/api/g3/types';
import { Tier } from '@/constants/tiers';

export const fixtures = {
  companyId: 'cmp_test_1',
  userId: 'usr_test_1',

  session(tier: AuthSession['user']['tier'] = Tier.Free): AuthSession {
    return {
      accessToken: `jwt.${tier}.access`,
      refreshToken: `jwt.${tier}.refresh`,
      user: {
        id: 'usr_test_1',
        email: 'owner@acme.mx',
        role: 'owner',
        companyId: 'cmp_test_1',
        tier,
      },
    };
  },

  subscription(tier: SubscriptionDTO['tier'] = Tier.Free): SubscriptionDTO {
    return {
      id: 'sub_test_1',
      tier,
      status: 'active',
      units: 1,
      priceMxn: tier === 'free' ? 0 : 349,
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
        features: ['basic_logbook', 'trips_management', 'evidence_upload', 'incident_report'],
      },
      {
        tier: Tier.Starter,
        priceMxn: 349,
        limits: { units: 3, users: 2, tripsPerMonth: 100 },
        features: [
          'basic_logbook',
          'trips_management',
          'evidence_upload',
          'incident_report',
          'ai_ocr_evidence',
          'earnings_dashboard',
          'whatsapp_integration',
        ],
      },
      {
        tier: Tier.Pro,
        priceMxn: 899,
        limits: { units: 5, users: 5, tripsPerMonth: 500 },
        features: [
          'basic_logbook',
          'trips_management',
          'evidence_upload',
          'incident_report',
          'ai_ocr_evidence',
          'earnings_dashboard',
          'whatsapp_integration',
          'ai_assistant_chat',
          'ai_inspection_analysis',
          'ai_logbook_classifier',
          'ai_incident_router',
          'driver_scoring',
        ],
      },
    ];
  },

  company(): CompanyDTO {
    return {
      id: 'cmp_test_1',
      name: 'Transportes Acme',
      rfc: 'TAC120101AAA',
      contactEmail: 'owner@acme.mx',
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
      clientName: 'Molinos del Bajío',
      cargo: 'Maíz amarillo',
      origin: 'CDMX',
      destination: 'Tampico',
      scheduledAt: '2026-05-19T08:00:00Z',
      estimatedUnloadAt: null,
      tons: 30,
      pricePerTon: null,
      freightAmount: 18500,
      driverCommission: 2500,
      estimatedTolls: null,
      estimatedDiesel: null,
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
