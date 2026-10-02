'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertI, ShieldI, ClockI, UserI, CheckI, MapPinI, PlusI, RefreshI, BellI, PhoneI, XI,
} from '@/components/Icons';
import {
  incidentsBackend as backend,
  DEMO_TEAM,
  NEXT_STATUSES,
  STATUS_LABEL,
  TYPE_LABEL,
  URGENCY_LABEL,
  describeTrigger,
  formatDue,
  isDone,
  type AlertRuleDTO,
  type AlertRuleTrigger,
  type IncidentDetail,
  type IncidentFilter,
  type IncidentStatus,
  type IncidentSummary,
  type IncidentType,
  type IncidentUrgency,
  type IncidentWithSlaDTO,
  type NotificationChannel,
} from '@/lib/incidents';

type Tab = 'queue' | 'rules';

const URGENCY_TONE: Record<IncidentUrgency, string> = { critical: 'red', high: 'amber', medium: 'blue', low: 'gray' };
const STATUS_TONE: Record<IncidentStatus, string> = {
  open: 'red', acknowledged: 'amber', in_progress: 'blue', resolved: 'green', closed: 'gray',
};
const ACTION_LABEL: Record<IncidentStatus, string> = {
  open: 'Abrir', acknowledged: 'Acusar recibo', in_progress: 'Atender', resolved: 'Resolver', closed: 'Cerrar',
};
const SOURCE_LABEL = { driver_report: 'Reporte del operador', sos: 'Botón SOS', rule: 'Regla automática', manual: 'Captura manual' };

export default function IncidentsPage() {
  const [tab, setTab] = useState<Tab>('queue');
  const [filter, setFilter] = useState<IncidentFilter>({});
  const [onlyPending, setOnlyPending] = useState(true);
  const [items, setItems] = useState<IncidentWithSlaDTO[]>([]);
  const [summary, setSummary] = useState<IncidentSummary | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<IncidentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [list, s] = await Promise.all([backend.list(filter), backend.summary()]);
      setItems(list);
      setSummary(s);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [filter]);

  const loadDetail = useCallback(async (id: string | null) => {
    if (!id) return setDetail(null);
    try {
      setDetail(await backend.get(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => { void loadDetail(selected); }, [selected, loadDetail]);
  // El SLA corre: refresca cada 30 s.
  useEffect(() => {
    const t = setInterval(() => { void reload(); void loadDetail(selected); }, 30_000);
    return () => clearInterval(t);
  }, [reload, loadDetail, selected]);

  const visible = useMemo(() => (onlyPending ? items.filter((i) => !isDone(i)) : items), [items, onlyPending]);

  useEffect(() => {
    if (!selected && visible.length) setSelected(visible[0].id);
  }, [visible, selected]);

  /** Ejecuta una acción y refresca lista + detalle. */
  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setError(null);
      await reload();
      await loadDetail(selected);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <>
      <div className="row-between" style={{ marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <span className="eyebrow">TORRE DE CONTROL · SLA</span>
          <h1 className="h1">Centro de incidentes</h1>
          <p className="small muted" style={{ marginTop: 4 }}>
            Reportes de G3 Drive, botón SOS y reglas sobre la telemetría — asignación, SLA y escalamiento por push y WhatsApp.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className={`btn sm ${tab === 'queue' ? 'primary' : 'outline'}`} onClick={() => setTab('queue')}>Incidentes</button>
          <button className={`btn sm ${tab === 'rules' ? 'primary' : 'outline'}`} onClick={() => setTab('rules')}>Reglas y canales</button>
        </div>
      </div>

      {error ? <div className="banner danger" style={{ marginBottom: 16 }}>{error}</div> : null}

      {tab === 'rules' ? (
        <RulesPanel onError={setError} />
      ) : (
        <>
          <div className="grid-4" style={{ marginBottom: 24 }}>
            <Kpi icon={<AlertI size={20} color="var(--danger)" />} label="ABIERTOS" value={summary?.open} tone="red" />
            <Kpi icon={<ShieldI size={20} color="var(--danger)" />} label="CRÍTICOS" value={summary?.critical} tone="red" />
            <Kpi icon={<ClockI size={20} color="var(--warning)" />} label="SLA VENCIDO" value={summary?.breached} tone="amber" />
            <Kpi icon={<UserI size={20} color="var(--blue)" />} label="SIN ASIGNAR" value={summary?.unassigned} tone="blue" />
          </div>

          <div className="row" style={{ gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            <Pill active={!filter.urgency && filter.breached === undefined} onClick={() => setFilter({})}>Todos</Pill>
            <Pill active={filter.urgency === 'critical'} onClick={() => setFilter({ urgency: 'critical' })}>Críticos</Pill>
            <Pill active={filter.breached === true} onClick={() => setFilter({ breached: true })}>SLA vencido</Pill>
            <Pill active={onlyPending} onClick={() => setOnlyPending((v) => !v)}>
              {onlyPending ? 'Solo pendientes' : 'Incluye resueltos'}
            </Pill>
            <span className="spacer" />
            <button className="btn outline sm" onClick={() => void reload()}><RefreshI size={14} /> Actualizar</button>
            <button className="btn accent sm" onClick={() => setCreating(true)}><PlusI size={14} /> Nuevo incidente</button>
          </div>

          {creating ? (
            <NewIncidentForm
              onCancel={() => setCreating(false)}
              onCreate={(input) =>
                act(async () => {
                  const i = await backend.createManual(input);
                  setCreating(false);
                  setSelected(i.id);
                })
              }
            />
          ) : null}

          <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 7fr)', gap: 20, alignItems: 'start' }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {visible.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center' }} className="small muted">Sin incidentes para este filtro.</div>
              ) : (
                visible.map((i) => (
                  <IncidentRow key={i.id} i={i} active={i.id === selected} onClick={() => setSelected(i.id)} />
                ))
              )}
            </div>

            <div>
              {detail ? (
                <IncidentPanel detail={detail} act={act} />
              ) : (
                <div className="card small muted">Selecciona un incidente.</div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function IncidentRow({ i, active, onClick }: { i: IncidentWithSlaDTO; active: boolean; onClick: () => void }) {
  const breached = !isDone(i) && (i.sla.ackBreached || i.sla.resolveBreached);
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px',
        border: 0, borderBottom: '1px solid var(--border)', cursor: 'pointer',
        background: active ? 'var(--surface-2)' : 'transparent',
        borderLeft: `3px solid ${i.urgency === 'critical' ? 'var(--danger)' : i.urgency === 'high' ? 'var(--warning)' : 'transparent'}`,
      }}
    >
      <div className="row-between" style={{ gap: 8 }}>
        <strong style={{ fontSize: 14 }}>{i.title}</strong>
        <span className={`chip ${STATUS_TONE[i.status]}`}>{STATUS_LABEL[i.status]}</span>
      </div>
      <div className="caption" style={{ marginTop: 4 }}>
        {i.folio} · {i.vehicleId ?? 'sin unidad'} · {new Date(i.occurredAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
        <span className={`chip ${URGENCY_TONE[i.urgency]}`}>{URGENCY_LABEL[i.urgency]}</span>
        {!isDone(i) ? (
          <span className={`chip ${breached ? 'red' : 'gray'}`}>
            <ClockI size={12} /> {formatDue(i.sla.minutesToNextDue)}
          </span>
        ) : null}
        {i.escalationLevel > 0 ? <span className="chip red">Escalado N{i.escalationLevel}</span> : null}
        {!i.assigneeId && !isDone(i) ? <span className="chip amber">Sin asignar</span> : null}
      </div>
    </button>
  );
}

function IncidentPanel({ detail, act }: { detail: IncidentDetail; act: (fn: () => Promise<unknown>) => Promise<void> }) {
  const { incident: i, comments } = detail;
  const [note, setNote] = useState('');
  const [comment, setComment] = useState('');
  const next = NEXT_STATUSES[i.status];

  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
        <div className="row-between" style={{ gap: 12, alignItems: 'flex-start' }}>
          <div>
            <span className="eyebrow">{i.folio} · {SOURCE_LABEL[i.source]}</span>
            <h2 className="h2" style={{ marginTop: 4 }}>{i.title}</h2>
            <p className="body" style={{ marginTop: 6 }}>{i.description}</p>
          </div>
          <span className={`chip ${URGENCY_TONE[i.urgency]}`}>{URGENCY_LABEL[i.urgency]}</span>
        </div>

        <div className="grid-3" style={{ marginTop: 16, gap: 12 }}>
          <Fact label="Estado" value={STATUS_LABEL[i.status]} />
          <Fact
            label="SLA acuse"
            value={i.acknowledgedAt ? (i.sla.ackBreached ? 'Acusado fuera de tiempo' : 'Acusado a tiempo') : formatDue(i.sla.minutesToNextDue)}
            danger={i.sla.ackBreached}
          />
          <Fact
            label="SLA resolución"
            value={i.resolvedAt ? (i.sla.resolveBreached ? 'Resuelto fuera de tiempo' : 'Resuelto a tiempo') : new Date(i.slaResolveDueAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
            danger={i.sla.resolveBreached}
          />
          <Fact label="Viaje" value={i.tripId ? <Link href={`/trips/${i.tripId}/`} style={{ color: 'var(--blue)' }}>{i.tripId}</Link> : '—'} />
          <Fact label="Unidad" value={i.vehicleId ?? '—'} />
          <Fact
            label="Ubicación"
            value={
              i.lat != null && i.lng != null ? (
                <a href={`https://maps.google.com/?q=${i.lat},${i.lng}`} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>
                  <MapPinI size={12} /> {i.locationText ?? `${i.lat.toFixed(4)}, ${i.lng.toFixed(4)}`}
                </a>
              ) : (i.locationText ?? '—')
            }
          />
        </div>
      </div>

      <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
        <label className="label" htmlFor="assignee">Responsable</label>
        <select
          id="assignee"
          className="input"
          style={{ width: '100%', height: 40 }}
          value={i.assigneeId ?? ''}
          disabled={i.status === 'closed'}
          onChange={(e) => void act(() => backend.assign(i.id, e.target.value || null))}
        >
          <option value="">— Sin asignar —</option>
          {DEMO_TEAM.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          {i.assigneeId && !DEMO_TEAM.some((t) => t.id === i.assigneeId) ? <option value={i.assigneeId}>{i.assigneeId}</option> : null}
        </select>

        <div className="row" style={{ gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {next.filter((s) => s !== 'resolved').map((s) => (
            <button
              key={s}
              className={`btn sm ${s === 'acknowledged' ? 'primary' : 'outline'}`}
              onClick={() => void act(() => (s === 'acknowledged' ? backend.acknowledge(i.id) : s === 'in_progress' ? (i.status === 'resolved' ? backend.reopen(i.id) : backend.start(i.id)) : backend.close(i.id)))}
            >
              {i.status === 'resolved' && s === 'in_progress' ? 'Reabrir' : ACTION_LABEL[s]}
            </button>
          ))}
        </div>

        {next.includes('resolved') ? (
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <input
              className="input"
              style={{ flex: 1, height: 40 }}
              placeholder="¿Cómo se resolvió? (obligatorio)"
              aria-label="Nota de resolución"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button
              className="btn accent sm"
              disabled={!note.trim()}
              onClick={() => void act(async () => { await backend.resolve(i.id, note); setNote(''); })}
            >
              <CheckI size={14} /> Resolver
            </button>
          </div>
        ) : null}
      </div>

      <div style={{ padding: 20 }}>
        <div className="row-between" style={{ marginBottom: 10 }}>
          <h3 className="h3">Bitácora</h3>
          <span className="caption">{i.evidenceIds.length} evidencia(s) ligada(s)</span>
        </div>
        <div className="stack" style={{ maxHeight: 320, overflowY: 'auto' }}>
          {comments.slice().reverse().map((c) => (
            <div key={c.id} className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
              <span className={`icon-tile sm ${c.kind === 'system' ? 'navy' : 'blue'}`}>
                {c.kind === 'system' ? <BellI size={14} /> : <UserI size={14} />}
              </span>
              <div style={{ flex: 1 }}>
                <div className={c.kind === 'system' ? 'small muted' : 'small'}>{c.body}</div>
                <div className="caption">{new Date(c.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="row" style={{ gap: 8, marginTop: 14 }}>
          <input
            className="input"
            style={{ flex: 1, height: 40 }}
            placeholder="Agregar comentario para el equipo…"
            aria-label="Comentario"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && comment.trim()) void act(async () => { await backend.comment(i.id, comment); setComment(''); });
            }}
          />
          <button
            className="btn outline sm"
            disabled={!comment.trim()}
            onClick={() => void act(async () => { await backend.comment(i.id, comment); setComment(''); })}
          >
            Comentar
          </button>
        </div>
      </div>
    </div>
  );
}

function NewIncidentForm({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (input: { type: IncidentType; urgency: IncidentUrgency; description: string; vehicleId?: string; tripId?: string }) => void;
}) {
  const [type, setType] = useState<IncidentType>('mechanical');
  const [urgency, setUrgency] = useState<IncidentUrgency>('medium');
  const [description, setDescription] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [tripId, setTripId] = useState('');
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="row-between" style={{ marginBottom: 12 }}>
        <h3 className="h3">Nuevo incidente</h3>
        <button className="btn ghost sm" onClick={onCancel} aria-label="Cancelar"><XI size={14} /></button>
      </div>
      <div className="grid-4" style={{ gap: 12 }}>
        <Select label="Tipo" value={type} onChange={(v) => setType(v as IncidentType)}
          options={(Object.keys(TYPE_LABEL) as IncidentType[]).filter((t) => t !== 'sos').map((t) => [t, TYPE_LABEL[t]])} />
        <Select label="Urgencia" value={urgency} onChange={(v) => setUrgency(v as IncidentUrgency)}
          options={(Object.keys(URGENCY_LABEL) as IncidentUrgency[]).map((u) => [u, URGENCY_LABEL[u]])} />
        <TextField label="Unidad" value={vehicleId} onChange={setVehicleId} placeholder="U-104" />
        <TextField label="Viaje" value={tripId} onChange={setTripId} placeholder="id del viaje" />
      </div>
      <TextField label="Descripción" value={description} onChange={setDescription} placeholder="Qué pasó y qué se necesita" />
      <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
        <button
          className="btn primary sm"
          disabled={!description.trim()}
          onClick={() => onCreate({ type, urgency, description, vehicleId: vehicleId || undefined, tripId: tripId || undefined })}
        >
          Crear incidente
        </button>
      </div>
    </div>
  );
}

const ROLE_LABEL: Record<string, string> = { owner: 'Dueño', admin: 'Admin', dispatcher: 'Despacho' };

function RulesPanel({ onError }: { onError: (e: string | null) => void }) {
  const [rules, setRules] = useState<AlertRuleDTO[]>([]);
  const [whatsapp, setWhatsapp] = useState('');
  const [saved, setSaved] = useState(false);
  const [kind, setKind] = useState<AlertRuleTrigger['kind']>('incident_created');
  const [name, setName] = useState('');
  const [minUrgency, setMinUrgency] = useState<IncidentUrgency>('high');
  const [stage, setStage] = useState<'ack' | 'resolve'>('ack');
  const [threshold, setThreshold] = useState('95');
  const [minutes, setMinutes] = useState('20');
  const [channels, setChannels] = useState<NotificationChannel[]>(['push']);
  const [roles, setRoles] = useState<string[]>(['dispatcher']);

  const load = useCallback(async () => {
    try { setRules(await backend.listRules()); } catch (e) { onError(e instanceof Error ? e.message : String(e)); }
  }, [onError]);
  useEffect(() => { void load(); }, [load]);

  const run = async (fn: () => Promise<unknown>) => {
    try { await fn(); onError(null); await load(); } catch (e) { onError(e instanceof Error ? e.message : String(e)); }
  };

  const trigger = (): AlertRuleTrigger => {
    switch (kind) {
      case 'incident_created': return { kind, minUrgency };
      case 'sla_breach': return { kind, stage };
      case 'speeding': return { kind, thresholdKph: Number(threshold) };
      case 'device_offline': return { kind, minutes: Number(minutes) };
    }
  };

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 7fr) minmax(0, 5fr)', gap: 20, alignItems: 'start' }}>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <span className="eyebrow">REGLAS DE ALERTA ({rules.length})</span>
        </div>
        {rules.map((r) => (
          <div key={r.id} className="row-between" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <strong>{r.name}</strong>
              <div className="caption" style={{ marginTop: 2 }}>{describeTrigger(r.trigger)}</div>
              <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {r.channels.map((c) => <span key={c} className="chip blue">{c === 'push' ? 'Push' : 'WhatsApp'}</span>)}
                {r.notifyRoles.map((x) => <span key={x} className="chip gray">{ROLE_LABEL[x] ?? x}</span>)}
              </div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button
                className={`toggle ${r.enabled ? 'on' : ''}`}
                aria-label={r.enabled ? 'Desactivar regla' : 'Activar regla'}
                onClick={() => void run(() => backend.updateRule(r.id, { enabled: !r.enabled }))}
              >
                <span className="knob" />
              </button>
              <button className="btn ghost sm" aria-label="Eliminar regla" onClick={() => void run(() => backend.deleteRule(r.id))}><XI size={14} /></button>
            </div>
          </div>
        ))}
        {rules.length === 0 ? <div style={{ padding: 24 }} className="small muted">Sin reglas. Sin reglas, el SOS y los SLA vencidos avisan a dueño, admin y despacho.</div> : null}
      </div>

      <div className="stack-lg">
        <div className="card">
          <h3 className="h3" style={{ marginBottom: 12 }}>Nueva regla</h3>
          <TextField label="Nombre" value={name} onChange={setName} placeholder="p.ej. Velocidad en sierra" />
          <Select
            label="Cuándo"
            value={kind}
            onChange={(v) => setKind(v as AlertRuleTrigger['kind'])}
            options={[
              ['incident_created', 'Se abre un incidente'],
              ['sla_breach', 'Vence un SLA'],
              ['speeding', 'Exceso de velocidad (telemetría)'],
              ['device_offline', 'GPS sin señal en viaje'],
            ]}
          />
          {kind === 'incident_created' ? (
            <Select label="Urgencia mínima" value={minUrgency} onChange={(v) => setMinUrgency(v as IncidentUrgency)}
              options={(Object.keys(URGENCY_LABEL) as IncidentUrgency[]).map((u) => [u, URGENCY_LABEL[u]])} />
          ) : null}
          {kind === 'sla_breach' ? (
            <Select label="SLA" value={stage} onChange={(v) => setStage(v as 'ack' | 'resolve')}
              options={[['ack', 'Acuse'], ['resolve', 'Resolución']]} />
          ) : null}
          {kind === 'speeding' ? <TextField label="Límite (km/h)" value={threshold} onChange={setThreshold} /> : null}
          {kind === 'device_offline' ? <TextField label="Minutos sin señal" value={minutes} onChange={setMinutes} /> : null}

          <span className="label">Canales</span>
          <div className="row" style={{ gap: 6, marginBottom: 12 }}>
            {(['push', 'whatsapp'] as NotificationChannel[]).map((c) => (
              <Pill key={c} active={channels.includes(c)} onClick={() => setChannels((l) => toggle(l, c))}>{c === 'push' ? 'Push' : 'WhatsApp'}</Pill>
            ))}
          </div>
          <span className="label">Avisar a</span>
          <div className="row" style={{ gap: 6, marginBottom: 16 }}>
            {Object.entries(ROLE_LABEL).map(([k, v]) => (
              <Pill key={k} active={roles.includes(k)} onClick={() => setRoles((l) => toggle(l, k))}>{v}</Pill>
            ))}
          </div>
          <button
            className="btn primary sm"
            disabled={!name.trim() || !channels.length || !roles.length}
            onClick={() =>
              void run(async () => {
                await backend.createRule({ name: name.trim(), enabled: true, trigger: trigger(), channels, notifyRoles: roles });
                setName('');
              })
            }
          >
            <PlusI size={14} /> Agregar regla
          </button>
        </div>

        <div className="card">
          <div className="row" style={{ gap: 10, marginBottom: 8 }}>
            <span className="icon-tile sm green"><PhoneI size={16} /></span>
            <strong>Mi WhatsApp para escalamientos</strong>
          </div>
          <p className="small muted" style={{ marginBottom: 12 }}>
            Formato internacional (+52…). Los avisos llegan con la plantilla aprobada <code>g3_incidente</code>.
          </p>
          <div className="row" style={{ gap: 8 }}>
            <input className="input" style={{ flex: 1, height: 40 }} placeholder="+5215512345678" aria-label="WhatsApp" value={whatsapp} onChange={(e) => { setWhatsapp(e.target.value); setSaved(false); }} />
            <button className="btn outline sm" disabled={!whatsapp.trim()} onClick={() => void run(async () => { await backend.updateMyContact({ whatsapp: whatsapp.trim() }); setSaved(true); })}>
              Guardar
            </button>
          </div>
          {saved ? <div className="caption" style={{ marginTop: 8, color: 'var(--success)' }}>Guardado.</div> : null}
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number | undefined; tone: 'red' | 'amber' | 'blue' }) {
  return (
    <div className="kpi" style={value ? { borderColor: tone === 'red' ? 'var(--danger)' : tone === 'amber' ? 'var(--warning)' : 'var(--border)', borderLeftWidth: 3 } : {}}>
      <div className="row-between" style={{ marginBottom: 12 }}>
        <span className="label">{label}</span>
        <span className={`icon-tile sm ${tone}`}>{icon}</span>
      </div>
      <div className="value">{value ?? '—'}</div>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button className={`btn sm ${active ? 'primary' : 'outline'}`} onClick={onClick}>{children}</button>;
}

function Fact({ label, value, danger }: { label: string; value: React.ReactNode; danger?: boolean }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 2 }}>{label}</div>
      <div className="small" style={danger ? { color: 'var(--danger)', fontWeight: 700 } : {}}>{value}</div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      <input className="input" style={{ width: '100%', height: 40 }} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      <select className="input" style={{ width: '100%', height: 40 }} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}
