'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  alerts as initialAlerts, tractors, trailers, drivers, trips, kpis,
} from '@/lib/demoData';
import type { Alert, AlertSeverity, AlertSource } from '@/lib/demoData';
import {
  AlertI, ShieldI, TruckI, PackageI, UserI, FileI, BellI, CheckI,
  ClockI, MapPinI, SparklesI, RefreshI,
} from '@/components/Icons';

const fmt = (n: number) => '$' + n.toLocaleString('es-MX', { maximumFractionDigits: 0 });

export default function MonitorPage() {
  const [filter, setFilter] = useState<'all' | AlertSeverity>('all');
  const [ackd, setAckd] = useState<Record<string, boolean>>({});
  const list = useMemo(() => {
    return initialAlerts
      .filter((a) => filter === 'all' || a.severity === filter)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [filter]);

  const k = kpis();
  const open = initialAlerts.filter((a) => !a.acknowledged && !ackd[a.id]).length;
  const crit = initialAlerts.filter((a) => a.severity === 'critical' && !a.acknowledged && !ackd[a.id]).length;

  // unidades en movimiento (con trip activo)
  const liveUnits = trips
    .filter((t) => ['loading', 'in_transit', 'unloading'].includes(t.status))
    .map((t) => ({
      trip: t,
      tractor: tractors.find((tr) => tr.id === t.tractorId),
      driver: drivers.find((d) => d.id === t.driverId),
    }));

  return (
    <>
      <div className="row-between" style={{ marginBottom: 24 }}>
        <div>
          <div className="row" style={{ gap: 8 }}>
            <span className="eyebrow">CENTRO DE OPERACIONES · TIEMPO REAL</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11, fontWeight: 700, color: 'var(--success)',
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--success)', boxShadow: '0 0 0 0 rgba(22,163,74,0.5)',
                animation: 'pulse 1.5s ease-out infinite',
              }} />
              LIVE
            </span>
          </div>
          <h1 className="h1">Monitoreo y alertamiento</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn outline sm"><RefreshI size={14} /> Actualizar</button>
          <button className="btn primary sm">Configurar reglas</button>
        </div>
      </div>

      {/* KPIs de monitoreo */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <MonitorKpi icon={<AlertI size={20} color="var(--danger)" />} label="ALERTAS ABIERTAS" value={String(open)} tone="red" />
        <MonitorKpi icon={<ShieldI size={20} color="var(--warning)" />} label="CRÍTICAS" value={String(crit)} tone="amber" />
        <MonitorKpi icon={<TruckI size={20} color="var(--blue)" />}    label="UNIDADES EN RUTA" value={String(liveUnits.length)} tone="blue" />
        <MonitorKpi icon={<ClockI size={20} color="var(--success)" />} label="A TIEMPO" value={`${k.onTimePct}%`} tone="green" />
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: '1fr 2fr', gap: 20 }}>
        {/* Feed de alertas */}
        <div>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h3 className="h3">Alertas</h3>
            <div className="row" style={{ gap: 4 }}>
              <FilterButton label="Todas"     active={filter === 'all'}      onClick={() => setFilter('all')} />
              <FilterButton label="Críticas"  active={filter === 'critical'} onClick={() => setFilter('critical')} />
              <FilterButton label="Adv."      active={filter === 'warning'}  onClick={() => setFilter('warning')} />
            </div>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {list.map((a) => (
              <AlertRow
                key={a.id}
                alert={a}
                acked={ackd[a.id] ?? a.acknowledged}
                onAck={() => setAckd((s) => ({ ...s, [a.id]: true }))}
              />
            ))}
            {list.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center' }} className="small muted">
                Sin alertas para este filtro.
              </div>
            ) : null}
          </div>
        </div>

        {/* Mapa + unidades en vivo */}
        <div>
          <div className="row-between" style={{ marginBottom: 12 }}>
            <h3 className="h3">Flotilla en vivo</h3>
            <Link href="/fleet/tractors" className="small" style={{ color: 'var(--blue)', fontWeight: 700 }}>
              Tractos completos →
            </Link>
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
            <div className="map-card" style={{ minHeight: 320 }}>
              <svg width="100%" height="100%" viewBox="0 0 700 320" preserveAspectRatio="none">
                <defs>
                  <pattern id="grid-m" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M40 0H0V40" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="700" height="320" fill="url(#grid-m)" />
                <path d="M-10 200 Q 200 170 380 180 T 720 130" stroke="rgba(255,255,255,0.65)" strokeWidth="22" fill="none" />
                <path d="M70 -10 Q 100 130 200 220 T 240 360" stroke="rgba(255,255,255,0.65)" strokeWidth="14" fill="none" />
                <path d="M500 -10 Q 520 110 540 200 T 570 360" stroke="rgba(255,255,255,0.65)" strokeWidth="14" fill="none" />
                <path d="M100 260 Q 200 210 280 180 Q 360 150 440 130 Q 520 110 620 80"
                      stroke="#2E86C1" strokeWidth="3" fill="none" strokeDasharray="6 4" />
              </svg>
              <div className="pin in_transit" style={{ left: '40%', top: '46%' }} title="U-104" />
              <div className="pin in_transit" style={{ left: '64%', top: '60%' }} title="U-201" />
              <div className="pin warning"    style={{ left: '22%', top: '70%' }} title="U-303" />
              <div className="pin"            style={{ left: '12%', top: '40%' }} title="U-202" />
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <span className="eyebrow">UNIDADES EN OPERACIÓN ({liveUnits.length})</span>
            </div>
            {liveUnits.map(({ trip, tractor, driver }) => (
              <Link
                key={trip.id}
                href={`/trips/${trip.id}/`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderBottom: '1px solid var(--border)',
                }}
              >
                <span className={`pin ${trip.status === 'loading' ? 'warning' : 'in_transit'}`}
                      style={{ position: 'static', transform: 'none' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <strong>{tractor?.number}</strong>
                    <span className="caption">{driver?.name}</span>
                  </div>
                  <div className="caption" style={{ marginTop: 2 }}>
                    {trip.folio} · {trip.origin.split(',')[0]} → {trip.destination.split(',')[0]}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={`chip status-${trip.status}`}>{statusLabel(trip.status)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Reglas de alertamiento */}
      <div className="card" style={{ marginTop: 24, background: 'var(--surface)' }}>
        <div className="row" style={{ gap: 12, marginBottom: 12 }}>
          <span className="icon-tile sm blue"><SparklesI size={18} color="var(--blue)" /></span>
          <strong>Reglas activas de alertamiento</strong>
        </div>
        <div className="grid-4">
          <Rule title="Documento por vencer ≤ 30 días" body="Licencia, póliza, verificación, inspección" />
          <Rule title="Score chofer < 80"               body="Notifica a supervisor + AI coach" />
          <Rule title="Falla mecánica reportada"        body="Notifica despacho + mecánico + admin" />
          <Rule title="Retraso ETA > 30 min"            body="Activa aviso al cliente y reasignación si aplica" />
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0 rgba(22,163,74,0.5); }
          70%  { box-shadow: 0 0 0 8px rgba(22,163,74,0); }
          100% { box-shadow: 0 0 0 0 rgba(22,163,74,0); }
        }
      `}</style>
    </>
  );
}

function statusLabel(s: string) {
  return ({
    scheduled: 'PROGRAMADO', loading: 'CARGANDO', in_transit: 'EN TRÁNSITO',
    unloading: 'DESCARGANDO', finished: 'FINALIZADO', cancelled: 'CANCELADO',
  } as Record<string, string>)[s] ?? s.toUpperCase();
}

function MonitorKpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'red' | 'amber' | 'blue' | 'green' }) {
  const sub = tone === 'red' || tone === 'amber';
  return (
    <div className="kpi" style={sub ? { borderColor: tone === 'red' ? 'var(--danger)' : 'var(--warning)', borderLeftWidth: 3 } : {}}>
      <div className="row-between" style={{ marginBottom: 12 }}>
        <span className="label">{label}</span>
        <span className={`icon-tile sm ${tone === 'red' ? 'red' : tone === 'amber' ? 'amber' : tone === 'green' ? 'green' : 'blue'}`}>{icon}</span>
      </div>
      <div className="value" style={tone === 'red' ? { color: 'var(--danger)' } : tone === 'amber' ? { color: 'var(--warning)' } : {}}>{value}</div>
    </div>
  );
}

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`chip ${active ? 'navy' : 'gray'}`} style={{ border: 0, cursor: 'pointer' }}>
      {label}
    </button>
  );
}

function AlertRow({ alert, acked, onAck }: { alert: Alert; acked: boolean; onAck: () => void }) {
  const sevTone = alert.severity === 'critical' ? 'red' : alert.severity === 'warning' ? 'amber' : 'blue';
  const Icon = sourceIcon(alert.source);
  const sourceHref = sourceHrefFor(alert);
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '14px 16px', borderBottom: '1px solid var(--border)',
        opacity: acked ? 0.5 : 1, borderLeft: `3px solid ${sevColor(alert.severity)}`,
      }}
    >
      <span className={`icon-tile sm ${sevTone}`}><Icon size={16} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row" style={{ gap: 8, marginBottom: 2 }}>
          <strong style={{ fontSize: 13 }}>{alert.title}</strong>
          <span className={`chip ${sevTone === 'red' ? 'red' : sevTone === 'amber' ? 'amber' : 'blue'}`}>
            {alert.severity.toUpperCase()}
          </span>
        </div>
        <div className="caption" style={{ marginBottom: 4 }}>
          <Link href={sourceHref} style={{ color: 'var(--blue)', fontWeight: 600 }}>
            {alert.entityLabel}
          </Link>{' · '}
          {sourceLabel(alert.source)} · {relTime(alert.createdAt)}
        </div>
        <div className="small">{alert.detail}</div>
      </div>
      {!acked ? (
        <button onClick={onAck} className="btn ghost sm" style={{ minWidth: 'auto', padding: '4px 8px' }} title="Marcar atendida">
          <CheckI size={14} />
        </button>
      ) : (
        <span className="chip green">ATENDIDA</span>
      )}
    </div>
  );
}

function Rule({ title, body }: { title: string; body: string }) {
  return (
    <div style={{
      padding: 12,
      background: 'var(--bg)',
      borderRadius: 12,
      border: '1px solid var(--border)',
    }}>
      <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
      <div className="caption" style={{ marginTop: 4 }}>{body}</div>
    </div>
  );
}

function sourceIcon(s: AlertSource): React.FC<{ size?: number }> {
  return s === 'tractor' ? TruckI : s === 'trailer' ? PackageI : s === 'driver' ? UserI : s === 'document' ? FileI : MapPinI;
}
function sourceLabel(s: AlertSource): string {
  return ({ tractor: 'Tracto', trailer: 'Remolque', driver: 'Operador', document: 'Documento', trip: 'Viaje' } as Record<AlertSource, string>)[s];
}
function sourceHrefFor(a: Alert): string {
  return ({
    tractor: `/fleet/tractors/${a.entityId}/`,
    trailer: `/fleet/trailers/${a.entityId}/`,
    driver:  `/drivers/${a.entityId}/`,
    document: a.entityId.startsWith('t') ? `/fleet/tractors/${a.entityId}/`
              : a.entityId.startsWith('d') ? `/drivers/${a.entityId}/`
              : `/fleet/trailers/${a.entityId}/`,
    trip: `/trips/${a.entityId}/`,
  } as Record<AlertSource, string>)[a.source] ?? '/dashboard';
}
function sevColor(s: AlertSeverity): string {
  return s === 'critical' ? 'var(--danger)' : s === 'warning' ? 'var(--warning)' : 'var(--blue)';
}
function relTime(iso: string): string {
  const m = Math.floor((Date.now() - +new Date(iso)) / 60_000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}
