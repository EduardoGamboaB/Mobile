import { TripsService } from '../src/trips.service';
import { InMemoryTripRepo } from '../src/in-memory.trip.repo';
import { RecordingEventBus } from '../src/event.bus';
import { TierLimitExceededError, UpgradeRequiredError } from '@g3/contracts';

const ctx = (tier: 'free' | 'starter' | 'pro' | 'business' | 'enterprise' = 'free') => ({
  companyId: 'cmp_1',
  tier,
});

function build() {
  const repo = new InMemoryTripRepo();
  const bus = new RecordingEventBus();
  const svc = new TripsService(repo, bus);
  return { svc, repo, bus };
}

describe('TripsService.create', () => {
  test('asigna folio G3-{year}-{seq incremental por compañía}', async () => {
    const { svc } = build();
    const a = await svc.create(ctx('starter'), { origin: 'CDMX', destination: 'Mty' });
    const b = await svc.create(ctx('starter'), { origin: 'CDMX', destination: 'Tampico' });
    expect(a.folio).toMatch(/^G3-\d{4}-\d{5}$/);
    const seqA = Number(a.folio.split('-')[2]);
    const seqB = Number(b.folio.split('-')[2]);
    expect(seqB).toBe(seqA + 1);
  });

  test('emite trip.created al crear', async () => {
    const { svc, bus } = build();
    const t = await svc.create(ctx('starter'), { origin: 'A', destination: 'B' });
    const e = bus.events.find((x) => x.type === 'trip.created');
    expect(e?.data).toMatchObject({ tripId: t.id });
  });

  test('Free permite hasta 20 viajes por mes, rechaza el 21', async () => {
    const { svc, repo } = build();
    // simulamos 20 trips ya en el mes actual
    for (let i = 0; i < 20; i++) {
      await repo.create({
        id: `t_${i}`, companyId: 'cmp_1', folio: `G3-2026-0000${i}`, status: 'delivered',
        driverId: null, tractorId: null, trailerId: null,
        origin: 'A', destination: 'B', scheduledAt: null,
        startedAt: null, completedAt: null, paymentReleasedAt: null, freightAmount: null,
      });
    }
    await expect(svc.create(ctx('free'), { origin: 'A', destination: 'B' })).rejects.toBeInstanceOf(
      TierLimitExceededError,
    );
  });
});

describe('TripsService.setStatus (state machine)', () => {
  test('transición válida assigned → in_transit setea startedAt', async () => {
    const { svc, bus } = build();
    const t = await svc.create(ctx('starter'), { origin: 'A', destination: 'B' });
    const next = await svc.setStatus(ctx('starter'), t.id, 'in_transit');
    expect(next.status).toBe('in_transit');
    expect(next.startedAt).toBeTruthy();
    expect(bus.events.find((e) => e.type === 'trip.status_changed')).toBeDefined();
  });

  test('transición inválida (assigned → delivered) rechaza', async () => {
    const { svc } = build();
    const t = await svc.create(ctx('starter'), { origin: 'A', destination: 'B' });
    await expect(svc.setStatus(ctx('starter'), t.id, 'delivered')).rejects.toThrow(/transici/i);
  });

  test('delivered setea completedAt', async () => {
    const { svc } = build();
    const t = await svc.create(ctx('starter'), { origin: 'A', destination: 'B' });
    await svc.setStatus(ctx('starter'), t.id, 'in_transit');
    await svc.setStatus(ctx('starter'), t.id, 'arrived');
    const d = await svc.setStatus(ctx('starter'), t.id, 'delivered');
    expect(d.completedAt).toBeTruthy();
  });
});

describe('TripsService.releasePayment (gated por PaymentAuthorization)', () => {
  test('Free → 402 UpgradeRequiredError', async () => {
    const { svc } = build();
    const t = await svc.create(ctx('free'), { origin: 'A', destination: 'B' });
    await svc.setStatus(ctx('free'), t.id, 'in_transit');
    await svc.setStatus(ctx('free'), t.id, 'arrived');
    await svc.setStatus(ctx('free'), t.id, 'delivered');
    await expect(svc.releasePayment(ctx('free'), t.id)).rejects.toBeInstanceOf(UpgradeRequiredError);
  });

  test('Starter → ok: setea paymentReleasedAt y emite evento', async () => {
    const { svc, bus } = build();
    const t = await svc.create(ctx('starter'), { origin: 'A', destination: 'B', freightAmount: 18500 });
    await svc.setStatus(ctx('starter'), t.id, 'in_transit');
    await svc.setStatus(ctx('starter'), t.id, 'arrived');
    await svc.setStatus(ctx('starter'), t.id, 'delivered');

    const paid = await svc.releasePayment(ctx('starter'), t.id);
    expect(paid.status).toBe('paid');
    expect(paid.paymentReleasedAt).toBeTruthy();
    const e = bus.events.find((x) => x.type === 'trip.payment_released');
    expect(e?.data).toMatchObject({ tripId: t.id, amount: 18500 });
  });

  test('releasePayment requiere status=delivered', async () => {
    const { svc } = build();
    const t = await svc.create(ctx('starter'), { origin: 'A', destination: 'B' });
    await svc.setStatus(ctx('starter'), t.id, 'in_transit');
    await expect(svc.releasePayment(ctx('starter'), t.id)).rejects.toThrow(/entregado/i);
  });
});
