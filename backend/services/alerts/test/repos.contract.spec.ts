import * as path from 'path';
import { randomUUID } from 'crypto';
import type { Pool } from 'pg';
import type { IncidentDto, OperationalSignalDto } from '@g3/contracts';
import { createTestDb, describeIfDb } from '@g3/platform/testing';
import { InMemoryAlertRepo, type AlertRepo } from '../src/in-memory.alert.repo';
import { PgAlertRepo } from '../src/pg.alert.repo';
import {
  InMemoryAlertRuleRepo,
  InMemoryIncidentRepo,
  InMemoryVehicleSignalRepo,
} from '../src/incidents/in-memory.incidents.repo';
import {
  PgAlertRuleRepo,
  PgContactDirectory,
  PgIncidentRepo,
  PgVehicleSignalRepo,
} from '../src/incidents/pg.incidents.repo';
import type {
  AlertRuleRepo,
  ContactDirectory,
  IncidentRepo,
  NewIncident,
  VehicleSignalRepo,
} from '../src/incidents/incidents.repo';
import { InMemoryContactDirectory, RecordingNotifier } from '../src/incidents/notifier';
import { formatFolio, IncidentsService, type RequestCtx } from '../src/incidents/incidents.service';
import { RecordingEventBus } from '../src/event.bus';

/**
 * Suite de contrato: la misma batería contra los repos en memoria y contra
 * Postgres real (con TEST_DATABASE_URL). Cada prueba usa compañías nuevas,
 * así que no dependen del orden ni se pisan entre sí.
 */

interface Repos {
  alerts: AlertRepo;
  incidents: IncidentRepo;
  rules: AlertRuleRepo;
  contacts: ContactDirectory;
  signals: VehicleSignalRepo;
}

const T0 = new Date('2026-10-01T10:00:00.000Z');
const cmp = () => `cmp_${randomUUID().slice(0, 8)}`;

function draft(companyId: string, over: Partial<NewIncident> = {}): NewIncident {
  return {
    id: randomUUID(),
    companyId,
    clientUuid: null,
    source: 'driver_report',
    type: 'mechanical',
    urgency: 'high',
    status: 'open',
    title: 'Falla mecánica',
    description: 'Se calentó el motor',
    tripId: 'trp_1',
    driverId: 'drv_1',
    vehicleId: 'trc_1',
    assigneeId: null,
    occurredAt: T0.toISOString(),
    locationText: null,
    lat: 21.1,
    lng: -100.9,
    evidenceIds: [],
    slaAckDueAt: new Date(T0.getTime() + 15 * 60_000).toISOString(),
    slaResolveDueAt: new Date(T0.getTime() + 8 * 3_600_000).toISOString(),
    acknowledgedAt: null,
    resolvedAt: null,
    closedAt: null,
    escalationLevel: 0,
    createdAt: T0.toISOString(),
    updatedAt: T0.toISOString(),
    ...over,
  };
}

const signal = (over: Partial<OperationalSignalDto> = {}): OperationalSignalDto => ({
  kind: 'position', vehicleId: 'trc_1', tripId: 'trp_1', driverId: 'drv_1',
  speedKph: 60, lat: 21, lng: -101, recordedAt: T0.toISOString(), ...over,
});

function contractSuite(name: string, d: jest.Describe, setup: () => Promise<{ repos: () => Repos; close: () => Promise<void> }>) {
  d(`contrato de repos de alerts (${name})`, () => {
    let r: Repos;
    let mk: () => Repos;
    let close: () => Promise<void>;

    beforeAll(async () => {
      const s = await setup();
      mk = s.repos;
      close = s.close;
    });
    beforeEach(() => {
      r = mk();
    });
    afterAll(async () => close?.());

    describe('alertas simples', () => {
      test('alta, filtros, resolver y aislamiento por compañía', async () => {
        const a = cmp();
        const b = cmp();
        const base = { level: 'info' as const, type: 'other' as const, message: 'm', resolved: false };
        const one = await r.alerts.create({ ...base, id: randomUUID(), companyId: a, createdAt: T0.toISOString() });
        await r.alerts.create({ ...base, id: randomUUID(), companyId: a, level: 'critical', createdAt: '2026-10-01T10:01:00.000Z' });
        await r.alerts.create({ ...base, id: randomUUID(), companyId: b, createdAt: T0.toISOString() });
        expect(await r.alerts.list(a)).toHaveLength(2);
        expect((await r.alerts.list(a, { level: 'critical' })).map((x) => x.level)).toEqual(['critical']);
        expect(await r.alerts.update(b, one.id, { resolved: true })).toBeNull();
        expect(await r.alerts.findById(b, one.id)).toBeNull();
        expect((await r.alerts.update(a, one.id, { resolved: true }))?.resolved).toBe(true);
        expect(await r.alerts.list(a, { resolved: false })).toHaveLength(1);
        expect(one.createdAt).toBe(T0.toISOString());
      });
    });

    describe('incidentes', () => {
      test('folio por compañía y año; ida y vuelta de todos los campos', async () => {
        const a = cmp();
        const b = cmp();
        const i1 = await r.incidents.create(draft(a, { evidenceIds: ['ev_0'] }), formatFolio);
        const i2 = await r.incidents.create(draft(a), formatFolio);
        const other = await r.incidents.create(draft(b), formatFolio);
        const nextYear = await r.incidents.create(draft(a, { createdAt: '2027-01-01T00:00:00.000Z' }), formatFolio);
        expect([i1.incident.folio, i2.incident.folio]).toEqual(['INC-2026-00001', 'INC-2026-00002']);
        expect(other.incident.folio).toBe('INC-2026-00001');
        expect(nextYear.incident.folio).toBe('INC-2027-00001');
        const back = await r.incidents.findById(a, i1.incident.id);
        expect(back).toEqual(i1.incident);
        expect(back).toMatchObject({ evidenceIds: ['ev_0'], lat: 21.1, escalationLevel: 0, acknowledgedAt: null });
      });

      test('folios únicos con altas concurrentes', async () => {
        const a = cmp();
        const created = await Promise.all(Array.from({ length: 25 }, () => r.incidents.create(draft(a), formatFolio)));
        const folios = created.map((c) => c.incident.folio).sort();
        expect(new Set(folios).size).toBe(25);
        expect(folios[0]).toBe('INC-2026-00001');
        expect(folios[24]).toBe('INC-2026-00025');
      });

      test('idempotente por clientUuid aun con altas simultáneas (sin consumir folio)', async () => {
        const a = cmp();
        const results = await Promise.all(
          Array.from({ length: 8 }, () => r.incidents.create(draft(a, { clientUuid: 'cu_1' }), formatFolio)),
        );
        expect(results.filter((x) => x.created)).toHaveLength(1);
        expect(new Set(results.map((x) => x.incident.id)).size).toBe(1);
        expect((await r.incidents.findByClientUuid(a, 'cu_1'))?.id).toBe(results[0].incident.id);
        const next = await r.incidents.create(draft(a), formatFolio);
        expect(next.incident.folio).toBe('INC-2026-00002');
        // El mismo clientUuid en otra compañía es otro incidente.
        expect((await r.incidents.create(draft(cmp(), { clientUuid: 'cu_1' }), formatFolio)).created).toBe(true);
      });

      test('list con filtros, más recientes primero, y aislado por compañía', async () => {
        const a = cmp();
        await r.incidents.create(draft(a, { createdAt: '2026-10-01T10:00:00.000Z', type: 'speeding', vehicleId: 'trc_9' }), formatFolio);
        const late = await r.incidents.create(draft(a, { createdAt: '2026-10-01T11:00:00.000Z', driverId: 'drv_2' }), formatFolio);
        const done = await r.incidents.create(draft(a, { createdAt: '2026-10-01T09:00:00.000Z', status: 'closed' }), formatFolio);
        await r.incidents.create(draft(cmp()), formatFolio);
        expect((await r.incidents.list(a)).map((i) => i.id)[0]).toBe(late.incident.id);
        expect(await r.incidents.list(a)).toHaveLength(3);
        expect(await r.incidents.list(a, { driverId: 'drv_2' })).toHaveLength(1);
        expect(await r.incidents.list(a, { type: 'speeding', vehicleId: 'trc_9' })).toHaveLength(1);
        expect((await r.incidents.list(a, { openOnly: true })).map((i) => i.id)).not.toContain(done.incident.id);
        expect(await r.incidents.list(a, { status: 'closed' })).toHaveLength(1);
        expect(await r.incidents.list(a, { limit: 1 })).toHaveLength(1);
      });

      test('update con control optimista (ifStatus) y sin cruzar compañías', async () => {
        const a = cmp();
        const { incident } = await r.incidents.create(draft(a), formatFolio);
        expect(await r.incidents.update(cmp(), incident.id, { status: 'acknowledged' })).toBeNull();
        const ack = await r.incidents.update(a, incident.id, { status: 'acknowledged', acknowledgedAt: '2026-10-01T10:03:00.000Z' }, { ifStatus: 'open' });
        expect(ack).toMatchObject({ status: 'acknowledged', acknowledgedAt: '2026-10-01T10:03:00.000Z' });
        expect(await r.incidents.update(a, incident.id, { status: 'in_progress' }, { ifStatus: 'open' })).toBeNull();
        const cleared = await r.incidents.update(a, incident.id, { assigneeId: 'usr_1', resolvedAt: null });
        expect(cleared).toMatchObject({ assigneeId: 'usr_1', resolvedAt: null, status: 'acknowledged' });
      });

      test('evidencia: no se duplica (también en paralelo)', async () => {
        const a = cmp();
        const { incident } = await r.incidents.create(draft(a), formatFolio);
        await Promise.all([1, 2, 3].map(() => r.incidents.addEvidence(a, incident.id, 'ev_1', T0.toISOString())));
        await r.incidents.addEvidence(a, incident.id, 'ev_2', T0.toISOString());
        expect((await r.incidents.findById(a, incident.id))?.evidenceIds).toEqual(['ev_1', 'ev_2']);
        expect(await r.incidents.addEvidence(cmp(), incident.id, 'ev_3', T0.toISOString())).toBeNull();
      });

      test('comentarios en orden de alta y por compañía', async () => {
        const a = cmp();
        const { incident } = await r.incidents.create(draft(a), formatFolio);
        for (const body of ['uno', 'dos', 'tres']) {
          await r.incidents.addComment(a, {
            id: randomUUID(), incidentId: incident.id, authorId: null, kind: 'system', body, createdAt: T0.toISOString(),
          });
        }
        expect((await r.incidents.listComments(a, incident.id)).map((c) => c.body)).toEqual(['uno', 'dos', 'tres']);
        expect(await r.incidents.listComments(cmp(), incident.id)).toEqual([]);
      });

      test('escalamiento: candidatos vencidos y un solo ganador por nivel con reclamos simultáneos', async () => {
        const a = cmp();
        const { incident } = await r.incidents.create(draft(a), formatFolio);
        const { incident: acked } = await r.incidents.create(draft(a, { acknowledgedAt: T0.toISOString(), status: 'acknowledged' }), formatFolio);
        const { incident: closed } = await r.incidents.create(draft(a, { status: 'closed' }), formatFolio);
        const early = new Date(T0.getTime() + 10 * 60_000);
        const late = new Date(T0.getTime() + 16 * 60_000);
        expect((await r.incidents.listEscalationDue(early)).filter((i) => i.companyId === a)).toEqual([]);
        const due = (await r.incidents.listEscalationDue(late)).filter((i) => i.companyId === a).map((i) => i.id);
        expect(due).toEqual([incident.id]);
        expect(due).not.toContain(acked.id);
        expect(due).not.toContain(closed.id);

        const claims = await Promise.all([1, 2, 3, 4].map(() => r.incidents.claimEscalation(a, incident.id, 1, 'ack', late)));
        expect(claims.filter(Boolean)).toHaveLength(1);
        expect(claims.find(Boolean)?.escalationLevel).toBe(1);
        expect(await r.incidents.claimEscalation(a, incident.id, 1, 'ack', late)).toBeNull();
        // Resolución aún no vence → nivel 2 no se puede reclamar.
        expect(await r.incidents.claimEscalation(a, incident.id, 2, 'resolve', late)).toBeNull();
        // El acuse llegó: ya no escala por acuse.
        expect(await r.incidents.claimEscalation(a, acked.id, 1, 'ack', late)).toBeNull();
        const veryLate = new Date(T0.getTime() + 9 * 3_600_000);
        expect((await r.incidents.claimEscalation(a, incident.id, 2, 'resolve', veryLate))?.escalationLevel).toBe(2);
        expect((await r.incidents.listEscalationDue(veryLate)).map((i) => i.id)).not.toContain(incident.id);
        expect(await r.incidents.claimEscalation(cmp(), acked.id, 2, 'resolve', veryLate)).toBeNull();
      });
    });

    describe('reglas', () => {
      test('alta, edición, borrado y aislamiento', async () => {
        const a = cmp();
        const rule = await r.rules.save({
          id: randomUUID(), companyId: a, name: 'Robos', enabled: true, channels: ['whatsapp', 'push'], notifyRoles: ['admin'],
          trigger: { kind: 'incident_created', minUrgency: 'medium', types: ['theft_attempt'] }, createdAt: T0.toISOString(),
        });
        expect(await r.rules.findById(a, rule.id)).toEqual(rule);
        const edited = await r.rules.save({ ...rule, enabled: false, trigger: { kind: 'speeding', thresholdKph: 95 } });
        expect(edited).toMatchObject({ enabled: false, trigger: { kind: 'speeding', thresholdKph: 95 }, createdAt: rule.createdAt });
        expect(await r.rules.list(cmp())).toEqual([]);
        expect(await r.rules.findById(cmp(), rule.id)).toBeNull();
        await expect(r.rules.save({ ...rule, companyId: cmp() })).rejects.toThrow(/otra compañía/);
        expect(await r.rules.remove(cmp(), rule.id)).toBe(false);
        expect(await r.rules.remove(a, rule.id)).toBe(true);
        expect(await r.rules.list(a)).toEqual([]);
      });
    });

    describe('contactos', () => {
      test('upsert conserva lo no enviado, borra con null y aísla por compañía', async () => {
        const a = cmp();
        await r.contacts.upsert(a, { userId: 'u1', role: 'admin', pushToken: 'ExponentPushToken[a]', whatsapp: '+5215500000001' });
        await r.contacts.upsert(a, { userId: 'u2', role: 'driver', pushToken: 'ExponentPushToken[b]' });
        const merged = await r.contacts.upsert(a, { userId: 'u1', role: 'admin', pushToken: null });
        expect(merged).toEqual({ userId: 'u1', role: 'admin', pushToken: null, whatsapp: '+5215500000001' });
        expect((await r.contacts.findByRoles(a, ['admin', 'dispatcher'])).map((c) => c.userId)).toEqual(['u1']);
        expect(await r.contacts.findByUser(a, 'u2')).toEqual({ userId: 'u2', role: 'driver', pushToken: 'ExponentPushToken[b]', whatsapp: null });
        expect(await r.contacts.findByUser(cmp(), 'u1')).toBeNull();
        expect(await r.contacts.findByRoles(cmp(), ['admin'])).toEqual([]);
      });
    });

    describe('última señal (device_offline)', () => {
      test('solo guarda la más reciente; sin viaje deja de vigilar; reclamo único', async () => {
        const a = cmp();
        await r.signals.record(a, signal({ vehicleId: 'v1', recordedAt: '2026-10-01T10:05:00.000Z' }));
        await r.signals.record(a, signal({ vehicleId: 'v1', recordedAt: '2026-10-01T10:01:00.000Z' })); // vieja: se ignora
        await r.signals.record(a, signal({ vehicleId: 'v2' }));
        await r.signals.record(a, signal({ vehicleId: 'v2', tripId: null, recordedAt: '2026-10-01T10:06:00.000Z' }));
        const stale = (await r.signals.listStale(new Date('2026-10-01T11:00:00.000Z'))).filter((s) => s.companyId === a);
        expect(stale.map((s) => [s.signal.vehicleId, s.signal.recordedAt])).toEqual([['v1', '2026-10-01T10:05:00.000Z']]);
        expect(stale[0].signal).toMatchObject({ kind: 'position', tripId: 'trp_1', lat: 21, lng: -101, speedKph: 60 });
        expect(await r.signals.claim(a, 'v1', '2026-10-01T10:01:00.000Z')).toBe(false);
        const claims = await Promise.all([1, 2, 3].map(() => r.signals.claim(a, 'v1', '2026-10-01T10:05:00.000Z')));
        expect(claims.filter(Boolean)).toHaveLength(1);
        expect((await r.signals.listStale(new Date('2026-10-01T11:00:00.000Z'))).filter((s) => s.companyId === a)).toEqual([]);
      });
    });

    describe('servicio con varias instancias sobre los mismos repos', () => {
      const admin = (companyId: string): RequestCtx => ({ companyId, tier: 'pro', userId: 'usr_admin', role: 'admin' });
      const driver = (companyId: string): RequestCtx => ({ companyId, tier: 'pro', userId: 'usr_d', role: 'driver', driverId: 'drv_1' });

      function services(now: () => Date) {
        const push = new RecordingNotifier('push');
        const wa = new RecordingNotifier('whatsapp');
        const mkSvc = () =>
          new IncidentsService({ ...r, notifiers: [push, wa], bus: new RecordingEventBus(), now });
        return { a: mkSvc(), b: mkSvc(), push, wa };
      }

      test('dos barridos simultáneos no duplican el escalamiento ni las notificaciones', async () => {
        const c = cmp();
        let now = T0;
        const { a, b, push, wa } = services(() => now);
        await r.contacts.upsert(c, { userId: 'usr_admin', role: 'admin', pushToken: 'ExponentPushToken[a]', whatsapp: '+5215500000001' });
        const i = await a.report(driver(c), {
          clientUuid: 'cu', tripId: 'trp_1', driverId: 'drv_1', type: 'mechanical', urgency: 'high',
          description: 'x', occurredAt: T0.toISOString(), locationText: null, lat: null, lng: null,
        });
        now = new Date(T0.getTime() + 16 * 60_000);
        const [ra, rb] = await Promise.all([a.runEscalations(), b.runEscalations()]);
        // (El barrido es global: en Postgres también escala incidentes de otras pruebas.)
        expect(ra.escalated + rb.escalated).toBeGreaterThanOrEqual(1);
        expect(push.sent.filter((n) => n.incident.id === i.id)).toHaveLength(1);
        expect(wa.sent.filter((n) => n.incident.id === i.id)).toHaveLength(1);
        const { comments } = await a.get(admin(c), i.id);
        expect(comments.filter((x) => x.body.startsWith('Escalamiento nivel 1'))).toHaveLength(1);
      });

      test('device_offline: la señal es compartida y solo una instancia abre el incidente', async () => {
        const c = cmp();
        let now = T0;
        const { a, b } = services(() => now);
        await a.createRule(admin(c), {
          name: 'Sin señal 20 min', enabled: true, channels: ['push'], notifyRoles: ['dispatcher'],
          trigger: { kind: 'device_offline', minutes: 20 },
        });
        // La señal entra por la réplica A; el barrido corre en A y B a la vez.
        await a.ingestSignal(c, signal({ vehicleId: `trc_${c}` }));
        now = new Date(T0.getTime() + 25 * 60_000);
        const [ra, rb] = await Promise.all([a.runEscalations(), b.runEscalations()]);
        expect(ra.offline + rb.offline).toBeGreaterThanOrEqual(1);
        const open: IncidentDto[] = await b.list(admin(c), { status: 'open' });
        expect(open.map((i) => i.type)).toEqual(['device_offline']);
      });
    });
  });
}

contractSuite('memoria', describe, async () => ({
  repos: () => ({
    alerts: new InMemoryAlertRepo(),
    incidents: new InMemoryIncidentRepo(),
    rules: new InMemoryAlertRuleRepo(),
    contacts: new InMemoryContactDirectory(),
    signals: new InMemoryVehicleSignalRepo(),
  }),
  close: async () => undefined,
}));

contractSuite('postgres', describeIfDb, async () => {
  const db = (await createTestDb(path.join(__dirname, '..', 'migrations'), 'alerts'))!;
  const pool: Pool = db.pool;
  return {
    repos: () => ({
      alerts: new PgAlertRepo(pool),
      incidents: new PgIncidentRepo(pool),
      rules: new PgAlertRuleRepo(pool),
      contacts: new PgContactDirectory(pool),
      signals: new PgVehicleSignalRepo(pool),
    }),
    close: () => db.drop(),
  };
});

describeIfDb('restricciones de Postgres (alerts)', () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;
  beforeAll(async () => {
    db = await createTestDb(path.join(__dirname, '..', 'migrations'), 'alerts');
  });
  afterAll(async () => db?.drop());

  const insertRule = (trigger: unknown, channels = ['push']) =>
    db!.pool.query(
      `INSERT INTO alert_rules (id, company_id, name, enabled, trigger, channels, notify_roles, created_at, updated_at)
       VALUES ($1, 'cmp_x', 'r', true, $2::jsonb, $3, ARRAY['admin'], now(), now())`,
      [randomUUID(), JSON.stringify(trigger), channels],
    );

  test('el trigger jsonb se valida por variante', async () => {
    await expect(insertRule({ kind: 'speeding', thresholdKph: 95 })).resolves.toBeDefined();
    await expect(insertRule({ kind: 'device_offline', minutes: 30 })).resolves.toBeDefined();
    await expect(insertRule({ kind: 'speeding', thresholdKph: 0 })).rejects.toThrow(/alert_rules_trigger_ck/);
    await expect(insertRule({ kind: 'speeding', thresholdKph: 'rápido' })).rejects.toThrow(/alert_rules_trigger_ck/);
    await expect(insertRule({ kind: 'device_offline', minutes: 2 })).rejects.toThrow(/alert_rules_trigger_ck/);
    await expect(insertRule({ kind: 'sla_breach', stage: 'never' })).rejects.toThrow(/alert_rules_trigger_ck/);
    await expect(insertRule({ kind: 'incident_created', minUrgency: 'urgente' })).rejects.toThrow(/alert_rules_trigger_ck/);
    await expect(insertRule({ kind: 'otro' })).rejects.toThrow(/alert_rules_trigger_ck/);
    await expect(insertRule({ kind: 'sla_breach', stage: 'ack' }, ['sms'])).rejects.toThrow(/check/i);
  });

  test('estados y urgencias alineados al contrato', async () => {
    const repo = new PgIncidentRepo(db!.pool);
    await expect(repo.create(draft('cmp_x', { status: 'pending' as never }), formatFolio)).rejects.toThrow(/check/i);
    await expect(repo.create(draft('cmp_x', { urgency: 'urgent' as never }), formatFolio)).rejects.toThrow(/check/i);
    await expect(
      new PgContactDirectory(db!.pool).upsert('cmp_x', { userId: 'u', role: 'admin', whatsapp: '55 1234' }),
    ).rejects.toThrow(/check/i);
  });
});
