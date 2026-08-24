/**
 * E2E — precierre de viaje + política de gastos (features nativas de G3 Drive).
 *
 * Parte 1 · Stack demo (vocabulario Supabase):
 *   unloading → pre_closed (entrega con cliente, retorno en vacío)
 *   → finished (cierre en matriz). El viaje precerrado sigue activo.
 *
 * Parte 2 · Gastos: ticket leído por IA prellena el gasto; los gastos
 *   manuales sin comprobante se validan contra la política configurada
 *   en G3 Admin (allow_manual / tope / require_receipt).
 *
 * Parte 3 · Vocabulario backend (g3 api): delivered → closed → paid.
 */
import { demoStore } from '@/demo/store';
import { stubAI } from '@/services/ai';
import { validateExpense, DEFAULT_EXPENSE_POLICY, type ExpensePolicy } from '@/domain/expensePolicy';
import { tripsApi } from '@/api/g3/trips';
import { tokenStore } from '@/api/g3/client';
import { fixtures } from '../helpers/fixtures';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';

describe('E2E — precierre de viaje (demo stack, vocabulario Drive)', () => {
  test('unloading → pre_closed estampa pre_closed_at y el viaje sigue activo', async () => {
    const active = await demoStore.listActive();
    expect(active.length).toBeGreaterThan(0);
    const trip = active[0];

    // avanzar hasta unloading según el estado actual del seed
    const chain: Record<string, string[]> = {
      scheduled: ['loading', 'in_transit', 'unloading'],
      loading: ['in_transit', 'unloading'],
      in_transit: ['unloading'],
      unloading: [],
    };
    for (const next of chain[trip.status] ?? []) {
      await demoStore.advanceStatus(trip.id, next as never);
    }

    // PRECIERRE: entrega con el cliente final, retorno en vacío
    const pre = await demoStore.advanceStatus(trip.id, 'pre_closed');
    expect(pre.status).toBe('pre_closed');
    expect(pre.pre_closed_at).toBeTruthy();
    expect(pre.finished_at).toBeNull();

    // el viaje precerrado sigue listado como activo (va en vacío a matriz)
    const stillActive = await demoStore.listActive();
    expect(stillActive.some((t) => t.id === trip.id)).toBe(true);

    // no se puede cancelar-cerrar con transición inválida
    await expect(demoStore.advanceStatus(trip.id, 'loading' as never)).rejects.toThrow(/invalid/i);

    // CIERRE TOTAL: llegó a matriz
    const closed = await demoStore.advanceStatus(trip.id, 'finished');
    expect(closed.status).toBe('finished');
    expect(closed.finished_at).toBeTruthy();
    expect(closed.pre_closed_at).toBeTruthy(); // el precierre queda en el historial

    const history = await demoStore.listHistory();
    expect(history.some((t) => t.id === trip.id)).toBe(true);
  });
});

describe('E2E — gastos: IA de tickets + política administrada desde G3 Admin', () => {
  test('la IA extrae monto del ticket de diesel para prellenar el gasto', async () => {
    const r = await stubAI.extractEvidence({
      photoUri: 'file://ticket-diesel.jpg',
      hintType: 'diesel_ticket',
    });
    expect(r.confidence).toBeGreaterThan(0.5);
    expect(r.fields.amount).toBeGreaterThan(0);
  });

  test('gasto con ticket siempre pasa, con cualquier política', () => {
    const strict: ExpensePolicy = {
      company_id: 'c1',
      allow_manual_expense: false,
      manual_max_amount: 0,
      require_receipt: true,
    };
    expect(validateExpense(strict, 4860, true)).toBeNull();
  });

  test('require_receipt bloquea todo gasto sin foto', () => {
    const policy: ExpensePolicy = { ...DEFAULT_EXPENSE_POLICY, require_receipt: true };
    expect(validateExpense(policy, 50, false)).toMatch(/foto del ticket/i);
  });

  test('allow_manual_expense=false bloquea manuales aunque no haya tope', () => {
    const policy: ExpensePolicy = { ...DEFAULT_EXPENSE_POLICY, allow_manual_expense: false };
    expect(validateExpense(policy, 10, false)).toMatch(/no permite/i);
  });

  test('tope: sin ticket pasa hasta el tope y se bloquea arriba de él', () => {
    const policy: ExpensePolicy = { ...DEFAULT_EXPENSE_POLICY, manual_max_amount: 300 };
    expect(validateExpense(policy, 300, false)).toBeNull();
    expect(validateExpense(policy, 300.01, false)).toMatch(/tope/i);
  });

  test('la entrada de bitácora registra si el gasto llevó comprobante', async () => {
    const entry = await demoStore.addLogbookEntry({
      id: 'lb-e2e-receipt',
      client_uuid: 'lb-e2e-receipt',
      trip_id: 'demo-trip',
      driver_id: 'demo-driver',
      event_type: 'diesel',
      occurred_at: new Date().toISOString(),
      location_text: 'Pemex km 187',
      lat: null,
      lng: null,
      odometer_km: null,
      fuel: null,
      expense_amount: 4860,
      expense_concept: 'diesel',
      expense_has_receipt: true,
      comments: null,
      created_at: new Date().toISOString(),
    });
    expect(entry.expense_has_receipt).toBe(true);
  });
});

describe('E2E — precierre en vocabulario backend (delivered → closed → paid)', () => {
  let teardown: () => void;
  beforeEach(() => {
    tokenStore.setInMemory({ accessToken: 'tok-starter', refreshToken: 'rfr' });
  });
  afterEach(() => teardown?.());

  test('entrega (precierre) permite liberar pago sin esperar el retorno; el cierre llega después', async () => {
    const tripId = 'trp_preclose_1';
    const m = makeFetchMock();

    m.onAny(
      (req) => req.method === 'PATCH' && req.url.endsWith(`/api/trips/${tripId}/status`),
      (req) => {
        const next = (req.body as { status: string }).status;
        return {
          status: 200,
          body: fixtures.trip({
            id: tripId,
            status: next as 'delivered' | 'closed',
            completedAt: '2026-08-25T14:30:00Z',
            closedAt: next === 'closed' ? '2026-08-25T19:05:00Z' : null,
          }),
        };
      },
    );
    m.on('POST /api/trips/' + tripId + '/release-payment', {
      status: 200,
      body: fixtures.trip({
        id: tripId,
        status: 'paid',
        completedAt: '2026-08-25T14:30:00Z',
        closedAt: null,
        paymentReleasedAt: '2026-08-25T15:00:00Z',
      }),
    });

    teardown = installGlobalFetchMock(m);

    // precierre: entregó en Obregón
    const delivered = await tripsApi.setStatus(tripId, 'delivered');
    expect(delivered.completedAt).toBeTruthy();
    expect(delivered.closedAt).toBeNull();

    // el pago se libera desde la entrega — no depende del retorno a matriz
    const paid = await tripsApi.releasePayment(tripId);
    expect(paid.status).toBe('paid');

    // cierre total al llegar a matriz
    const closed = await tripsApi.setStatus(tripId, 'closed');
    expect(closed.status).toBe('closed');
    expect(closed.closedAt).toBeTruthy();
  });
});
