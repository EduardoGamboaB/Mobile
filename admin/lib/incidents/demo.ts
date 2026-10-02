/**
 * Centro de incidentes en modo demo: misma lógica de SLA y ciclo que el
 * backend, en memoria, para revisar la UI sin API.
 */
import type { IncidentsBackend, IncidentFilter, ManualIncidentInput } from './api';
import { DEFAULT_SLA, NEXT_STATUSES, TYPE_LABEL, byPriority, isDone, withSla } from './sla';
import type {
  AlertRuleDTO,
  AlertRuleInput,
  IncidentCommentDTO,
  IncidentDTO,
  IncidentStatus,
  IncidentType,
  IncidentUrgency,
} from './types';

/** Equipo de la torre de control (asignables). */
export const DEMO_TEAM = [
  { id: 'usr_disp_ana', name: 'Ana Ruiz · despacho' },
  { id: 'usr_disp_luis', name: 'Luis Ortega · despacho' },
  { id: 'usr_admin', name: 'Eduardo · dueño' },
];

let seq = 0;
const id = (p: string) => `${p}_${Date.now().toString(36)}_${(seq++).toString(36)}`;

export function createDemoIncidents(now: () => Date = () => new Date()): IncidentsBackend & {
  reset(): void;
} {
  let incidents: IncidentDTO[] = [];
  let comments: IncidentCommentDTO[] = [];
  let rules: AlertRuleDTO[] = [];

  const minutesAgo = (m: number) => new Date(now().getTime() - m * 60_000).toISOString();

  function make(
    type: IncidentType,
    urgency: IncidentUrgency,
    description: string,
    ageMin: number,
    extra: Partial<IncidentDTO> = {},
  ): IncidentDTO {
    const created = new Date(now().getTime() - ageMin * 60_000);
    const sla = DEFAULT_SLA[urgency];
    const n = incidents.length + 1;
    return {
      id: id('inc'),
      companyId: 'demo',
      folio: `INC-${created.getUTCFullYear()}-${String(n).padStart(5, '0')}`,
      clientUuid: null,
      source: type === 'sos' ? 'sos' : type === 'speeding' || type === 'device_offline' ? 'rule' : 'driver_report',
      type,
      urgency,
      status: 'open',
      title: TYPE_LABEL[type],
      description,
      tripId: null,
      driverId: null,
      vehicleId: null,
      assigneeId: null,
      occurredAt: created.toISOString(),
      locationText: null,
      lat: null,
      lng: null,
      evidenceIds: [],
      slaAckDueAt: new Date(created.getTime() + sla.ackMinutes * 60_000).toISOString(),
      slaResolveDueAt: new Date(created.getTime() + sla.resolveMinutes * 60_000).toISOString(),
      acknowledgedAt: null,
      resolvedAt: null,
      closedAt: null,
      escalationLevel: 0,
      createdAt: created.toISOString(),
      updatedAt: created.toISOString(),
      ...extra,
    };
  }

  function sys(i: IncidentDTO, body: string, at = now().toISOString()) {
    comments.push({ id: id('cmt'), incidentId: i.id, authorId: null, kind: 'system', body, createdAt: at });
  }

  function seed() {
    incidents = [];
    comments = [];
    const push = (i: IncidentDTO) => {
      incidents.push(i);
      sys(i, 'Incidente abierto', i.createdAt);
    };
    push(make('sos', 'critical', 'SOS activado por el operador', 7, {
      tripId: 't2', driverId: 'd3', vehicleId: 'U-201', locationText: 'Km 88 Mazatlán–Culiacán', lat: 23.9, lng: -106.9,
      escalationLevel: 1,
    }));
    push(make('mechanical', 'high', 'Ponchadura en eje trasero, ya se orilló', 25, {
      tripId: 't1', driverId: 'd1', vehicleId: 'U-104', locationText: 'Caseta Querétaro',
      acknowledgedAt: minutesAgo(20), status: 'in_progress', assigneeId: 'usr_disp_ana',
    }));
    push(make('speeding', 'high', '112 km/h (límite de la regla: 95 km/h)', 40, {
      tripId: 't1', driverId: 'd1', vehicleId: 'U-104', escalationLevel: 1,
    }));
    push(make('delay_loading', 'medium', 'Silo con 3 h de espera para cargar', 90, {
      tripId: 't3', driverId: 'd5', vehicleId: 'U-303', locationText: 'Silo Irapuato',
    }));
    push(make('checkpoint', 'low', 'Revisión de Guardia Nacional, todo en orden', 300, {
      tripId: 't2', driverId: 'd3', vehicleId: 'U-201',
      acknowledgedAt: minutesAgo(290), resolvedAt: minutesAgo(250), status: 'resolved', assigneeId: 'usr_disp_luis',
    }));
    rules = [
      {
        id: id('rule'), companyId: 'demo', name: 'Robo o accidente → dueño por WhatsApp', enabled: true,
        trigger: { kind: 'incident_created', minUrgency: 'high', types: ['theft_attempt', 'accident'] },
        channels: ['push', 'whatsapp'], notifyRoles: ['owner', 'admin'], createdAt: minutesAgo(10_000),
      },
      {
        id: id('rule'), companyId: 'demo', name: 'Velocidad > 95 km/h', enabled: true,
        trigger: { kind: 'speeding', thresholdKph: 95 }, channels: ['push'], notifyRoles: ['dispatcher'],
        createdAt: minutesAgo(10_000),
      },
      {
        id: id('rule'), companyId: 'demo', name: 'Acuse vencido → escalar', enabled: true,
        trigger: { kind: 'sla_breach', stage: 'ack' }, channels: ['push', 'whatsapp'], notifyRoles: ['owner', 'admin'],
        createdAt: minutesAgo(10_000),
      },
    ];
  }
  seed();

  const find = (incId: string) => {
    const i = incidents.find((x) => x.id === incId);
    if (!i) throw new Error('Incidente no encontrado');
    return i;
  };

  const patch = (i: IncidentDTO, p: Partial<IncidentDTO>) => {
    Object.assign(i, p, { updatedAt: now().toISOString() });
    return { ...i };
  };

  const transition = async (incId: string, next: IncidentStatus) => {
    const i = find(incId);
    if (!NEXT_STATUSES[i.status].includes(next)) throw new Error(`Transición inválida: ${i.status} → ${next}`);
    const at = now().toISOString();
    const p: Partial<IncidentDTO> = { status: next };
    if (!i.acknowledgedAt) p.acknowledgedAt = at;
    if (next === 'resolved') p.resolvedAt = at;
    if (next === 'closed') p.closedAt = at;
    if (next === 'in_progress' && i.status === 'resolved') p.resolvedAt = null;
    sys(i, `Estado: ${i.status} → ${next}`);
    return patch(i, p);
  };

  const filterList = (f: IncidentFilter = {}) =>
    incidents
      .filter((i) => !f.status || i.status === f.status)
      .filter((i) => !f.urgency || i.urgency === f.urgency)
      .filter((i) => !f.assigneeId || i.assigneeId === f.assigneeId)
      .map((i) => withSla(i, now()))
      .filter((i) => f.breached === undefined || (i.sla.ackBreached || i.sla.resolveBreached) === f.breached)
      .sort(byPriority);

  return {
    reset: seed,
    list: async (f) => filterList(f),
    summary: async () => {
      const open = filterList().filter((i) => !isDone(i));
      return {
        open: open.length,
        critical: open.filter((i) => i.urgency === 'critical').length,
        breached: open.filter((i) => i.sla.ackBreached || i.sla.resolveBreached).length,
        unassigned: open.filter((i) => !i.assigneeId).length,
      };
    },
    get: async (incId) => ({
      incident: withSla({ ...find(incId) }, now()),
      comments: comments.filter((c) => c.incidentId === incId).map((c) => ({ ...c })),
    }),
    createManual: async (input: ManualIncidentInput) => {
      if (!input.description.trim()) throw new Error('La descripción es obligatoria');
      const i = make(input.type, input.urgency, input.description.trim(), 0, {
        source: 'manual',
        tripId: input.tripId ?? null,
        vehicleId: input.vehicleId ?? null,
        locationText: input.locationText ?? null,
      });
      incidents.push(i);
      sys(i, 'Incidente abierto (captura manual)');
      return { ...i };
    },
    acknowledge: (incId) => transition(incId, 'acknowledged'),
    start: (incId) => transition(incId, 'in_progress'),
    resolve: async (incId, note) => {
      if (!note.trim()) throw new Error('Describe cómo se resolvió el incidente');
      const r = await transition(incId, 'resolved');
      comments.push({ id: id('cmt'), incidentId: incId, authorId: 'usr_admin', kind: 'comment', body: `Resolución: ${note.trim()}`, createdAt: now().toISOString() });
      return r;
    },
    close: (incId) => transition(incId, 'closed'),
    reopen: (incId) => transition(incId, 'in_progress'),
    assign: async (incId, assigneeId) => {
      const i = find(incId);
      sys(i, assigneeId ? `Asignado a ${DEMO_TEAM.find((t) => t.id === assigneeId)?.name ?? assigneeId}` : 'Sin asignar');
      return patch(i, { assigneeId });
    },
    comment: async (incId, body) => {
      find(incId);
      if (!body.trim()) throw new Error('El comentario está vacío');
      const c: IncidentCommentDTO = { id: id('cmt'), incidentId: incId, authorId: 'usr_admin', kind: 'comment', body: body.trim(), createdAt: now().toISOString() };
      comments.push(c);
      return { ...c };
    },
    listRules: async () => rules.map((r) => ({ ...r })),
    createRule: async (input: AlertRuleInput) => {
      if (!input.name.trim()) throw new Error('La regla necesita nombre');
      if (!input.channels.length) throw new Error('Elige al menos un canal');
      const r: AlertRuleDTO = { ...input, id: id('rule'), companyId: 'demo', createdAt: now().toISOString() };
      rules.push(r);
      return { ...r };
    },
    updateRule: async (ruleId, p) => {
      const r = rules.find((x) => x.id === ruleId);
      if (!r) throw new Error('Regla no encontrada');
      Object.assign(r, p);
      return { ...r };
    },
    deleteRule: async (ruleId) => {
      rules = rules.filter((r) => r.id !== ruleId);
    },
    updateMyContact: async (input) => input,
  };
}
