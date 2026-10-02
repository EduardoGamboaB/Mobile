'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type {
  ExpenseComparisonDTO,
  ProfitabilityMarginBand,
  TripProfitabilityDTO,
} from '@/lib/api/types';
import {
  DATA_ISSUE_LABEL,
  MARGIN_BAND_CHIP,
  MARGIN_BAND_LABEL,
  PROFITABILITY_DEVIATION_PCT,
  loadTripProfitability,
} from '@/lib/profitability';
import { useFeature } from '@/lib/store';
import { Feature } from '@/lib/tiers';
import { AlertI, LockI } from './Icons';

export const fmtMoney = (n: number | null | undefined) =>
  n == null ? '—' : '$' + n.toLocaleString('es-MX', { maximumFractionDigits: 0 });

export const fmtPct = (n: number | null | undefined) =>
  n == null ? '—' : `${n.toLocaleString('es-MX', { maximumFractionDigits: 1 })}%`;

/** Chip del semáforo de margen (verde / ámbar / rojo / gris sin datos). */
export function MarginChip({ band, pct }: { band: ProfitabilityMarginBand; pct: number | null }) {
  return (
    <span className={`chip ${MARGIN_BAND_CHIP[band]}`} title={MARGIN_BAND_LABEL[band]}>
      <span
        aria-hidden
        style={{
          width: 8, height: 8, borderRadius: 999, display: 'inline-block', marginRight: 6,
          background: band === 'healthy' ? 'var(--success)' : band === 'thin' ? 'var(--warning)' : band === 'low' ? 'var(--danger)' : 'var(--muted)',
        }}
      />
      {pct == null ? 'SIN DATOS' : fmtPct(pct)}
    </span>
  );
}

function CompareRow({ label, c }: { label: string; c: ExpenseComparisonDTO }) {
  return (
    <div className="row-between" style={{ padding: '6px 0' }}>
      <span className="small">{label}</span>
      <span className="row" style={{ gap: 10 }}>
        <span className="caption">Est. {fmtMoney(c.estimated)}</span>
        <strong style={{ color: c.deviated ? 'var(--danger)' : 'var(--text)' }}>− {fmtMoney(c.actual)}</strong>
        {c.variancePct != null ? (
          <span className={`chip ${c.deviated ? 'red' : c.variancePct > 0 ? 'amber' : 'green'}`}>
            {c.variancePct > 0 ? '+' : ''}{fmtPct(c.variancePct)}
          </span>
        ) : (
          <span className="chip gray">SIN ESTIMADO</span>
        )}
      </span>
    </div>
  );
}

/** Desglose de un viaje: ingreso − casetas − diesel − otros − comisión. */
export function ProfitabilityBreakdown({ p }: { p: TripProfitabilityDTO }) {
  return (
    <div>
      <div className="row-between" style={{ padding: '6px 0' }}>
        <span className="small">
          Ingreso {p.revenueSource === 'tons_x_price' ? '(toneladas × precio)' : '(flete)'}
        </span>
        <strong>{p.revenue == null ? 'Sin capturar' : fmtMoney(p.revenue)}</strong>
      </div>
      <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '8px 0' }} />
      <div className="caption" style={{ marginBottom: 4 }}>Real (bitácora de G3 Drive) vs. estimado</div>
      <CompareRow label="Casetas" c={p.tolls} />
      <CompareRow label="Diesel" c={p.diesel} />
      <div className="row-between" style={{ padding: '6px 0' }}>
        <span className="small">Otros gastos (paradas, maniobras…)</span>
        <strong>− {fmtMoney(p.otherExpenses)}</strong>
      </div>
      <div className="row-between" style={{ padding: '6px 0' }}>
        <span className="small">Comisión del chofer</span>
        <strong>{p.driverCommission == null ? 'Sin capturar' : `− ${fmtMoney(p.driverCommission)}`}</strong>
      </div>
      <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '8px 0' }} />
      <div className="row-between" style={{ padding: '6px 0' }}>
        <span style={{ fontWeight: 700 }}>Utilidad del viaje</span>
        <span className="row" style={{ gap: 10 }}>
          <strong style={{ fontSize: 20, color: p.profit != null && p.profit < 0 ? 'var(--danger)' : 'var(--blue)' }}>
            {p.profit == null ? 'No calculable' : fmtMoney(p.profit)}
          </strong>
          <MarginChip band={p.marginBand} pct={p.marginPct} />
        </span>
      </div>

      {p.expensesWithoutReceipt > 0 ? (
        <div className="row" style={{ marginTop: 10, padding: 10, borderRadius: 10, background: 'var(--warning-bg)', gap: 10 }}>
          <AlertI size={16} color="var(--warning)" />
          <span className="small" style={{ color: 'var(--text)' }}>
            <strong>{fmtMoney(p.expensesWithoutReceipt)}</strong> en {p.expensesWithoutReceiptCount}{' '}
            {p.expensesWithoutReceiptCount === 1 ? 'gasto' : 'gastos'} sin comprobante: dinero recuperable si el
            chofer sube el ticket.
          </span>
        </div>
      ) : null}
      {p.deviations.length > 0 ? (
        <div className="caption" style={{ marginTop: 8, color: 'var(--danger)' }}>
          Desviación &gt; {PROFITABILITY_DEVIATION_PCT}% sobre lo estimado en{' '}
          {p.deviations.map((d) => (d === 'tolls' ? 'casetas' : 'diesel')).join(' y ')}.
        </div>
      ) : null}
      {p.dataIssues.length > 0 ? (
        <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {p.dataIssues.map((i) => (
            <span key={i} className="chip gray">{DATA_ISSUE_LABEL[i]}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Sección "Rentabilidad" del detalle del viaje (API en vivo o demoData). */
export function TripProfitabilitySection({ tripId }: { tripId: string }) {
  const enabled = useFeature(Feature.EarningsDashboard);
  const [state, setState] = useState<
    { kind: 'loading' } | { kind: 'ok'; p: TripProfitabilityDTO } | { kind: 'error'; msg: string }
  >({ kind: 'loading' });

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    loadTripProfitability(tripId)
      .then((p) => alive && setState(p ? { kind: 'ok', p } : { kind: 'error', msg: 'Viaje no encontrado' }))
      .catch((e: Error) => alive && setState({ kind: 'error', msg: e.message }));
    return () => {
      alive = false;
    };
  }, [tripId, enabled]);

  return (
    <div className="card">
      <div className="row-between" style={{ marginBottom: 12 }}>
        <span className="eyebrow">Rentabilidad del viaje</span>
        <Link href="/profitability/" className="caption" style={{ color: 'var(--blue)', fontWeight: 700 }}>
          Ver todos los viajes →
        </Link>
      </div>
      {!enabled ? (
        <div className="row" style={{ gap: 10 }}>
          <LockI size={16} color="var(--muted)" />
          <span className="small">Disponible desde el plan Starter.</span>
        </div>
      ) : state.kind === 'loading' ? (
        <div className="caption">Calculando…</div>
      ) : state.kind === 'error' ? (
        <div className="caption" style={{ color: 'var(--danger)' }}>No se pudo calcular: {state.msg}</div>
      ) : (
        <ProfitabilityBreakdown p={state.p} />
      )}
    </div>
  );
}
