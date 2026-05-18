import { FleetService } from '../src/fleet.service';
import { InMemoryTractorRepo, InMemoryTrailerRepo } from '../src/in-memory.repos';
import { TierLimitExceededError, UpgradeRequiredError } from '@g3/contracts';

const ctx = (tier: 'free' | 'starter' | 'pro' | 'business' | 'enterprise' = 'free') => ({
  companyId: 'cmp_1',
  tier,
});

function build() {
  const tractors = new InMemoryTractorRepo();
  const trailers = new InMemoryTrailerRepo();
  const svc = new FleetService(tractors, trailers);
  return { svc, tractors, trailers };
}

describe('FleetService.tractors', () => {
  test('create con free permite 1 unidad, rechaza la 2da', async () => {
    const { svc } = build();
    await svc.createTractor(ctx(), { unitNumber: 'T-1', plates: 'A' });
    await expect(svc.createTractor(ctx(), { unitNumber: 'T-2', plates: 'B' })).rejects.toBeInstanceOf(
      TierLimitExceededError,
    );
  });

  test('starter permite 3 unidades (suma tractos + trailers)', async () => {
    const { svc } = build();
    await svc.createTractor(ctx('starter'), { unitNumber: 'T-1', plates: 'A' });
    await svc.createTractor(ctx('starter'), { unitNumber: 'T-2', plates: 'B' });
    await svc.createTrailer(ctx('starter'), { unitNumber: 'R-1', plates: 'C', type: 'caja_53' });
    await expect(svc.createTrailer(ctx('starter'), { unitNumber: 'R-2', plates: 'D', type: 'caja_53' }))
      .rejects.toBeInstanceOf(TierLimitExceededError);
  });

  test('list filtra por companyId', async () => {
    const { svc, tractors } = build();
    await tractors.create({
      id: 't_ext', companyId: 'cmp_OTRA', unitNumber: 'X', plates: 'Y',
      brand: null, model: null, year: null, status: 'available',
      lastLat: null, lastLng: null, lastSeenAt: null,
    });
    await svc.createTractor(ctx('starter'), { unitNumber: 'T-1', plates: 'A' });
    const list = await svc.listTractors(ctx('starter'));
    expect(list).toHaveLength(1);
    expect(list[0].unitNumber).toBe('T-1');
  });
});

describe('FleetService.livePositions (gated por FleetMap)', () => {
  test('Free → 402 UpgradeRequiredError', async () => {
    const { svc } = build();
    await expect(svc.livePositions(ctx('free'))).rejects.toBeInstanceOf(UpgradeRequiredError);
  });

  test('Starter → 402 (no incluye FleetMap)', async () => {
    const { svc } = build();
    await expect(svc.livePositions(ctx('starter'))).rejects.toMatchObject({ status: 402 });
  });

  test('Pro → ok, devuelve sólo tractos visibles del companyId', async () => {
    const { svc, tractors } = build();
    await tractors.create({
      id: 't_pro', companyId: 'cmp_1', unitNumber: 'T-100', plates: 'P',
      brand: null, model: null, year: null, status: 'in_trip',
      lastLat: 19.4, lastLng: -99.1, lastSeenAt: '2026-05-18T08:00:00Z',
    });
    await tractors.create({
      id: 't_no_loc', companyId: 'cmp_1', unitNumber: 'T-101', plates: 'Q',
      brand: null, model: null, year: null, status: 'available',
      lastLat: null, lastLng: null, lastSeenAt: null,
    });

    const live = await svc.livePositions(ctx('pro'));
    expect(live).toHaveLength(1);
    expect(live[0].unitNumber).toBe('T-100');
  });
});

describe('FleetService.trailers', () => {
  test('crear remolque tipo refrigerado', async () => {
    const { svc } = build();
    const r = await svc.createTrailer(ctx('pro'), {
      unitNumber: 'R-100', plates: 'XYZ', type: 'refrigerado', capacityTons: 28,
    });
    expect(r.type).toBe('refrigerado');
    expect(r.capacityTons).toBe(28);
  });
});
