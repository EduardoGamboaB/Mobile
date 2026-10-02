/**
 * E2E — G3 Drive habla solo con el backend G3 (NestJS): viajes del chofer,
 * bitácora con gasto, política de gastos, incidente y SOS. Sin Supabase.
 * Las pantallas siguen recibiendo los modelos snake_case de siempre.
 */
import { listMyActiveTrips, advanceTripStatus } from '@/api/trips';
import { createLogbookEntry, listLogbook } from '@/api/logbook';
import { getExpensePolicy } from '@/api/expensePolicy';
import { createIncident, sendSos } from '@/api/incidents';
import { tokenStore } from '@/api/g3/client';
import { decodeJwtUser } from '@/stores/auth';
import { isDemo } from '@/demo';
import { fixtures } from '../helpers/fixtures';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';

const incidentBody = (over: Record<string, unknown> = {}) => ({
  id: 'inc_1', companyId: 'cmp_test_1', folio: 'INC-2026-00001', clientUuid: 'cu_inc',
  source: 'driver_report', type: 'mechanical', urgency: 'high', status: 'open',
  title: 'Falla mecánica', description: 'Se calentó el motor', tripId: 'trp_test_1',
  driverId: 'drv_test_1', vehicleId: null, assigneeId: null,
  occurredAt: '2026-10-01T10:00:00Z', locationText: null, lat: 20.6, lng: -100.4,
  evidenceIds: [], slaAckDueAt: '2026-10-01T10:15:00Z', slaResolveDueAt: '2026-10-01T18:00:00Z',
  acknowledgedAt: null, resolvedAt: null, closedAt: null, escalationLevel: 0,
  createdAt: '2026-10-01T10:00:00Z', updatedAt: '2026-10-01T10:00:00Z',
  ...over,
});

describe('E2E — Drive con el backend G3 como única fuente de verdad', () => {
  let teardown: () => void;
  beforeEach(() => tokenStore.setInMemory({ accessToken: 'tok-driver', refreshToken: 'rfr' }));
  afterEach(() => teardown?.());

  test('con URL del API configurada no hay modo demo', () => {
    expect(isDemo).toBe(false);
  });

  test('viajes activos del chofer vienen de /trips/mine y se mapean al modelo de pantalla', async () => {
    const m = makeFetchMock().onAny(
      (r) => r.url.includes('/api/trips/mine?scope=active'),
      { status: 200, body: [fixtures.trip({ status: 'pre_closed', preClosedAt: '2026-10-01T12:00:00Z' })] },
    );
    teardown = installGlobalFetchMock(m);
    const [t] = await listMyActiveTrips('ignored');
    expect(t.status).toBe('pre_closed');
    expect(t.pre_closed_at).toBe('2026-10-01T12:00:00Z');
    expect(t.client_name).toBe('Molinos del Bajío');
    expect(t.driver_commission).toBe(2500);
  });

  test('avanzar a `closed` usa PATCH /trips/:id/status', async () => {
    const m = makeFetchMock().on('PATCH /api/trips/trp_test_1/status', {
      status: 200,
      body: fixtures.trip({ status: 'closed', closedAt: '2026-10-01T19:00:00Z' }),
    });
    teardown = installGlobalFetchMock(m);
    const t = await advanceTripStatus('trp_test_1', 'closed');
    expect(m.calls[0].body).toEqual({ status: 'closed' });
    expect(t.closed_at).toBeTruthy();
  });

  test('bitácora: el gasto viaja en camelCase al backend y regresa en snake_case', async () => {
    const created = {
      id: 'lb_1', companyId: 'cmp_test_1', clientUuid: 'cu_1', tripId: 'trp_test_1',
      driverId: 'drv_test_1', eventType: 'diesel', occurredAt: '2026-10-01T09:30:00Z',
      locationText: 'Pemex km 187', lat: null, lng: null, odometerKm: null, fuel: null,
      expenseAmount: 4860, expenseConcept: 'Diesel 180L', expenseHasReceipt: true,
      comments: null, createdAt: '2026-10-01T09:30:01Z',
    };
    const m = makeFetchMock()
      .on('POST /api/trips/trp_test_1/logbook', { status: 201, body: created })
      .on('GET /api/trips/trp_test_1/logbook', { status: 200, body: [created] });
    teardown = installGlobalFetchMock(m);

    const e = await createLogbookEntry({
      client_uuid: 'cu_1', trip_id: 'trp_test_1', driver_id: 'drv_test_1', event_type: 'diesel',
      occurred_at: '2026-10-01T09:30:00Z', location_text: 'Pemex km 187',
      expense_amount: 4860, expense_concept: 'Diesel 180L', expense_has_receipt: true,
    });
    expect(m.calls[0].body).toMatchObject({ clientUuid: 'cu_1', expenseAmount: 4860, expenseHasReceipt: true });
    expect(e.expense_has_receipt).toBe(true);
    expect((await listLogbook('trp_test_1'))[0].expense_amount).toBe(4860);
  });

  test('el rechazo de política del servidor llega al chofer como error', async () => {
    const m = makeFetchMock().on('POST /api/trips/trp_test_1/logbook', {
      status: 400,
      body: { statusCode: 400, message: 'Los gastos sin ticket tienen tope de $300.00.' },
    });
    teardown = installGlobalFetchMock(m);
    await expect(
      createLogbookEntry({
        client_uuid: 'cu_2', trip_id: 'trp_test_1', driver_id: 'drv_test_1', event_type: 'toll',
        occurred_at: '2026-10-01T10:00:00Z', expense_amount: 500, expense_has_receipt: false,
      }),
    ).rejects.toThrow(/tope/);
  });

  test('la política de gastos se lee de /expense-policy', async () => {
    const m = makeFetchMock().on('GET /api/expense-policy', {
      status: 200,
      body: { companyId: 'cmp_test_1', allowManualExpense: true, manualMaxAmount: 300, requireReceipt: false, updatedAt: 'x' },
    });
    teardown = installGlobalFetchMock(m);
    expect(await getExpensePolicy()).toEqual({
      company_id: 'cmp_test_1', allow_manual_expense: true, manual_max_amount: 300, require_receipt: false,
    });
  });

  test('reportar incidente y SOS van al centro de incidentes', async () => {
    const m = makeFetchMock()
      .on('POST /api/incidents', { status: 201, body: incidentBody() })
      .on('POST /api/incidents/sos', {
        status: 201,
        body: incidentBody({ id: 'inc_sos', type: 'sos', source: 'sos', urgency: 'critical' }),
      });
    teardown = installGlobalFetchMock(m);

    const inc = await createIncident({
      client_uuid: 'cu_inc', trip_id: 'trp_test_1', driver_id: 'drv_test_1', type: 'mechanical',
      description: 'Se calentó el motor', occurred_at: '2026-10-01T10:00:00Z', urgency: 'high',
    });
    expect(inc.resolved).toBe(false);
    expect(m.calls[0].body).toMatchObject({ clientUuid: 'cu_inc', urgency: 'high' });

    const sos = await sendSos({ client_uuid: 'cu_sos', trip_id: 'trp_test_1', driver_id: 'drv_test_1', lat: 20.6, lng: -100.4 });
    expect(sos.urgency).toBe('critical');
    expect(m.calls[1].body).toMatchObject({ clientUuid: 'cu_sos', lat: 20.6 });
  });

  test('la sesión se reconstruye de los claims del JWT (incluido driverId)', () => {
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const token = `${b64({ alg: 'HS256' })}.${b64({
      sub: 'usr_9', email: 'chofer@g3.mx', role: 'driver', companyId: 'cmp_1', tier: 'starter', driverId: 'drv_9',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })}.firma`;
    expect(decodeJwtUser(token)).toEqual({
      id: 'usr_9', email: 'chofer@g3.mx', role: 'driver', companyId: 'cmp_1', tier: 'starter', driverId: 'drv_9',
    });
    expect(decodeJwtUser('basura')).toBeNull();
  });
});
