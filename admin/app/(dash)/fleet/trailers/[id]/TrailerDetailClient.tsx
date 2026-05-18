'use client';
import Link from 'next/link';
import {
  trailerById, tractorById, trips, TrailerTypeLabel, documentsForOwner, alertsByEntity,
} from '@/lib/demoData';
import { ChevronLI, PackageI, AlertI, FileI, TruckI } from '@/components/Icons';

const fmt = (n: number) => n.toLocaleString('es-MX');
const statusVariant = (s: string) =>
  s === 'active' ? 'green' : s === 'maintenance' ? 'amber' : 'gray';

export default function TrailerDetailClient({ id }: { id: string }) {
  const r = trailerById(id);
  if (!r) return <div>No encontrado.</div>;
  const tractor = r.attachedTractorId ? tractorById(r.attachedTractorId) : null;
  const myTrips = trips.filter((t) => t.trailerId === id);
  const docs = documentsForOwner('trailer', id);
  const myAlerts = alertsByEntity('trailer', id);

  const inspDays = Math.floor((Date.now() - +new Date(r.lastInspectionAt)) / 86_400_000);

  return (
    <>
      <Link href="/fleet/trailers/" className="row" style={{ marginBottom: 20, color: 'var(--muted)', fontWeight: 600, gap: 6 }}>
        <ChevronLI size={16} /> Volver a remolques
      </Link>

      <div className="row-between" style={{ marginBottom: 24 }}>
        <div className="row" style={{ gap: 16 }}>
          <span className="icon-tile blue" style={{ width: 56, height: 56, borderRadius: 14 }}>
            <PackageI size={26} color="var(--blue)" />
          </span>
          <div>
            <div className="eyebrow">REMOLQUE · {TrailerTypeLabel[r.type]}</div>
            <h1 className="h1">{r.number}</h1>
            <div className="row" style={{ gap: 8, marginTop: 6 }}>
              <span className={`chip ${statusVariant(r.status)}`}>{r.status.toUpperCase()}</span>
              <span className="chip gray">{r.capacityTons} TON</span>
              {r.tempRange ? <span className="chip blue">{r.tempRange}</span> : null}
            </div>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn outline sm">Editar</button>
          <button className="btn primary sm">Enganchar a tracto</button>
        </div>
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: '2fr 1fr', marginBottom: 24, gap: 20 }}>
        <div className="stack-lg">
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 12 }}>Especificaciones</div>
            <div className="grid-2" style={{ gap: 16 }}>
              <Spec label="Tipo"       value={TrailerTypeLabel[r.type]} />
              <Spec label="Capacidad"  value={`${r.capacityTons} toneladas`} />
              <Spec label="Placas"     value={r.plates} />
              <Spec label="VIN"        value={r.vin} mono />
              {r.tempRange ? <Spec label="Rango térmico" value={r.tempRange} /> : null}
            </div>
          </div>

          <div className="card">
            <div className="row-between" style={{ marginBottom: 12 }}>
              <span className="eyebrow">Inspección y mantenimiento</span>
              {inspDays > 60 ? <span className="chip amber">INSPECCIÓN ATRASADA</span> : <span className="chip green">AL DÍA</span>}
            </div>
            <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
              <KV label="Última inspección" value={new Date(r.lastInspectionAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })} />
              <KV label="Hace" value={`${inspDays} días`} accent={inspDays > 60} />
            </div>
            <div className="row-between" style={{ marginTop: 8, marginBottom: 6 }}>
              <span className="small muted">Salud del remolque</span>
              <strong>{r.health}/100</strong>
            </div>
            <div className={`bar ${r.health > 80 ? 'success' : r.health > 65 ? 'warning' : 'danger'}`}>
              <div className="fill" style={{ width: `${r.health}%` }} />
            </div>
            <button className="btn outline sm" style={{ marginTop: 16 }}>Registrar inspección</button>
          </div>

          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 12 }}>Viajes con este remolque · {myTrips.length}</div>
            {myTrips.slice(0, 5).map((trip) => (
              <Link key={trip.id} href={`/trips/${trip.id}/`}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span className={`chip status-${trip.status}`} style={{ width: 90, justifyContent: 'center' }}>
                  {trip.status.replace('_', ' ').toUpperCase()}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ fontSize: 13 }}>{trip.folio} · {trip.client}</strong>
                  <div className="caption">{trip.origin.split(',')[0]} → {trip.destination.split(',')[0]}</div>
                </div>
                <span className="small" style={{ fontWeight: 700 }}>${fmt(trip.grossAmount)}</span>
              </Link>
            ))}
            {myTrips.length === 0 ? <div className="small muted">Sin viajes históricos.</div> : null}
          </div>
        </div>

        <div className="stack-lg">
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 12 }}>Tracto enganchado</div>
            {tractor ? (
              <>
                <div className="row" style={{ gap: 12 }}>
                  <span className="icon-tile sm navy"><TruckI size={16} /></span>
                  <div>
                    <strong>{tractor.number}</strong>
                    <div className="caption">{tractor.brand} {tractor.model}</div>
                  </div>
                </div>
                <Link href={`/fleet/tractors/${tractor.id}/`} className="btn outline sm" style={{ marginTop: 12, width: '100%' }}>
                  Ver tracto
                </Link>
              </>
            ) : (
              <>
                <div className="small muted" style={{ marginBottom: 12 }}>Libre · sin tracto enganchado.</div>
                <button className="btn accent sm" style={{ width: '100%' }}>Asignar tracto</button>
              </>
            )}
          </div>

          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 12 }}>Documentación</div>
            {docs.map((d) => {
              const daysToExp = Math.ceil((+new Date(d.expiresAt) - Date.now()) / 86_400_000);
              const variant = d.status === 'expired' ? 'red' : d.status === 'expiring' ? 'amber' : 'green';
              const label = d.status === 'expired' ? `Vencido ${Math.abs(daysToExp)}d` : d.status === 'expiring' ? `Vence ${daysToExp}d` : 'Vigente';
              return (
                <div key={d.id} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className="icon-tile sm navy" style={{ marginRight: 10 }}><FileI size={14} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{d.label}</div>
                    <div className="caption">{new Date(d.expiresAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</div>
                  </div>
                  <span className={`chip ${variant}`}>{label}</span>
                </div>
              );
            })}
          </div>

          {myAlerts.length > 0 ? (
            <div className="card" style={{ borderColor: 'var(--warning)' }}>
              <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                <AlertI size={16} color="var(--warning)" />
                <strong style={{ color: 'var(--warning)' }}>Alertas · {myAlerts.length}</strong>
              </div>
              {myAlerts.map((a) => (
                <div key={a.id} style={{ paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 8 }}>
                  <strong style={{ fontSize: 13 }}>{a.title}</strong>
                  <div className="small" style={{ marginTop: 2 }}>{a.detail}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

function Spec({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="caption" style={{ marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: mono ? 'monospace' : 'inherit', fontWeight: 600 }}>{value}</div>
    </div>
  );
}
function KV({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="caption">{label}</div>
      <div style={{ fontWeight: 700, fontSize: 15, color: accent ? 'var(--warning)' : 'var(--text)', marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}
