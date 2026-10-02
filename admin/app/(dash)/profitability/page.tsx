'use client';
import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { tripHref } from '@/lib/trips';
import { isLive } from '@/lib/api/config';
import { driversApi, tractorsApi } from '@/lib/api/modules';
import type { ProfitabilityQuery, ProfitabilityReportDTO, TripProfitabilityDTO } from '@/lib/api/types';
import { ACTIVE_TRIP_STATUSES } from '@/lib/contracts/tripStatus';
import { drivers as demoDrivers, tractors as demoTractors } from '@/lib/demoData';
import {
  PROFITABILITY_DEVIATION_PCT,
  PROFITABILITY_MARGIN_HEALTHY_PCT,
  PROFITABILITY_MARGIN_THIN_PCT,
  loadProfitabilityReport,
  sortProfitabilityRows,
  type ProfitabilitySortKey,
} from '@/lib/profitability';
import { tripStatusLabel } from '@/lib/tripStatusUi';
import { useFeature } from '@/lib/store';
import { Feature } from '@/lib/tiers';
import {
  MarginChip,
  ProfitabilityBreakdown,
  fmtMoney,
  fmtPct,
} from '@/components/ProfitabilityBreakdown';
import {
  AlertI, ChevronRI, DollarI, FileI, LockI, TrendUpI, TruckI, UsersI,
} from '@/components/Icons';

type Period = 'month' | 'last30' | 'last90' | 'all' | 'custom';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'month', label: 'Este mes' },
  { id: 'last30', label: '30 días' },
  { id: 'last90', label: '90 días' },
  { id: 'all', label: 'Todo' },
  { id: 'custom', label: 'Personalizado' },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos (sin cancelados)' },
  { value: 'pre_closed,closed', label: 'Entregados (precierre + cierre)' },
  { value: 'closed', label: 'Cerrados' },
  { value: ACTIVE_TRIP_STATUSES.join(','), label: 'Activos' },
  { value: 'cancelled', label: 'Cancelados' },
];

const ymd = (d: Date) => d.toISOString().slice(0, 10);

function periodRange(p: Period, custom: { from: string; to: string }): Pick<ProfitabilityQuery, 'from' | 'to'> {
  const now = new Date();
  if (p === 'all') return {};
  if (p === 'custom') return { from: custom.from || undefined, to: custom.to || undefined };
  if (p === 'month') {
    return { from: ymd(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))), to: ymd(now) };
  }
  const days = p === 'last30' ? 30 : 90;
  return { from: ymd(new Date(now.getTime() - days * 86_400_000)), to: ymd(now) };
}

interface Option { id: string; label: string }

export default function ProfitabilityPage() {
  const enabled = useFeature(Feature.EarningsDashboard);

  const [period, setPeriod] = useState<Period>('last30');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [driverId, setDriverId] = useState('');
  const [tractorId, setTractorId] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState<{ key: ProfitabilitySortKey; dir: 'asc' | 'desc' }>({ key: 'tripDate', dir: 'desc' });
  const [open, setOpen] = useState<string | null>(null);

  const [report, setReport] = useState<ProfitabilityReportDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [driverOpts, setDriverOpts] = useState<Option[]>(
    isLive ? [] : demoDrivers.map((d) => ({ id: d.id, label: d.name })),
  );
  const [tractorOpts, setTractorOpts] = useState<Option[]>(
    isLive ? [] : demoTractors.map((t) => ({ id: t.id, label: `${t.number} · ${t.brand} ${t.model}` })),
  );

  // En vivo, choferes y unidades vienen del backend (para filtros y nombres).
  useEffect(() => {
    if (!isLive || !enabled) return;
    driversApi.list().then((ds) => setDriverOpts(ds.map((d) => ({ id: d.id, label: d.fullName })))).catch(() => undefined);
    tractorsApi.list().then((ts) => setTractorOpts(ts.map((t) => ({ id: t.id, label: t.unitNumber })))).catch(() => undefined);
  }, [enabled]);

  const query = useMemo<ProfitabilityQuery>(() => ({
    ...periodRange(period, custom),
    driverId: driverId || undefined,
    tractorId: tractorId || undefined,
    status: status || undefined,
  }), [period, custom, driverId, tractorId, status]);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setLoading(true);
    loadProfitabilityReport(query)
      .then((r) => { if (alive) { setReport(r); setError(null); } })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [query, enabled]);

  const rows = useMemo(
    () => (report ? sortProfitabilityRows(report.rows, sort.key, sort.dir) : []),
    [report, sort],
  );
  const driverName = (id: string | null) => driverOpts.find((d) => d.id === id)?.label ?? '—';
  const tractorName = (id: string | null) => tractorOpts.find((t) => t.id === id)?.label.split(' · ')[0] ?? '—';

  const toggleSort = (key: ProfitabilitySortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'folio' ? 'asc' : 'desc' }));

  if (!enabled) {
    return (
      <>
        <Header />
        <div className="card" style={{ borderStyle: 'dashed', borderColor: 'var(--blue)' }}>
          <div className="row" style={{ gap: 12 }}>
            <span className="icon-tile blue"><LockI size={20} color="var(--blue)" /></span>
            <div style={{ flex: 1 }}>
              <strong>Rentabilidad por viaje está disponible desde el plan Starter.</strong>
              <div className="small">Importe menos casetas, diesel y comisión de cada viaje, con lo que G3 Drive ya captura.</div>
            </div>
            <Link href="/plans/" className="btn accent sm">Ver planes</Link>
          </div>
        </div>
      </>
    );
  }

  const t = report?.totals;

  return (
    <>
      <Header live={isLive} />

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 16, padding: 12 }}>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`chip ${period === p.id ? 'navy' : 'gray'}`}
              style={{ border: 0, cursor: 'pointer' }}
            >
              {p.label}
            </button>
          ))}
          {period === 'custom' ? (
            <>
              <input type="date" aria-label="Desde" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} style={fieldStyle} />
              <span className="caption">a</span>
              <input type="date" aria-label="Hasta" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} style={fieldStyle} />
            </>
          ) : null}
          <span className="spacer" />
          <select aria-label="Chofer" value={driverId} onChange={(e) => setDriverId(e.target.value)} style={fieldStyle}>
            <option value="">Todos los choferes</option>
            {driverOpts.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
          <select aria-label="Unidad" value={tractorId} onChange={(e) => setTractorId(e.target.value)} style={fieldStyle}>
            <option value="">Todas las unidades</option>
            {tractorOpts.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
          <select aria-label="Estado" value={status} onChange={(e) => setStatus(e.target.value)} style={fieldStyle}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--danger)' }}>
          <span className="small" style={{ color: 'var(--danger)' }}>No se pudo cargar el reporte: {error}</span>
        </div>
      ) : null}

      {/* KPIs del dueño */}
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <Kpi label="INGRESO DEL PERIODO" value={fmtMoney(t?.revenue)} hint={`${t?.trips ?? 0} viajes`} icon={<DollarI size={20} color="var(--blue)" />} />
        <Kpi
          label="GASTO OPERATIVO"
          value={fmtMoney(t?.operatingExpenses)}
          hint={`Casetas ${fmtMoney(t?.tolls)} · Diesel ${fmtMoney(t?.diesel)} · Otros ${fmtMoney(t?.otherExpenses)}`}
          icon={<TruckI size={20} color="var(--blue)" />}
        />
        <Kpi label="COMISIÓN CHOFERES" value={fmtMoney(t?.driverCommission)} icon={<UsersI size={20} color="var(--blue)" />} />
        <Kpi
          label="UTILIDAD"
          value={fmtMoney(t?.profit)}
          hint={t && t.tripsComputed < t.trips ? `Sobre ${t.tripsComputed} de ${t.trips} viajes con datos completos` : 'Ingreso − casetas − diesel − otros − comisión'}
          icon={<TrendUpI size={20} color="var(--blue)" />}
          danger={(t?.profit ?? 0) < 0}
        />
        <div className="kpi">
          <div className="row-between" style={{ marginBottom: 12 }}>
            <span className="label">MARGEN DE CONTRIBUCIÓN</span>
            {t ? <MarginChip band={t.marginBand} pct={t.marginPct} /> : null}
          </div>
          <div className="value">{fmtPct(t?.marginPct)}</div>
          <div className="caption" style={{ marginTop: 4 }}>
            Verde ≥ {PROFITABILITY_MARGIN_HEALTHY_PCT}% · ámbar ≥ {PROFITABILITY_MARGIN_THIN_PCT}% · rojo debajo
          </div>
        </div>
        <Kpi
          label="GASTO SIN COMPROBANTE"
          value={fmtMoney(t?.expensesWithoutReceipt)}
          hint={`${t?.expensesWithoutReceiptCount ?? 0} gastos sin ticket · dinero recuperable`}
          icon={<FileI size={20} color="var(--warning)" />}
          warn={(t?.expensesWithoutReceipt ?? 0) > 0}
        />
      </div>

      {t && (t.tripsDeviated > 0 || t.tripsWithIssues > 0) ? (
        <div className="card" style={{ marginBottom: 16, padding: 12 }}>
          <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
            {t.tripsDeviated > 0 ? (
              <span className="row small" style={{ gap: 6 }}>
                <AlertI size={16} color="var(--danger)" />
                <strong>{t.tripsDeviated}</strong> {t.tripsDeviated === 1 ? 'viaje' : 'viajes'} con casetas o diesel &gt; {PROFITABILITY_DEVIATION_PCT}% sobre lo estimado
                <span className="caption">(estimado {fmtMoney(t.estimatedTolls + t.estimatedDiesel)} vs. real {fmtMoney(t.tolls + t.diesel)})</span>
              </span>
            ) : null}
            {t.tripsWithIssues > 0 ? (
              <span className="row small" style={{ gap: 6 }}>
                <AlertI size={16} color="var(--warning)" />
                <strong>{t.tripsWithIssues}</strong> con datos incompletos (se marcan, no se estiman)
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Tabla por viaje */}
      <table className="table">
        <thead>
          <tr>
            <Th label="Viaje" k="folio" sort={sort} onSort={toggleSort} />
            <th>Chofer · unidad</th>
            <Th label="Ingreso" k="revenue" sort={sort} onSort={toggleSort} right />
            <Th label="Casetas" k="tolls" sort={sort} onSort={toggleSort} right />
            <Th label="Diesel" k="diesel" sort={sort} onSort={toggleSort} right />
            <Th label="Comisión" k="commission" sort={sort} onSort={toggleSort} right />
            <Th label="Utilidad" k="profit" sort={sort} onSort={toggleSort} right />
            <Th label="Margen" k="marginPct" sort={sort} onSort={toggleSort} />
            <Th label="Sin ticket" k="withoutReceipt" sort={sort} onSort={toggleSort} right />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={9} className="caption" style={{ textAlign: 'center', padding: 24 }}>
                {loading ? 'Calculando…' : 'Sin viajes en este periodo con esos filtros.'}
              </td>
            </tr>
          ) : null}
          {rows.map((r) => (
            <Fragment key={r.tripId}>
              <tr onClick={() => setOpen(open === r.tripId ? null : r.tripId)} aria-expanded={open === r.tripId}>
                <td>
                  <div className="row" style={{ gap: 6 }}>
                    <ChevronRI size={14} color="var(--muted)" />
                    <div>
                      <div style={{ color: 'var(--blue)', fontWeight: 700 }}>{r.folio}</div>
                      <div className="caption">
                        {new Date(r.tripDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} · {r.clientName ?? '—'}
                      </div>
                      <span className={`chip status-${r.status}`} style={{ marginTop: 4 }}>{tripStatusLabel(r.status)}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{driverName(r.driverId)}</div>
                  <div className="caption">{tractorName(r.tractorId)}</div>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>
                  {r.revenue == null ? <span className="chip gray">SIN TARIFA</span> : fmtMoney(r.revenue)}
                </td>
                <ExpenseCell actual={r.tolls.actual} estimated={r.tolls.estimated} deviated={r.tolls.deviated} />
                <ExpenseCell actual={r.diesel.actual} estimated={r.diesel.estimated} deviated={r.diesel.deviated} />
                <td style={{ textAlign: 'right' }}>{fmtMoney(r.driverCommission)}</td>
                <td style={{ textAlign: 'right', fontWeight: 800, color: r.profit != null && r.profit < 0 ? 'var(--danger)' : 'var(--text)' }}>
                  {r.profit == null ? '—' : fmtMoney(r.profit)}
                </td>
                <td><MarginChip band={r.marginBand} pct={r.marginPct} /></td>
                <td style={{ textAlign: 'right', color: r.expensesWithoutReceipt > 0 ? 'var(--warning)' : 'var(--muted)', fontWeight: 700 }}>
                  {r.expensesWithoutReceipt > 0 ? fmtMoney(r.expensesWithoutReceipt) : '—'}
                </td>
              </tr>
              {open === r.tripId ? (
                <tr>
                  <td colSpan={9} style={{ background: 'var(--surface)', cursor: 'default' }}>
                    <DetailRow r={r} />
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
        </tbody>
      </table>
      <div className="caption" style={{ marginTop: 12 }}>
        Gasto real = bitácora de G3 Drive (casetas, diesel y otros). Estimado = lo capturado al crear el viaje.
        Margen de contribución: no incluye costos fijos de la unidad.
      </div>
    </>
  );
}

const fieldStyle: React.CSSProperties = {
  height: 32,
  padding: '0 10px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
  fontSize: 13,
};

function Header({ live }: { live?: boolean }) {
  return (
    <div className="row-between" style={{ marginBottom: 24 }}>
      <div>
        <div className="eyebrow">INTELIGENCIA · DUEÑO</div>
        <h1 className="h1">Rentabilidad por viaje</h1>
        <div className="small" style={{ marginTop: 4 }}>
          Importe − casetas − diesel − comisión, con lo que G3 Drive ya captura. Sin sensores.
        </div>
      </div>
      {live === undefined ? null : (
        <span className={`chip ${live ? 'green' : 'gray'}`}>{live ? 'EN VIVO' : 'DEMO'}</span>
      )}
    </div>
  );
}

function Kpi({
  label, value, hint, icon, warn, danger,
}: { label: string; value: string; hint?: string; icon: React.ReactNode; warn?: boolean; danger?: boolean }) {
  return (
    <div className="kpi" style={warn || danger ? { borderColor: danger ? 'var(--danger)' : 'var(--warning)', borderLeftWidth: 3 } : {}}>
      <div className="row-between" style={{ marginBottom: 12 }}>
        <span className="label">{label}</span>
        <span className={`icon-tile sm ${danger ? 'red' : warn ? 'amber' : 'blue'}`}>{icon}</span>
      </div>
      <div className="value" style={danger ? { color: 'var(--danger)' } : undefined}>{value}</div>
      {hint ? <div className="caption" style={{ marginTop: 4 }}>{hint}</div> : null}
    </div>
  );
}

function Th({
  label, k, sort, onSort, right,
}: {
  label: string;
  k: ProfitabilitySortKey;
  sort: { key: ProfitabilitySortKey; dir: 'asc' | 'desc' };
  onSort: (k: ProfitabilitySortKey) => void;
  right?: boolean;
}) {
  const active = sort.key === k;
  return (
    <th
      onClick={() => onSort(k)}
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      style={{ cursor: 'pointer', textAlign: right ? 'right' : 'left', color: active ? 'var(--text)' : undefined, userSelect: 'none' }}
    >
      {label}{active ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  );
}

function ExpenseCell({ actual, estimated, deviated }: { actual: number; estimated: number | null; deviated: boolean }) {
  return (
    <td style={{ textAlign: 'right' }}>
      <div style={{ fontWeight: 600, color: deviated ? 'var(--danger)' : 'var(--text)' }}>
        {fmtMoney(actual)}{deviated ? ' ▲' : ''}
      </div>
      <div className="caption">est. {fmtMoney(estimated)}</div>
    </td>
  );
}

function DetailRow({ r }: { r: TripProfitabilityDTO }) {
  return (
    <div className="grid-2" style={{ gridTemplateColumns: '2fr 1fr', alignItems: 'start' }}>
      <div className="card" style={{ padding: 16 }}>
        <ProfitabilityBreakdown p={r} />
      </div>
      <div className="stack">
        <div className="small"><strong>{r.origin}</strong> → <strong>{r.destination}</strong></div>
        <div className="caption">{r.expenseEntries} gastos registrados en bitácora</div>
        <Link href={tripHref(r.tripId)} className="btn outline sm">Ver viaje completo</Link>
      </div>
    </div>
  );
}
