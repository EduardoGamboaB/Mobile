'use client';
import { drivers, units } from '@/lib/demoData';
import { PlusI, SparklesI, ShieldI, FilterI } from '@/components/Icons';
import { useAppStore } from '@/lib/store';
import { Feature } from '@/lib/tiers';

const fmt = (n: number) => '$' + n.toLocaleString('es-MX', { maximumFractionDigits: 0 });

function scoreBand(s: number) { return s >= 90 ? 'high' : s >= 75 ? 'medium' : 'low'; }
function statusLabel(s: string) {
  return s === 'on_trip' ? 'EN RUTA' : s === 'active' ? 'DISPONIBLE' : s === 'inactive' ? 'INACTIVO' : 'SUSPENDIDO';
}
function statusVariant(s: string) {
  return s === 'on_trip' ? 'blue' : s === 'active' ? 'green' : s === 'suspended' ? 'red' : 'gray';
}

export default function DriversPage() {
  const has = useAppStore((s) => s.has);
  const showScoring = has(Feature.Scoring);

  const ranked = [...drivers].sort((a, b) => b.score - a.score);

  return (
    <>
      <div className="row-between" style={{ marginBottom: 24 }}>
        <div>
          <div className="eyebrow">FLOTILLA</div>
          <h1 className="h1">Choferes</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn outline sm"><FilterI size={16} /> Filtros</button>
          <button className="btn primary sm"><PlusI size={16} /> Invitar chofer</button>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        <Stat label="ACTIVOS" value={drivers.filter((d) => d.status !== 'inactive').length} />
        <Stat label="EN RUTA" value={drivers.filter((d) => d.status === 'on_trip').length} />
        <Stat label="SCORE PROMEDIO" value={Math.round(drivers.reduce((s, d) => s + d.score, 0) / drivers.length)} />
        <Stat label="VENCEN < 30 DÍAS" value={drivers.filter((d) => (new Date(d.licenseExpiresAt).getTime() - Date.now()) / 86_400_000 < 30).length} warn />
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Chofer</th>
            <th>Unidad</th>
            <th>Estatus</th>
            {showScoring ? <th>Score</th> : null}
            <th>A tiempo</th>
            <th>km/L</th>
            <th>Viajes 30d</th>
            <th style={{ textAlign: 'right' }}>Ingresos del mes</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((d) => (
            <tr key={d.id}>
              <td>
                <div className="row" style={{ gap: 10 }}>
                  <div className="avatar">{d.initials}</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{d.name}</div>
                    <div className="caption">{d.email}</div>
                  </div>
                </div>
              </td>
              <td>
                <strong>{d.unitNumber ?? '—'}</strong>
                <div className="caption">{(() => { const u = units.find((u) => u.number === d.unitNumber); return u ? `${u.brand} ${u.model}` : ''; })()}</div>
              </td>
              <td><span className={`chip ${statusVariant(d.status)}`}>{statusLabel(d.status)}</span></td>
              {showScoring ? (
                <td>
                  <div className="row" style={{ gap: 8 }}>
                    <span className={`score-chip ${scoreBand(d.score)}`}>
                      <ShieldI size={12} /> {d.score}
                    </span>
                  </div>
                </td>
              ) : null}
              <td>{d.onTimePct}%</td>
              <td>{d.kmPerLiter}</td>
              <td>{d.tripsLast30}</td>
              <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--blue)' }}>{fmt(d.earningsMonthMXN)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {!showScoring ? (
        <div className="card" style={{ marginTop: 24, borderStyle: 'dashed', borderColor: 'var(--blue)' }}>
          <div className="row" style={{ gap: 12 }}>
            <span className="icon-tile sm blue"><SparklesI size={18} color="var(--blue)" /></span>
            <div style={{ flex: 1 }}>
              <strong>Scoring del chofer disponible desde Pro</strong>
              <div className="small">
                Score compuesto que combina puntualidad, eficiencia, incidencias y validación de documentos. Es la base del scoring que monetizamos con aseguradoras y financieras.
              </div>
            </div>
            <a href="/plans" className="btn accent sm">Mejorar a Pro</a>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="kpi">
      <span className="label">{label}</span>
      <div className="value" style={warn && value > 0 ? { color: 'var(--warning)' } : {}}>{value}</div>
    </div>
  );
}
