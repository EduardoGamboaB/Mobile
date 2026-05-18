'use client';
import Link from 'next/link';
import { trailers, tractors, TrailerTypeLabel } from '@/lib/demoData';
import { PlusI, PackageI, FilterI } from '@/components/Icons';

const statusVariant = (s: string) =>
  s === 'active' ? 'green' : s === 'maintenance' ? 'amber' : 'gray';
const statusLabel = (s: string) =>
  s === 'active' ? 'ACTIVO' : s === 'maintenance' ? 'MANTENIMIENTO' : 'EN PATIO';

export default function TrailersPage() {
  // Conteo por tipo
  const byType = trailers.reduce<Record<string, number>>((m, r) => {
    m[r.type] = (m[r.type] ?? 0) + 1;
    return m;
  }, {});

  return (
    <>
      <div className="row-between" style={{ marginBottom: 24 }}>
        <div>
          <div className="eyebrow">FLOTILLA</div>
          <h1 className="h1">Remolques</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn outline sm"><FilterI size={16} /> Filtros</button>
          <button className="btn primary sm"><PlusI size={16} /> Alta de remolque</button>
        </div>
      </div>

      {/* Distribución por tipo */}
      <div className="card" style={{ marginBottom: 24, padding: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Distribución por tipo</div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(byType).map(([type, count]) => (
            <span key={type} className="chip gray" style={{ fontSize: 12, padding: '6px 12px' }}>
              {TrailerTypeLabel[type as keyof typeof TrailerTypeLabel]} · {count}
            </span>
          ))}
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Número</th>
            <th>Tipo</th>
            <th>Placas / VIN</th>
            <th>Capacidad</th>
            <th>Enganchado a</th>
            <th>Estatus</th>
            <th>Salud</th>
            <th>Última inspección</th>
          </tr>
        </thead>
        <tbody>
          {trailers.map((r) => {
            const attached = r.attachedTractorId ? tractors.find((t) => t.id === r.attachedTractorId) : null;
            const inspDays = Math.floor((Date.now() - +new Date(r.lastInspectionAt)) / 86_400_000);
            const inspWarn = inspDays > 60;
            return (
              <tr key={r.id} onClick={() => (window.location.href = `/fleet/trailers/${r.id}/`)}>
                <td>
                  <div className="row" style={{ gap: 10 }}>
                    <span className="icon-tile sm navy"><PackageI size={16} /></span>
                    <Link href={`/fleet/trailers/${r.id}/`} style={{ color: 'var(--blue)', fontWeight: 700 }}>
                      {r.number}
                    </Link>
                  </div>
                </td>
                <td>
                  <strong>{TrailerTypeLabel[r.type]}</strong>
                  {r.tempRange ? <div className="caption">{r.tempRange}</div> : null}
                </td>
                <td>
                  <strong>{r.plates}</strong>
                  <div className="caption" style={{ fontFamily: 'monospace', fontSize: 11 }}>{r.vin}</div>
                </td>
                <td>{r.capacityTons} ton</td>
                <td>
                  {attached ? (
                    <Link href={`/fleet/tractors/${attached.id}/`} className="small" style={{ color: 'var(--blue)' }}>
                      {attached.number}
                    </Link>
                  ) : (
                    <span className="caption">Libre</span>
                  )}
                </td>
                <td><span className={`chip ${statusVariant(r.status)}`}>{statusLabel(r.status)}</span></td>
                <td>
                  <div className="row" style={{ gap: 8 }}>
                    <div className={`bar ${r.health > 80 ? 'success' : r.health > 65 ? 'warning' : 'danger'}`} style={{ width: 60 }}>
                      <div className="fill" style={{ width: `${r.health}%` }} />
                    </div>
                    <span className="small">{r.health}/100</span>
                  </div>
                </td>
                <td>
                  {inspWarn ? (
                    <span className="chip amber">{inspDays} d</span>
                  ) : (
                    <span className="small">hace {inspDays} d</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
