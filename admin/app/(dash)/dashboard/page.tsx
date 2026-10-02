'use client';
import Link from 'next/link';
import { kpis, drivers, trips, incidents, units } from '@/lib/demoData';
import {
  TruckI, UsersI, DollarI, ClockI, AlertI, SparklesI,
  ArrowRightI, MapPinI, CheckI,
} from '@/components/Icons';
import { useAppStore } from '@/lib/store';
import { Feature, TierLabel } from '@/lib/tiers';
import { ACTIVE_TRIP_STATUSES } from '@/lib/contracts/tripStatus';
import { tripStatusLabel } from '@/lib/tripStatusUi';

const fmt = (n: number) => '$' + n.toLocaleString('es-MX', { maximumFractionDigits: 0 });

export default function DashboardPage() {
  const k = kpis();
  const has = useAppStore((s) => s.has);
  const tier = useAppStore((s) => s.tier);

  const activeTrips = trips.filter((t) => ACTIVE_TRIP_STATUSES.includes(t.status));
  const openIncidents = incidents.filter((i) => !i.resolved);

  return (
    <>
      {/* Cabecera */}
      <div className="row-between" style={{ marginBottom: 24 }}>
        <div>
          <div className="eyebrow">G3 LOGISTICS · MAYO 2026</div>
          <h1 className="h1">Resumen operativo</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn outline sm">Exportar</button>
          <Link href="/trips/new/" className="btn accent sm"><span style={{ display: 'inline-flex', marginRight: 4 }}>+</span>Nuevo viaje</Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <Kpi
          label="UNIDADES EN OPERACIÓN"
          value={`${k.unitsActive}/${k.unitsTotal}`}
          delta={`${k.driversOnRoute} en ruta`}
          icon={<TruckI size={20} color="var(--blue)" />}
        />
        <Kpi
          label="VIAJES DEL MES"
          value={String(k.tripsThisMonth)}
          delta="+18% vs mes ant."
          deltaPositive
          icon={<ClockI size={20} color="var(--blue)" />}
        />
        <Kpi
          label="INGRESO FACTURADO"
          value={fmt(k.revenueMonthMXN)}
          delta="+24% vs mes ant."
          deltaPositive
          icon={<DollarI size={20} color="var(--blue)" />}
        />
        <Kpi
          label="PENDIENTE POR PAGAR A CHOFERES"
          value={fmt(k.pendingPayouts)}
          delta={`${k.openIncidents} incidencias abiertas`}
          icon={<AlertI size={20} color="var(--warning)" />}
          warn
        />
      </div>

      {/* Mapa + Próximas acciones */}
      <div className="grid-3" style={{ gridTemplateColumns: '2fr 1fr', marginBottom: 24 }}>
        {has(Feature.FleetMap) ? (
          <FleetMapCard />
        ) : (
          <UpgradeCard
            title="Mapa de flotilla en vivo"
            body="Ve la posición de cada unidad, su ruta y ETA en tiempo real. Disponible desde Pro."
            requiredTier="Pro"
          />
        )}
        <div className="stack-lg">
          <div className="card">
            <div className="row-between" style={{ marginBottom: 12 }}>
              <span className="eyebrow">Acciones pendientes</span>
              <span className="chip amber">{openIncidents.length + activeTrips.filter((t) => t.inspectionPct < 100 && t.status !== 'scheduled').length}</span>
            </div>
            <ActionRow
              icon={<AlertI size={16} color="var(--danger)" />}
              tone="red"
              title="Incidencia crítica en G3-2026-00126"
              body="Falla mecánica · Roberto Aguilar"
            />
            <ActionRow
              icon={<CheckI size={16} color="var(--warning)" />}
              tone="amber"
              title="3 viajes esperan validación POD"
              body="Bimbo, Lala, Walmart"
            />
            <ActionRow
              icon={<DollarI size={16} color="var(--blue)" />}
              tone="blue"
              title="2 pagos por liberar"
              body="Acumulan $7,200 a choferes"
            />
            <Link href="/payments" className="btn outline sm" style={{ width: '100%', marginTop: 12 }}>
              Ver todas
            </Link>
          </div>
        </div>
      </div>

      {/* Viajes activos */}
      <div className="row-between" style={{ marginBottom: 12 }}>
        <h3 className="h3">Viajes activos · {activeTrips.length}</h3>
        <Link href="/trips" className="small" style={{ color: 'var(--blue)', fontWeight: 700 }}>
          Ver todos →
        </Link>
      </div>
      <table className="table" style={{ marginBottom: 24 }}>
        <thead>
          <tr>
            <th>Folio</th>
            <th>Cliente</th>
            <th>Ruta</th>
            <th>Chofer</th>
            <th>Estatus</th>
            <th>Inspección</th>
            <th style={{ textAlign: 'right' }}>Importe</th>
          </tr>
        </thead>
        <tbody>
          {activeTrips.slice(0, 6).map((t) => {
            const driver = drivers.find((d) => d.id === t.driverId);
            return (
              <tr key={t.id}>
                <td><span className="small" style={{ color: 'var(--muted)' }}>{t.folio}</span></td>
                <td><strong>{t.client}</strong></td>
                <td>
                  <div className="row" style={{ gap: 6 }}>
                    <MapPinI size={14} color="var(--blue)" />
                    <span className="small">{t.origin.split(',')[0]} → {t.destination.split(',')[0]}</span>
                  </div>
                </td>
                <td>
                  <div className="row" style={{ gap: 8 }}>
                    <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                      {driver?.initials}
                    </div>
                    <span className="small">{driver?.name.split(' ')[0]} {driver?.name.split(' ')[1]}</span>
                  </div>
                </td>
                <td>
                  <span className={`chip status-${t.status}`}>{tripStatusLabel(t.status)}</span>
                </td>
                <td>
                  <div className="row" style={{ gap: 8 }}>
                    <div className="bar" style={{ width: 50 }}>
                      <div className="fill" style={{ width: `${t.inspectionPct}%` }} />
                    </div>
                    <span className="small">{t.inspectionPct}%</span>
                  </div>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(t.freightAmount ?? 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* AI Insights */}
      {has(Feature.AIInsights) ? (
        <div className="card navy">
          <div className="row" style={{ gap: 12, marginBottom: 12 }}>
            <SparklesI size={20} color="#fff" />
            <h3 className="h3" style={{ color: '#fff' }}>G3 Intelligence · sugerencias del día</h3>
            <span className="chip white" style={{ marginLeft: 'auto' }}>BETA</span>
          </div>
          <div className="grid-3">
            <Insight
              text="Eduardo Gamboa Jr. mantiene 99% de puntualidad — considéralo para viajes premium."
              tone="praise"
            />
            <Insight
              text="Unidad U-303 (Salvador Méndez) bajó 0.4 km/L vs mes pasado. Revisar consumo."
              tone="warning"
            />
            <Insight
              text="Licencia de Salvador Méndez vence en 8 días. Tramitar renovación."
              tone="info"
            />
          </div>
        </div>
      ) : (
        <UpgradeCard
          title="G3 Intelligence · sugerencias accionables"
          body="Insights de rentabilidad, scoring de choferes y alertas predictivas. Disponible desde Pro."
          requiredTier="Pro"
        />
      )}
    </>
  );
}

function Kpi({
  label,
  value,
  delta,
  deltaPositive,
  icon,
  warn,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  icon: React.ReactNode;
  warn?: boolean;
}) {
  return (
    <div className="kpi">
      <div className="row-between" style={{ marginBottom: 12 }}>
        <span className="label">{label}</span>
        <span className={`icon-tile sm ${warn ? 'amber' : 'blue'}`}>{icon}</span>
      </div>
      <div className="value">{value}</div>
      {delta ? (
        <div className={`delta ${deltaPositive ? 'up' : ''}`} style={{ marginTop: 4 }}>
          {deltaPositive ? '↑ ' : ''}{delta}
        </div>
      ) : null}
    </div>
  );
}

function ActionRow({
  icon,
  tone,
  title,
  body,
}: {
  icon: React.ReactNode;
  tone: 'red' | 'amber' | 'blue';
  title: string;
  body: string;
}) {
  return (
    <div className="row" style={{ padding: '10px 0', gap: 12, borderBottom: '1px solid var(--border)' }}>
      <span className={`icon-tile sm ${tone === 'red' ? 'red' : tone === 'amber' ? 'amber' : 'blue'}`}>
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
        <div className="caption">{body}</div>
      </div>
      <ArrowRightI size={14} color="var(--muted)" />
    </div>
  );
}

function Insight({ text, tone }: { text: string; tone: 'praise' | 'warning' | 'info' }) {
  const color = tone === 'praise' ? '#86EFAC' : tone === 'warning' ? '#FCD34D' : '#93C5FD';
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      borderRadius: 12,
      padding: 14,
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.92)', lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

function FleetMapCard() {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="row-between" style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
        <div>
          <div className="eyebrow">Flotilla en vivo</div>
          <div className="small" style={{ marginTop: 2 }}>5 unidades activas · 3 en ruta</div>
        </div>
        <Link href="/fleet" className="small" style={{ color: 'var(--blue)', fontWeight: 700 }}>
          Mapa completo →
        </Link>
      </div>
      <div className="map-card">
        <svg width="100%" height="100%" viewBox="0 0 600 280" preserveAspectRatio="none">
          <defs>
            <pattern id="grid-dash" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0V40" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="600" height="280" fill="url(#grid-dash)" />
          <path d="M-10 180 Q 150 150 300 160 T 620 130" stroke="rgba(255,255,255,0.65)" strokeWidth="20" fill="none" />
          <path d="M50 -10 Q 80 120 180 200 T 220 320" stroke="rgba(255,255,255,0.65)" strokeWidth="14" fill="none" />
          <path d="M400 -10 Q 420 100 440 200 T 470 320" stroke="rgba(255,255,255,0.65)" strokeWidth="14" fill="none" />
          <path d="M80 230 Q 150 170 230 150 Q 310 130 380 100 Q 440 80 520 60"
                stroke="#2E86C1" strokeWidth="3" fill="none" strokeDasharray="6 4" />
        </svg>
        <div className="pin in_transit" style={{ left: '45%', top: '38%' }} title="U-104" />
        <div className="pin in_transit" style={{ left: '68%', top: '60%' }} title="U-201" />
        <div className="pin warning"    style={{ left: '30%', top: '70%' }} title="U-303" />
        <div className="pin closed"     style={{ left: '85%', top: '25%' }} title="Tampico" />
        <div className="pin"            style={{ left: '15%', top: '45%' }} title="U-202 stand-by" />
      </div>
    </div>
  );
}

function UpgradeCard({ title, body, requiredTier }: { title: string; body: string; requiredTier: string }) {
  return (
    <Link href="/plans" className="card" style={{ display: 'block', textDecoration: 'none', borderStyle: 'dashed', borderColor: 'var(--blue)' }}>
      <div className="row" style={{ gap: 12, marginBottom: 8 }}>
        <span className="icon-tile sm blue"><SparklesI size={16} color="var(--blue)" /></span>
        <strong style={{ fontSize: 15 }}>{title}</strong>
        <span className="chip navy" style={{ marginLeft: 'auto' }}>{requiredTier.toUpperCase()}</span>
      </div>
      <div className="small">{body}</div>
      <div className="row" style={{ marginTop: 12, color: 'var(--blue)', fontWeight: 700, fontSize: 13 }}>
        Mejorar a {requiredTier} →
      </div>
    </Link>
  );
}
