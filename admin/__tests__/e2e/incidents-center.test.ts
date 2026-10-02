/**
 * E2E — centro de incidentes de G3 Admin.
 *  1. Lógica de SLA (pura) idéntica a la del backend.
 *  2. Flujo de la torre sobre el backend demo: priorización, asignación,
 *     acuse, resolución con nota, cierre y reglas.
 *  3. Cliente HTTP: rutas y payloads contra el backend G3.
 */
import { createDemoIncidents, formatDue, withSla, byPriority, incidentsHttp, type IncidentDTO } from '../../lib/incidents';
import { tokenStore } from '../../lib/api/client';
import { installGlobalFetchMock, makeFetchMock } from '../helpers/mockFetch';

const T0 = new Date('2026-10-01T10:00:00.000Z');

const base = (over: Partial<IncidentDTO> = {}): IncidentDTO => ({
  id: 'i1', companyId: 'c', folio: 'INC-2026-00001', clientUuid: null, source: 'driver_report',
  type: 'mechanical', urgency: 'high', status: 'open', title: 'Falla mecánica', description: 'x',
  tripId: null, driverId: null, vehicleId: null, assigneeId: null, occurredAt: T0.toISOString(),
  locationText: null, lat: null, lng: null, evidenceIds: [],
  slaAckDueAt: '2026-10-01T10:15:00.000Z', slaResolveDueAt: '2026-10-01T18:00:00.000Z',
  acknowledgedAt: null, resolvedAt: null, closedAt: null, escalationLevel: 0,
  createdAt: T0.toISOString(), updatedAt: T0.toISOString(), ...over,
});

describe('SLA', () => {
  test('cuenta regresiva hacia el acuse y luego hacia la resolución', () => {
    const at = new Date('2026-10-01T10:05:00.000Z');
    expect(withSla(base(), at).sla).toEqual({ ackBreached: false, resolveBreached: false, minutesToNextDue: 10 });
    const acked = withSla(base({ acknowledgedAt: '2026-10-01T10:04:00.000Z' }), at);
    expect(acked.sla.minutesToNextDue).toBe(475);
    const late = withSla(base(), new Date('2026-10-01T10:20:00.000Z'));
    expect(late.sla.ackBreached).toBe(true);
    expect(formatDue(late.sla.minutesToNextDue)).toBe('vencido hace 5 min');
    expect(formatDue(65)).toBe('vence en 1 h 5 min');
  });

  test('prioridad: pendientes con SLA vencido y críticos primero', () => {
    const now = new Date('2026-10-01T10:20:00.000Z');
    const list = [
      withSla(base({ id: 'resuelto', status: 'resolved', resolvedAt: T0.toISOString(), acknowledgedAt: T0.toISOString() }), now),
      withSla(base({ id: 'low', urgency: 'low', slaAckDueAt: '2026-10-01T14:00:00.000Z' }), now),
      withSla(base({ id: 'vencido' }), now),
    ].sort(byPriority);
    expect(list.map((i) => i.id)).toEqual(['vencido', 'low', 'resuelto']);
  });
});

describe('Flujo de la torre (backend demo)', () => {
  test('el SOS sale primero; asignar → acusar → resolver con nota → cerrar', async () => {
    const b = createDemoIncidents(() => T0);
    const [first] = await b.list();
    expect(first.type).toBe('sos');
    expect(first.urgency).toBe('critical');

    const s0 = await b.summary();
    expect(s0.open).toBe(4);
    expect(s0.critical).toBe(1);

    await b.assign(first.id, 'usr_disp_ana');
    const ack = await b.acknowledge(first.id);
    expect(ack.acknowledgedAt).toBe(T0.toISOString());
    await expect(b.resolve(first.id, '   ')).rejects.toThrow(/resolvi/);
    await b.resolve(first.id, 'Patrulla en sitio, operador a salvo');
    await b.close(first.id);

    const d = await b.get(first.id);
    expect(d.incident.status).toBe('closed');
    expect(d.comments.some((c) => c.body.includes('Patrulla en sitio'))).toBe(true);
    expect(d.comments.some((c) => c.kind === 'system' && c.body.includes('Asignado a Ana Ruiz'))).toBe(true);
    expect((await b.summary()).open).toBe(3);
  });

  test('no permite transiciones inválidas', async () => {
    const b = createDemoIncidents(() => T0);
    const i = await b.createManual({ type: 'accident', urgency: 'critical', description: 'Alcance en Km 40' });
    await expect(b.close(i.id)).rejects.toThrow(/inválida/);
    expect(i.slaAckDueAt).toBe('2026-10-01T10:05:00.000Z');
  });

  test('reglas: alta, desactivar, borrar', async () => {
    const b = createDemoIncidents(() => T0);
    const before = (await b.listRules()).length;
    const r = await b.createRule({
      name: 'Sin señal 20 min', enabled: true, trigger: { kind: 'device_offline', minutes: 20 },
      channels: ['push', 'whatsapp'], notifyRoles: ['dispatcher'],
    });
    expect((await b.updateRule(r.id, { enabled: false })).enabled).toBe(false);
    await b.deleteRule(r.id);
    expect((await b.listRules()).length).toBe(before);
  });
});

describe('Cliente HTTP del centro de incidentes', () => {
  let teardown: () => void;
  beforeEach(() => tokenStore.setInMemory({ accessToken: 'tok', refreshToken: 'r' }));
  afterEach(() => teardown?.());

  test('lista con filtros, acuse, resolución, asignación y contacto', async () => {
    const m = makeFetchMock()
      .onAny((r) => r.url.startsWith('https://api.g3.test/api/incidents?'), { status: 200, body: [] })
      .on('POST /api/incidents/i1/ack', { status: 200, body: base({ status: 'acknowledged' }) })
      .on('POST /api/incidents/i1/resolve', { status: 200, body: base({ status: 'resolved' }) })
      .on('PATCH /api/incidents/i1/assign', { status: 200, body: base({ assigneeId: 'u2' }) })
      .on('PUT /api/notification-contacts/me', { status: 200, body: {} });
    teardown = installGlobalFetchMock(m);

    await incidentsHttp.list({ urgency: 'critical', breached: true });
    expect(m.calls[0].url).toContain('urgency=critical');
    expect(m.calls[0].url).toContain('breached=true');
    await incidentsHttp.acknowledge('i1');
    await incidentsHttp.resolve('i1', 'Se cambió llanta');
    expect(m.calls[2].body).toEqual({ note: 'Se cambió llanta' });
    await incidentsHttp.assign('i1', 'u2');
    expect(m.calls[3].body).toEqual({ assigneeId: 'u2' });
    await incidentsHttp.updateMyContact({ whatsapp: '+5215512345678' });
    expect(m.calls[4].method).toBe('PUT');
  });
});
