import { TripsService, type RequestCtx } from '../src/trips.service';
import { InMemoryTripRepo } from '../src/in-memory.trip.repo';
import {
  InMemoryEvidenceRepo,
  InMemoryExpensePolicyRepo,
  InMemoryLogbookRepo,
  StubEvidenceStorage,
} from '../src/in-memory.ops.repo';
import { RecordingEventBus } from '../src/event.bus';
import {
  TierLimitExceededError,
  UpgradeRequiredError,
  type CreateLogbookEntryDto,
  type TierValue,
  type TripDto,
} from '@g3/contracts';

type Tier = TierValue;

const ctx = (tier: Tier = 'free', over: Partial<RequestCtx> = {}): RequestCtx => ({
  companyId: 'cmp_1',
  tier,
  userId: 'usr_admin',
  role: 'admin',
  ...over,
});
const driverCtx = (driverId: string, tier: Tier = 'starter'): RequestCtx =>
  ctx(tier, { userId: `usr_${driverId}`, role: 'driver', driverId });

function build() {
  const repo = new InMemoryTripRepo();
  const bus = new RecordingEventBus();
  const svc = new TripsService(repo, bus, {
    logbook: new InMemoryLogbookRepo(),
    evidences: new InMemoryEvidenceRepo(),
    policies: new InMemoryExpensePolicyRepo(),
    storage: new StubEvidenceStorage(),
  });
  return { svc, repo, bus };
}

function tripFixture(over: Partial<TripDto>): TripDto {
  const now = new Date().toISOString();
  return {
    id: 't_x', companyId: 'cmp_1', folio: 'G3-2026-00000', status: 'scheduled',
    driverId: null, tractorId: null, trailerId: null, clientName: null, cargo: null,
    origin: 'A', destination: 'B', scheduledAt: now, estimatedUnloadAt: null,
    tons: null, pricePerTon: null, freightAmount: null, driverCommission: null,
    estimatedTolls: null, estimatedDiesel: null, notes: null,
    startedAt: null, preClosedAt: null, closedAt: null, cancelledAt: null,
    paymentStatus: 'pending', paymentReleasedAt: null, createdAt: now, updatedAt: now,
    ...over,
  };
}

/** Avanza un viaje por el flujo feliz hasta `target`. */
async function advanceTo(svc: TripsService, c: RequestCtx, id: string, target: TripDto['status']) {
  const path: TripDto['status'][] = ['loading', 'in_transit', 'unloading', 'pre_closed', 'closed'];
  for (const s of path) {
    await svc.setStatus(c, id, s);
    if (s === target) return;
  }
}

describe('TripsService.create', () => {
  test('asigna folio G3-{year}-{seq incremental por compañía}', async () => {
    const { svc } = build();
    const a = await svc.create(ctx('starter'), { origin: 'CDMX', destination: 'Mty' });
    const b = await svc.create(ctx('starter'), { origin: 'CDMX', destination: 'Tampico' });
    expect(a.folio).toMatch(/^G3-\d{4}-\d{5}$/);
    expect(Number(b.folio.split('-')[2])).toBe(Number(a.folio.split('-')[2]) + 1);
  });

  test('nace en `scheduled` con pago pendiente y emite trip.created', async () => {
    const { svc, bus } = build();
    const t = await svc.create(ctx('starter'), { origin: 'A', destination: 'B', driverCommission: 2500 });
    expect(t.status).toBe('scheduled');
    expect(t.paymentStatus).toBe('pending');
    expect(t.driverCommission).toBe(2500);
    expect(bus.events.find((x) => x.type === 'trip.created')?.data).toMatchObject({ tripId: t.id });
  });

  test('Free permite hasta 20 viajes por mes, rechaza el 21', async () => {
    const { svc, repo } = build();
    for (let i = 0; i < 20; i++) {
      await repo.create(tripFixture({ id: `t_${i}`, folio: `G3-2026-0000${i}`, status: 'closed' }));
    }
    await expect(svc.create(ctx('free'), { origin: 'A', destination: 'B' })).rejects.toBeInstanceOf(
      TierLimitExceededError,
    );
  });

  test('un chofer no puede crear viajes', async () => {
    const { svc } = build();
    await expect(svc.create(driverCtx('drv_1'), { origin: 'A', destination: 'B' })).rejects.toThrow(/permiso/i);
  });
});

describe('TripsService.setStatus · vocabulario único', () => {
  test('scheduled → loading setea startedAt y emite trip.status_changed', async () => {
    const { svc, bus } = build();
    const t = await svc.create(ctx('starter'), { origin: 'A', destination: 'B' });
    const next = await svc.setStatus(ctx('starter'), t.id, 'loading');
    expect(next.startedAt).toBeTruthy();
    expect(bus.events.find((e) => e.type === 'trip.status_changed')?.data).toMatchObject({
      fromStatus: 'scheduled',
      toStatus: 'loading',
    });
  });

  test('no permite saltos (scheduled → unloading)', async () => {
    const { svc } = build();
    const t = await svc.create(ctx('starter'), { origin: 'A', destination: 'B' });
    await expect(svc.setStatus(ctx('starter'), t.id, 'unloading')).rejects.toThrow(/transici/i);
  });

  test('rechaza estados fuera del vocabulario (p.ej. los heredados `delivered`/`finished`)', async () => {
    const { svc } = build();
    const t = await svc.create(ctx('starter'), { origin: 'A', destination: 'B' });
    await expect(svc.setStatus(ctx('starter'), t.id, 'delivered' as never)).rejects.toThrow(/desconocido/i);
    await expect(svc.setStatus(ctx('starter'), t.id, 'finished' as never)).rejects.toThrow(/desconocido/i);
  });

  test('precierre: unloading → pre_closed setea preClosedAt y el viaje sigue activo', async () => {
    const { svc } = build();
    const t = await svc.create(ctx('starter'), { origin: 'A', destination: 'B', driverId: 'drv_1' });
    await advanceTo(svc, ctx('starter'), t.id, 'pre_closed');
    const pre = await svc.get(ctx('starter'), t.id);
    expect(pre.preClosedAt).toBeTruthy();
    expect(pre.closedAt).toBeNull();
    const active = await svc.listMine(driverCtx('drv_1'), 'active');
    expect(active.map((x) => x.id)).toContain(t.id);
  });

  test('cierre en matriz: pre_closed → closed setea closedAt y pasa a historial', async () => {
    const { svc } = build();
    const t = await svc.create(ctx('starter'), { origin: 'A', destination: 'B', driverId: 'drv_1' });
    await advanceTo(svc, ctx('starter'), t.id, 'closed');
    const closed = await svc.get(ctx('starter'), t.id);
    expect(closed.closedAt).toBeTruthy();
    expect((await svc.listMine(driverCtx('drv_1'), 'history')).map((x) => x.id)).toContain(t.id);
    await expect(svc.setStatus(ctx('starter'), t.id, 'pre_closed')).rejects.toThrow(/transici/i);
  });

  test('unloading → closed directo (viaje sin retorno en vacío)', async () => {
    const { svc } = build();
    const t = await svc.create(ctx('starter'), { origin: 'A', destination: 'B' });
    await advanceTo(svc, ctx('starter'), t.id, 'unloading');
    const closed = await svc.setStatus(ctx('starter'), t.id, 'closed');
    expect(closed.closedAt).toBeTruthy();
    expect(closed.preClosedAt).toBeNull();
  });

  test('cancelar setea cancelledAt; un chofer no puede cancelar', async () => {
    const { svc } = build();
    const t = await svc.create(ctx('starter'), { origin: 'A', destination: 'B', driverId: 'drv_1' });
    await expect(svc.setStatus(driverCtx('drv_1'), t.id, 'cancelled')).rejects.toThrow(/permiso/i);
    const c = await svc.setStatus(ctx('starter'), t.id, 'cancelled');
    expect(c.cancelledAt).toBeTruthy();
  });

  test('un chofer solo avanza sus propios viajes', async () => {
    const { svc } = build();
    const t = await svc.create(ctx('starter'), { origin: 'A', destination: 'B', driverId: 'drv_1' });
    await expect(svc.setStatus(driverCtx('drv_2'), t.id, 'loading')).rejects.toThrow(/no encontrado/i);
    const ok = await svc.setStatus(driverCtx('drv_1'), t.id, 'loading');
    expect(ok.status).toBe('loading');
  });
});

describe('TripsService.listMine', () => {
  test('el chofer solo ve sus viajes; activos vs historial', async () => {
    const { svc } = build();
    const mine = await svc.create(ctx('starter'), { origin: 'A', destination: 'B', driverId: 'drv_1' });
    await svc.create(ctx('starter'), { origin: 'A', destination: 'C', driverId: 'drv_2' });
    const cancelled = await svc.create(ctx('starter'), { origin: 'A', destination: 'D', driverId: 'drv_1' });
    await svc.setStatus(ctx('starter'), cancelled.id, 'cancelled');

    const active = await svc.listMine(driverCtx('drv_1'), 'active');
    expect(active.map((t) => t.id)).toEqual([mine.id]);
    const history = await svc.listMine(driverCtx('drv_1'), 'history');
    expect(history.map((t) => t.id)).toEqual([cancelled.id]);
  });

  test('sin driverId en el contexto rechaza', async () => {
    const { svc } = build();
    await expect(svc.listMine(ctx('starter'), 'active')).rejects.toThrow(/chofer/i);
  });
});

describe('TripsService.releasePayment (gated por PaymentAuthorization)', () => {
  test('Free → 402 UpgradeRequiredError', async () => {
    const { svc } = build();
    const t = await svc.create(ctx('free'), { origin: 'A', destination: 'B' });
    await advanceTo(svc, ctx('free'), t.id, 'pre_closed');
    await expect(svc.releasePayment(ctx('free'), t.id)).rejects.toBeInstanceOf(UpgradeRequiredError);
  });

  test('desde precierre: libera sin esperar el retorno y NO cambia el estado del viaje', async () => {
    const { svc, bus } = build();
    const t = await svc.create(ctx('starter'), { origin: 'A', destination: 'B', freightAmount: 18500 });
    await advanceTo(svc, ctx('starter'), t.id, 'pre_closed');
    const paid = await svc.releasePayment(ctx('starter'), t.id);
    expect(paid.status).toBe('pre_closed');
    expect(paid.paymentStatus).toBe('released');
    expect(paid.paymentReleasedAt).toBeTruthy();
    expect(bus.events.find((x) => x.type === 'trip.payment_released')?.data).toMatchObject({
      tripId: t.id,
      amount: 18500,
    });
  });

  test('también desde closed; no se libera dos veces', async () => {
    const { svc } = build();
    const t = await svc.create(ctx('starter'), { origin: 'A', destination: 'B' });
    await advanceTo(svc, ctx('starter'), t.id, 'closed');
    await svc.releasePayment(ctx('starter'), t.id);
    await expect(svc.releasePayment(ctx('starter'), t.id)).rejects.toThrow(/ya fue liberado/i);
  });

  test('requiere entrega (pre_closed o closed)', async () => {
    const { svc } = build();
    const t = await svc.create(ctx('starter'), { origin: 'A', destination: 'B' });
    await advanceTo(svc, ctx('starter'), t.id, 'in_transit');
    await expect(svc.releasePayment(ctx('starter'), t.id)).rejects.toThrow(/entregado/i);
  });

  test('un chofer no puede liberar pagos', async () => {
    const { svc } = build();
    const t = await svc.create(ctx('starter'), { origin: 'A', destination: 'B', driverId: 'drv_1' });
    await advanceTo(svc, ctx('starter'), t.id, 'pre_closed');
    await expect(svc.releasePayment(driverCtx('drv_1'), t.id)).rejects.toThrow(/permiso/i);
  });
});

const entry = (over: Partial<CreateLogbookEntryDto> = {}): CreateLogbookEntryDto => ({
  clientUuid: 'cu_1',
  driverId: 'drv_1',
  eventType: 'toll',
  occurredAt: '2026-10-01T10:00:00.000Z',
  locationText: 'Caseta Querétaro',
  lat: 20.6,
  lng: -100.4,
  odometerKm: null,
  fuel: null,
  expenseAmount: 340,
  expenseConcept: 'Caseta',
  expenseHasReceipt: true,
  comments: null,
  ...over,
});

describe('Bitácora', () => {
  test('registra y lista en orden cronológico; reenvío con mismo clientUuid es idempotente', async () => {
    const { svc } = build();
    const t = await svc.create(ctx('starter'), { origin: 'A', destination: 'B', driverId: 'drv_1' });
    const d = driverCtx('drv_1');
    const a = await svc.addLogbookEntry(d, t.id, entry({ clientUuid: 'cu_2', occurredAt: '2026-10-01T12:00:00.000Z' }));
    await svc.addLogbookEntry(d, t.id, entry({ clientUuid: 'cu_1' }));
    const again = await svc.addLogbookEntry(d, t.id, entry({ clientUuid: 'cu_2', occurredAt: '2026-10-01T12:00:00.000Z' }));
    expect(again.id).toBe(a.id);
    const list = await svc.listLogbook(d, t.id);
    expect(list.map((e) => e.clientUuid)).toEqual(['cu_1', 'cu_2']);
  });

  test('la política de gastos se aplica en el servidor, no solo en la app', async () => {
    const { svc } = build();
    const t = await svc.create(ctx('starter'), { origin: 'A', destination: 'B', driverId: 'drv_1' });
    await svc.putExpensePolicy(ctx('starter'), { allowManualExpense: true, manualMaxAmount: 300, requireReceipt: false });
    const d = driverCtx('drv_1');
    await expect(
      svc.addLogbookEntry(d, t.id, entry({ clientUuid: 'cu_big', expenseAmount: 301, expenseHasReceipt: false })),
    ).rejects.toThrow(/tope/i);
    const ok = await svc.addLogbookEntry(d, t.id, entry({ clientUuid: 'cu_ok', expenseAmount: 300, expenseHasReceipt: false }));
    expect(ok.expenseAmount).toBe(300);
    const withReceipt = await svc.addLogbookEntry(
      d, t.id, entry({ clientUuid: 'cu_rcpt', expenseAmount: 5000, expenseHasReceipt: true }),
    );
    expect(withReceipt.expenseHasReceipt).toBe(true);
  });

  test('un chofer no escribe en la bitácora de un viaje ajeno', async () => {
    const { svc } = build();
    const t = await svc.create(ctx('starter'), { origin: 'A', destination: 'B', driverId: 'drv_1' });
    await expect(svc.addLogbookEntry(driverCtx('drv_2'), t.id, entry({ driverId: 'drv_2' }))).rejects.toThrow(
      /no encontrado/i,
    );
  });

  test('multi-tenant: otra compañía no ve la bitácora', async () => {
    const { svc } = build();
    const t = await svc.create(ctx('starter'), { origin: 'A', destination: 'B', driverId: 'drv_1' });
    await svc.addLogbookEntry(driverCtx('drv_1'), t.id, entry());
    await expect(svc.listLogbook(ctx('starter', { companyId: 'cmp_2' }), t.id)).rejects.toThrow(/no encontrado/i);
  });
});

describe('Política de gastos', () => {
  test('default permisivo cuando la compañía no ha configurado regla', async () => {
    const { svc } = build();
    const p = await svc.getExpensePolicy(ctx('starter'));
    expect(p).toMatchObject({ allowManualExpense: true, manualMaxAmount: null, requireReceipt: false });
  });

  test('solo admin/dispatcher la modifica', async () => {
    const { svc } = build();
    await expect(
      svc.putExpensePolicy(driverCtx('drv_1'), { allowManualExpense: false, manualMaxAmount: null, requireReceipt: true }),
    ).rejects.toThrow(/permiso/i);
    const p = await svc.putExpensePolicy(ctx('starter', { role: 'dispatcher' }), {
      allowManualExpense: false,
      manualMaxAmount: null,
      requireReceipt: true,
    });
    expect(p.requireReceipt).toBe(true);
  });

  test('rechaza topes negativos', async () => {
    const { svc } = build();
    await expect(
      svc.putExpensePolicy(ctx('starter'), { allowManualExpense: true, manualMaxAmount: -1, requireReceipt: false }),
    ).rejects.toThrow(/tope/i);
  });
});

describe('Evidencias', () => {
  test('URL de subida firmada bajo company/trip y registro idempotente por clientUuid', async () => {
    const { svc } = build();
    const t = await svc.create(ctx('starter'), { origin: 'A', destination: 'B', driverId: 'drv_1' });
    const d = driverCtx('drv_1');
    const up = await svc.evidenceUploadUrl(d, t.id, { clientUuid: 'ev_1', mimeType: 'image/jpeg' });
    expect(up.storagePath.startsWith(`cmp_1/${t.id}/`)).toBe(true);
    const base = {
      clientUuid: 'ev_1', tripId: t.id, logbookId: null, incidentId: null, driverId: 'drv_1',
      type: 'toll_ticket' as const, storagePath: up.storagePath, mimeType: 'image/jpeg',
      sizeBytes: 1024, lat: null, lng: null, takenAt: null,
    };
    const a = await svc.registerEvidence(d, t.id, base);
    const b = await svc.registerEvidence(d, t.id, base);
    expect(b.id).toBe(a.id);
    expect((await svc.listEvidences(ctx('starter'), t.id)).length).toBe(1);
  });

  test('rechaza storagePath fuera del prefijo de la compañía/viaje', async () => {
    const { svc } = build();
    const t = await svc.create(ctx('starter'), { origin: 'A', destination: 'B', driverId: 'drv_1' });
    await expect(
      svc.registerEvidence(driverCtx('drv_1'), t.id, {
        clientUuid: 'ev_x', tripId: t.id, logbookId: null, incidentId: null, driverId: 'drv_1',
        type: 'other', storagePath: 'cmp_2/otro/archivo.jpg', mimeType: null, sizeBytes: null,
        lat: null, lng: null, takenAt: null,
      }),
    ).rejects.toThrow(/ruta/i);
  });
});
