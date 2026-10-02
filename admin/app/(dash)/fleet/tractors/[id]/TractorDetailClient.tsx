'use client';
import { tripStatusLabel } from '@/lib/tripStatusUi';
import Link from 'next/link';
import {
  tractorById, driverById, trips, documentsForOwner, alertsByEntity,
} from '@/lib/demoData';
import {
  ChevronLI, TruckI, AlertI, FileI, MapPinI, CheckI, ShieldI, ClockI,
} from '@/components/Icons';

const fmt = (n: number) => n.toLocaleString('es-MX');
const statusVariant = (s: string) =>
  s === 'active' ? 'green' : s === 'maintenance' ? 'amber' : 'gray';

export default function TractorDetailClient({ id }: { id: string }) {
  const t = tractorById(id);
  if (!t) return <div>No encontrado.</div>;
  const driver = t.driverId ? driverById(t.driverId) : null;
  const myTrips = trips.filter((x) => x.tractorId === id);
  const lastTrip = myTrips[0];
  const docs = documentsForOwner('tractor', id);
  const myAlerts = alertsByEntity('tractor', id);

  const kmToService = t.nextServiceKm - t.mileageKm;

  return (
    <>
      <Link href="/fleet/tractors/" className="row" style={{ marginBottom: 20, color: 'var(--muted)', fontWeight: 600, gap: 6 }}>
        <ChevronLI size={16} /> Volver a tractos
      </Link>

      <div className="row-between" style={{ marginBottom: 24 }}>
        <div className="row" style={{ gap: 16 }}>
          <span className="icon-tile blue" style={{ width: 56, height: 56, borderRadius: 14 }}>
            <TruckI size={26} color="var(--blue)" />
          </span>
          <div>
            <div className="eyebrow">TRACTO · {t.brand} {t.model} {t.year}</div>
            <h1 className="h1">{t.number}</h1>
            <div className="row" style={{ gap: 8, marginTop: 6 }}>
              <span className={`chip ${statusVariant(t.status)}`}>{t.status.toUpperCase()}</span>
              <span className="chip gray">{t.horsepower} HP</span>
              <span className="chip gray">{t.fuel}</span>
            </div>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn outline sm">Editar</button>
          <button className="btn primary sm">Asignar operador</button>
        </div>
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: '2fr 1fr', marginBottom: 24, gap: 20 }}>
        <div className="stack-lg">
          {/* Especificaciones */}
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 12 }}>Especificaciones</div>
            <div className="grid-2" style={{ gap: 16 }}>
              <Spec label="Placas"       value={t.plates} />
              <Spec label="VIN / Serie"  value={t.vin} mono />
              <Spec label="Marca · Modelo" value={`${t.brand} ${t.model}`} />
              <Spec label="Año"          value={String(t.year)} />
              <Spec label="Combustible"  value={t.fuel.toUpperCase()} />
              <Spec label="Potencia"     value={`${t.horsepower} HP`} />
            </div>
          </div>

          {/* Mantenimiento */}
          <div className="card">
            <div className="row-between" style={{ marginBottom: 12 }}>
              <span className="eyebrow">Mantenimiento</span>
              {kmToService < 5000 ? <span className="chip amber">SERVICIO PRÓXIMO</span> : <span className="chip green">AL DÍA</span>}
            </div>
            <div className="grid-3" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <KV label="Kilometraje actual" value={`${fmt(t.mileageKm)} km`} />
              <KV label="Último servicio"    value={`${fmt(t.lastServiceKm)} km`} />
              <KV label="Próximo servicio"   value={`${fmt(t.nextServiceKm)} km`} accent />
            </div>
            <div className="row-between" style={{ marginTop: 16, marginBottom: 6 }}>
              <span className="small muted">Salud del tracto</span>
              <strong>{t.health}/100</strong>
            </div>
            <div className={`bar ${t.health > 80 ? 'success' : t.health > 60 ? 'warning' : 'danger'}`}>
              <div className="fill" style={{ width: `${t.health}%` }} />
            </div>
            <button className="btn outline sm" style={{ marginTop: 16 }}>Registrar servicio</button>
          </div>

          {/* Historial de viajes */}
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 12 }}>Viajes recientes · {myTrips.length} total</div>
            {myTrips.slice(0, 5).map((trip) => (
              <Link
                key={trip.id}
                href={`/trips/${trip.id}/`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0', borderBottom: '1px solid var(--border)',
                }}
              >
                <span className={`chip status-${trip.status}`} style={{ width: 90, justifyContent: 'center' }}>
                  {tripStatusLabel(trip.status)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ fontSize: 13 }}>{trip.folio} · {trip.client}</strong>
                  <div className="caption">
                    <MapPinI size={12} /> {trip.origin.split(',')[0]} → {trip.destination.split(',')[0]}
                  </div>
                </div>
                <span className="small" style={{ fontWeight: 700 }}>${fmt(trip.freightAmount ?? 0)}</span>
              </Link>
            ))}
            {myTrips.length === 0 ? <div className="small muted">Sin viajes asignados.</div> : null}
          </div>
        </div>

        {/* Sidebar */}
        <div className="stack-lg">
          {/* Operador asignado */}
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 12 }}>Operador asignado</div>
            {driver ? (
              <>
                <div className="row" style={{ gap: 12 }}>
                  <div className="avatar lg">{driver.initials}</div>
                  <div>
                    <strong>{driver.name}</strong>
                    <div className="caption">{driver.phone}</div>
                  </div>
                </div>
                <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '14px 0' }} />
                <KV label="Score"     value={`★ ${driver.score}`} />
                <KV label="A tiempo"  value={`${driver.onTimePct}%`} />
                <KV label="Licencia"  value={driver.license} />
              </>
            ) : (
              <>
                <div className="small muted" style={{ marginBottom: 12 }}>Sin operador asignado.</div>
                <button className="btn accent sm">Asignar operador</button>
              </>
            )}
          </div>

          {/* Documentación */}
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 12 }}>Documentación</div>
            {docs.map((d) => {
              const daysToExp = Math.ceil((+new Date(d.expiresAt) - Date.now()) / 86_400_000);
              const variant = d.status === 'expired' ? 'red' : d.status === 'expiring' ? 'amber' : 'green';
              const label = d.status === 'expired' ? `Vencido hace ${Math.abs(daysToExp)}d` : d.status === 'expiring' ? `Vence en ${daysToExp}d` : 'Vigente';
              return (
                <div key={d.id} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className="icon-tile sm navy" style={{ marginRight: 10 }}><FileI size={14} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{d.label}</div>
                    <div className="caption">{new Date(d.expiresAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  </div>
                  <span className={`chip ${variant}`}>{label}</span>
                </div>
              );
            })}
          </div>

          {/* Alertas */}
          {myAlerts.length > 0 ? (
            <div className="card" style={{ borderColor: 'var(--danger)' }}>
              <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                <AlertI size={16} color="var(--danger)" />
                <strong style={{ color: 'var(--danger)' }}>Alertas abiertas · {myAlerts.length}</strong>
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
      <div style={{ fontWeight: 700, fontSize: 16, color: accent ? 'var(--blue)' : 'var(--text)', marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}
