import { IncidentsService, type RequestCtx } from '../src/incidents/incidents.service';
import { InMemoryAlertRuleRepo, InMemoryIncidentRepo } from '../src/incidents/in-memory.incidents.repo';
import {
  ExpoPushNotifier,
  InMemoryContactDirectory,
  RecordingNotifier,
  WhatsAppCloudNotifier,
} from '../src/incidents/notifier';
import { RecordingEventBus } from '../src/event.bus';
import type { CreateIncidentDto, OperationalSignalDto } from '@g3/contracts';

const T0 = new Date('2026-10-01T10:00:00.000Z');

function build() {
  let now = new Date(T0);
  const push = new RecordingNotifier('push');
  const wa = new RecordingNotifier('whatsapp');
  const contacts = new InMemoryContactDirectory();
  const bus = new RecordingEventBus();
  const svc = new IncidentsService({
    incidents: new InMemoryIncidentRepo(),
    rules: new InMemoryAlertRuleRepo(),
    contacts,
    notifiers: [push, wa],
    bus,
    now: () => now,
  });
  const advance = (minutes: number) => {
    now = new Date(now.getTime() + minutes * 60_000);
  };
  return { svc, push, wa, contacts, bus, advance };
}

const admin: RequestCtx = { companyId: 'cmp_1', tier: 'pro', userId: 'usr_admin', role: 'admin' };
const dispatcher: RequestCtx = { companyId: 'cmp_1', tier: 'pro', userId: 'usr_disp', role: 'dispatcher' };
const driver = (id = 'drv_1'): RequestCtx => ({ companyId: 'cmp_1', tier: 'pro', userId: `usr_${id}`, role: 'driver', driverId: id });

const report = (over: Partial<CreateIncidentDto> = {}): CreateIncidentDto => ({
  clientUuid: 'cu_1',
  tripId: 'trp_1',
  driverId: 'drv_1',
  type: 'mechanical',
  urgency: 'high',
  description: 'Se calentó el motor en la subida',
  occurredAt: T0.toISOString(),
  locationText: 'Km 120 Qro–SLP',
  lat: 21.1,
  lng: -100.9,
  ...over,
});

async function seedContacts(contacts: InMemoryContactDirectory) {
  await contacts.upsert('cmp_1', { userId: 'usr_admin', role: 'admin', pushToken: 'ExponentPushToken[a]', whatsapp: '+5215500000001' });
  await contacts.upsert('cmp_1', { userId: 'usr_disp', role: 'dispatcher', pushToken: 'ExponentPushToken[d]', whatsapp: null });
}

describe('Alta de incidentes', () => {
  test('reporte del chofer: folio, SLA por urgencia, idempotente por clientUuid', async () => {
    const { svc } = build();
    const a = await svc.report(driver(), report());
    expect(a.folio).toBe('INC-2026-00001');
    expect(a.source).toBe('driver_report');
    expect(a.title).toBe('Falla mecánica');
    expect(a.slaAckDueAt).toBe('2026-10-01T10:15:00.000Z'); // high: 15 min
    expect(a.slaResolveDueAt).toBe('2026-10-01T18:00:00.000Z'); // high: 8 h
    const again = await svc.report(driver(), report());
    expect(again.id).toBe(a.id);
  });

  test('el driverId lo pone el JWT, no el body', async () => {
    const { svc } = build();
    const i = await svc.report(driver('drv_1'), report({ driverId: 'drv_otro' }));
    expect(i.driverId).toBe('drv_1');
  });

  test('valida tipo, urgencia y descripción', async () => {
    const { svc } = build();
    await expect(svc.report(driver(), report({ type: 'volcadura' as never }))).rejects.toThrow(/tipo/i);
    await expect(svc.report(driver(), report({ clientUuid: 'x', description: '  ' }))).rejects.toThrow(/descripci/i);
  });

  test('SOS: crítico, SLA de 5 min y avisa por push y WhatsApp aunque no haya reglas', async () => {
    const { svc, push, wa, contacts } = build();
    await seedContacts(contacts);
    const i = await svc.sos(driver(), {
      clientUuid: 'sos_1', tripId: 'trp_1', driverId: 'drv_1', lat: 21.1, lng: -100.9, occurredAt: T0.toISOString(),
    });
    expect(i.urgency).toBe('critical');
    expect(i.type).toBe('sos');
    expect(i.slaAckDueAt).toBe('2026-10-01T10:05:00.000Z');
    expect(push.sent.map((n) => n.to.userId).sort()).toEqual(['usr_admin', 'usr_disp']);
    expect(wa.sent.map((n) => n.to.userId)).toEqual(['usr_admin']); // el dispatcher no tiene WhatsApp registrado
  });

  test('regla incident_created filtra por urgencia mínima y tipo', async () => {
    const { svc, wa, contacts } = build();
    await seedContacts(contacts);
    await svc.createRule(admin, {
      name: 'Robos a WhatsApp', enabled: true, channels: ['whatsapp'], notifyRoles: ['admin'],
      trigger: { kind: 'incident_created', minUrgency: 'medium', types: ['theft_attempt'] },
    });
    await svc.report(driver(), report({ clientUuid: 'a', type: 'mechanical' }));
    expect(wa.sent).toHaveLength(0);
    await svc.report(driver(), report({ clientUuid: 'b', type: 'theft_attempt', urgency: 'low' }));
    expect(wa.sent).toHaveLength(0);
    await svc.report(driver(), report({ clientUuid: 'c', type: 'theft_attempt', urgency: 'critical' }));
    expect(wa.sent).toHaveLength(1);
  });
});

describe('Atención: asignación, estados, comentarios, evidencia', () => {
  test('ciclo open → acknowledged → in_progress → resolved → closed con bitácora de sistema', async () => {
    const { svc, advance } = build();
    const i = await svc.report(driver(), report());
    advance(3);
    const ack = await svc.acknowledge(dispatcher, i.id);
    expect(ack.acknowledgedAt).toBe('2026-10-01T10:03:00.000Z');
    await svc.start(dispatcher, i.id);
    await expect(svc.resolve(dispatcher, i.id, '')).rejects.toThrow(/resolvi/i);
    const res = await svc.resolve(dispatcher, i.id, 'Se mandó grúa y se cambió termostato');
    expect(res.resolvedAt).toBeTruthy();
    await svc.close(admin, i.id);
    const { incident, comments } = await svc.get(admin, i.id);
    expect(incident.status).toBe('closed');
    expect(incident.sla.ackBreached).toBe(false);
    expect(comments.some((c) => c.kind === 'comment' && c.body.startsWith('Resolución:'))).toBe(true);
    expect(comments.filter((c) => c.kind === 'system').length).toBeGreaterThanOrEqual(4);
  });

  test('transición inválida y reapertura', async () => {
    const { svc } = build();
    const i = await svc.report(driver(), report());
    await expect(svc.close(admin, i.id)).rejects.toThrow(/transici/i);
    await svc.resolve(admin, i.id, 'ok');
    const re = await svc.reopen(admin, i.id);
    expect(re.status).toBe('in_progress');
    expect(re.resolvedAt).toBeNull();
  });

  test('asignar avisa por push al asignado', async () => {
    const { svc, push, contacts } = build();
    await seedContacts(contacts);
    const i = await svc.report(driver(), report());
    const a = await svc.assign(admin, i.id, 'usr_disp');
    expect(a.assigneeId).toBe('usr_disp');
    expect(push.sent.at(-1)?.to.userId).toBe('usr_disp');
  });

  test('comentarios y evidencia ligada (sin duplicar)', async () => {
    const { svc } = build();
    const i = await svc.report(driver(), report());
    await svc.addComment(dispatcher, i.id, 'Llamé al operador, va a orillarse');
    await svc.attachEvidence(driver(), i.id, 'ev_1');
    const twice = await svc.attachEvidence(driver(), i.id, 'ev_1');
    expect(twice.evidenceIds).toEqual(['ev_1']);
  });

  test('permisos: el chofer no atiende ni lista; ve solo lo suyo', async () => {
    const { svc } = build();
    const mine = await svc.report(driver('drv_1'), report());
    await svc.report(driver('drv_2'), report({ clientUuid: 'otro', driverId: 'drv_2' }));
    await expect(svc.acknowledge(driver(), mine.id)).rejects.toThrow(/permiso/i);
    await expect(svc.list(driver())).rejects.toThrow(/permiso/i);
    expect((await svc.mine(driver('drv_1'))).map((i) => i.id)).toEqual([mine.id]);
    await expect(svc.get(driver('drv_2'), mine.id)).rejects.toThrow(/no encontrado/i);
  });

  test('multi-tenant: otra compañía no ve el incidente', async () => {
    const { svc } = build();
    const i = await svc.report(driver(), report());
    await expect(svc.get({ ...admin, companyId: 'cmp_2' }, i.id)).rejects.toThrow(/no encontrado/i);
  });
});

describe('SLA y escalamiento', () => {
  test('sin acuse a tiempo → nivel 1; sin resolver → nivel 2; cada nivel una sola vez', async () => {
    const { svc, push, wa, contacts, advance } = build();
    await seedContacts(contacts);
    const i = await svc.report(driver(), report({ urgency: 'high' }));
    advance(10);
    expect((await svc.runEscalations()).escalated).toBe(0);
    advance(6); // 16 min > 15 min de acuse
    expect((await svc.runEscalations()).escalated).toBe(1);
    expect((await svc.runEscalations()).escalated).toBe(0);
    expect(wa.sent.length).toBe(1); // alta urgencia → también WhatsApp
    const listed = (await svc.list(admin))[0];
    expect(listed.sla.ackBreached).toBe(true);
    expect(listed.escalationLevel).toBe(1);

    await svc.acknowledge(dispatcher, i.id);
    advance(8 * 60);
    expect((await svc.runEscalations()).escalated).toBe(1);
    expect((await svc.get(admin, i.id)).incident.escalationLevel).toBe(2);
    expect(push.sent.length).toBeGreaterThanOrEqual(4);
  });

  test('regla sla_breach define canales y roles del escalamiento', async () => {
    const { svc, push, wa, contacts, advance } = build();
    await seedContacts(contacts);
    await svc.createRule(admin, {
      name: 'Acuse vencido al dueño', enabled: true, channels: ['whatsapp'], notifyRoles: ['admin'],
      trigger: { kind: 'sla_breach', stage: 'ack' },
    });
    await svc.report(driver(), report({ urgency: 'low' }));
    advance(4 * 60 + 1);
    await svc.runEscalations();
    expect(wa.sent.map((n) => n.to.userId)).toEqual(['usr_admin']);
    expect(push.sent).toHaveLength(0);
  });

  test('la lista prioriza vencidos y críticos', async () => {
    const { svc, advance } = build();
    await svc.report(driver(), report({ clientUuid: 'low', urgency: 'low' }));
    await svc.report(driver(), report({ clientUuid: 'crit', urgency: 'critical' }));
    advance(6); // vence el acuse del crítico (5 min)
    const [first] = await svc.list(admin);
    expect(first.urgency).toBe('critical');
    expect(first.sla.ackBreached).toBe(true);
    expect(await svc.summary(admin)).toEqual({ open: 2, critical: 1, breached: 1, unassigned: 2 });
  });
});

describe('Reglas sobre telemetría', () => {
  const sig = (over: Partial<OperationalSignalDto> = {}): OperationalSignalDto => ({
    kind: 'position', vehicleId: 'trc_1', tripId: 'trp_1', driverId: 'drv_1',
    speedKph: 80, lat: 21, lng: -101, recordedAt: T0.toISOString(), ...over,
  });

  test('exceso de velocidad abre incidente una vez cada 30 min por unidad', async () => {
    const { svc, contacts, push } = build();
    await seedContacts(contacts);
    await svc.createRule(admin, {
      name: 'Velocidad > 95', enabled: true, channels: ['push'], notifyRoles: ['dispatcher'],
      trigger: { kind: 'speeding', thresholdKph: 95 },
    });
    expect(await svc.ingestSignal('cmp_1', sig({ speedKph: 90 }))).toBeNull();
    const inc = await svc.ingestSignal('cmp_1', sig({ speedKph: 112 }));
    expect(inc?.type).toBe('speeding');
    expect(inc?.vehicleId).toBe('trc_1');
    expect(inc?.source).toBe('rule');
    expect(push.sent.some((n) => n.to.userId === 'usr_disp')).toBe(true);
    expect(await svc.ingestSignal('cmp_1', sig({ speedKph: 120, recordedAt: '2026-10-01T10:10:00.000Z' }))).toBeNull();
    expect(await svc.ingestSignal('cmp_1', sig({ speedKph: 120, recordedAt: '2026-10-01T10:45:00.000Z' }))).not.toBeNull();
  });

  test('GPS sin señal en viaje activo abre incidente device_offline', async () => {
    const { svc, advance } = build();
    await svc.createRule(admin, {
      name: 'Sin señal 20 min', enabled: true, channels: ['push'], notifyRoles: ['dispatcher'],
      trigger: { kind: 'device_offline', minutes: 20 },
    });
    await svc.ingestSignal('cmp_1', sig({ speedKph: 60 }));
    advance(15);
    expect((await svc.runEscalations()).offline).toBe(0);
    advance(10);
    expect((await svc.runEscalations()).offline).toBe(1);
    const [i] = await svc.list(admin, { status: 'open' });
    expect(i.type).toBe('device_offline');
  });

  test('valida reglas', async () => {
    const { svc } = build();
    await expect(
      svc.createRule(admin, { name: 'x', enabled: true, channels: ['sms' as never], notifyRoles: ['admin'], trigger: { kind: 'sla_breach', stage: 'ack' } }),
    ).rejects.toThrow(/canales/i);
    await expect(
      svc.createRule(admin, { name: 'x', enabled: true, channels: ['push'], notifyRoles: ['admin'], trigger: { kind: 'speeding', thresholdKph: 0 } }),
    ).rejects.toThrow(/umbral/i);
    await expect(
      svc.createRule(driver(), { name: 'x', enabled: true, channels: ['push'], notifyRoles: ['admin'], trigger: { kind: 'sla_breach', stage: 'ack' } }),
    ).rejects.toThrow(/permiso/i);
  });

  test('contacto propio: WhatsApp en E.164', async () => {
    const { svc } = build();
    await expect(svc.upsertMyContact(admin, { whatsapp: '55 1234' })).rejects.toThrow(/E\.164/);
    expect(await svc.upsertMyContact(admin, { whatsapp: '+5215512345678' })).toMatchObject({ userId: 'usr_admin', role: 'admin' });
  });
});

describe('Canales reales: forma de los requests', () => {
  const incident = {
    id: 'inc_1', companyId: 'cmp_1', folio: 'INC-2026-00007', clientUuid: null, source: 'sos' as const,
    type: 'sos' as const, urgency: 'critical' as const, status: 'open' as const, title: 'SOS del operador',
    description: 'SOS activado por el operador', tripId: 'trp_1', driverId: 'drv_1', vehicleId: null,
    assigneeId: null, occurredAt: T0.toISOString(), locationText: null, lat: 21, lng: -101, evidenceIds: [],
    slaAckDueAt: T0.toISOString(), slaResolveDueAt: T0.toISOString(), acknowledgedAt: null, resolvedAt: null,
    closedAt: null, escalationLevel: 0, createdAt: T0.toISOString(), updatedAt: T0.toISOString(),
  };

  test('Expo push: prioridad alta y datos del incidente', async () => {
    const calls: { url: string; body: string }[] = [];
    const n = new ExpoPushNotifier(async (url, init) => {
      calls.push({ url, body: init.body });
      return { ok: true, status: 200, text: async () => '' };
    });
    const r = await n.send({ channel: 'push', to: { userId: 'u', role: 'admin', pushToken: 'ExponentPushToken[x]' }, incident, reason: 'SOS' });
    expect(r.ok).toBe(true);
    expect(calls[0].url).toContain('exp.host');
    expect(JSON.parse(calls[0].body)).toMatchObject({ to: 'ExponentPushToken[x]', priority: 'high', data: { incidentId: 'inc_1' } });
    expect((await n.send({ channel: 'push', to: { userId: 'u', role: 'admin' }, incident, reason: 'x' })).ok).toBe(false);
  });

  test('WhatsApp Cloud API: plantilla con folio, título, urgencia y motivo', async () => {
    const calls: { url: string; headers: Record<string, string>; body: string }[] = [];
    const n = new WhatsAppCloudNotifier(
      async (url, init) => {
        calls.push({ url, headers: init.headers, body: init.body });
        return { ok: false, status: 401, text: async () => 'bad token' };
      },
      { phoneNumberId: '123456', accessToken: 'tok' },
    );
    const r = await n.send({ channel: 'whatsapp', to: { userId: 'u', role: 'admin', whatsapp: '+5215500000001' }, incident, reason: 'SOS activado' });
    expect(r).toMatchObject({ ok: false, error: 'HTTP 401' });
    expect(calls[0].url).toBe('https://graph.facebook.com/v20.0/123456/messages');
    expect(calls[0].headers.authorization).toBe('Bearer tok');
    const body = JSON.parse(calls[0].body);
    expect(body).toMatchObject({ messaging_product: 'whatsapp', to: '5215500000001', type: 'template' });
    expect(body.template.components[0].parameters.map((p: { text: string }) => p.text)).toEqual([
      'INC-2026-00007', 'SOS del operador', 'CRÍTICA', 'SOS activado',
    ]);
  });
});
