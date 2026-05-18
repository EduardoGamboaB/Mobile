import { tractorsApi } from '@/api/g3/tractors';
import { tokenStore } from '@/api/g3/client';
import { G3ApiError } from '@/api/g3/types';
import { fixtures } from '../helpers/fixtures';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';

describe('tractorsApi', () => {
  let teardown: () => void;
  beforeEach(() => tokenStore.setInMemory({ accessToken: 'tok', refreshToken: 'rfr' }));
  afterEach(() => teardown?.());

  test('list devuelve los tractos de la compañía', async () => {
    const m = makeFetchMock().on('GET /api/tractors', { status: 200, body: [fixtures.tractor()] });
    teardown = installGlobalFetchMock(m);

    const r = await tractorsApi.list();
    expect(r[0].unitNumber).toBe('T-001');
  });

  test('create envía datos del tracto', async () => {
    const m = makeFetchMock().on('POST /api/tractors', {
      status: 201,
      body: fixtures.tractor({ unitNumber: 'T-002', plates: 'AAA-12-34' }),
    });
    teardown = installGlobalFetchMock(m);

    const r = await tractorsApi.create({ unitNumber: 'T-002', plates: 'AAA-12-34' });
    expect(r.unitNumber).toBe('T-002');
  });

  test('livePositions con tier Pro+ devuelve posiciones', async () => {
    const m = makeFetchMock().on('GET /api/tractors/live/positions', {
      status: 200,
      body: [
        {
          tractorId: 'trc_test_1',
          unitNumber: 'T-001',
          lat: 19.4326,
          lng: -99.1332,
          speedKph: 78,
          headingDeg: 90,
          lastSeenAt: '2026-05-18T08:00:00Z',
        },
      ],
    });
    teardown = installGlobalFetchMock(m);

    const r = await tractorsApi.livePositions();
    expect(r[0].speedKph).toBe(78);
  });

  test('livePositions con tier Free devuelve 402 con suggestedUpgrade=pro', async () => {
    const m = makeFetchMock().on('GET /api/tractors/live/positions', {
      status: 402,
      body: fixtures.upgradeRequired('fleet_map', 'pro'),
    });
    teardown = installGlobalFetchMock(m);

    await expect(tractorsApi.livePositions()).rejects.toMatchObject({
      status: 402,
      body: { suggestedUpgrade: 'pro' },
    });

    try {
      await tractorsApi.livePositions();
    } catch (e) {
      expect(e).toBeInstanceOf(G3ApiError);
      expect((e as G3ApiError).isUpgradeRequired).toBe(true);
    }
  });
});
