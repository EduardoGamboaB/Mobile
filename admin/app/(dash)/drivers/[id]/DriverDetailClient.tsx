'use client';
import { tripStatusLabel } from '@/lib/tripStatusUi';
import { PAYABLE_TRIP_STATUSES } from '@/lib/contracts/tripStatus';
import Link from 'next/link';
import {
  driverById, tractors, trips, documentsForOwner, alertsByEntity,
} from '@/lib/demoData';
import {
  ChevronLI, PhoneI, MailI, FileI, AlertI, ShieldI, MapPinI, TruckI, CreditCardI,
} from '@/components/Icons';
import { useAppStore } from '@/lib/store';
import { Feature } from '@/lib/tiers';
import { DriverAccessButton } from '@/components/DriverAccessButton';

const fmt = (n: number) => '$' + n.toLocaleString('es-MX', { maximumFractionDigits: 0 });
const statusLabel = (s: string) =>
  s === 'on_trip' ? 'EN RUTA' : s === 'active' ? 'DISPONIBLE' : s === 'inactive' ? 'INACTIVO' : 'SUSPENDIDO';
const statusVariant = (s: string) =>
  s === 'on_trip' ? 'blue' : s === 'active' ? 'green' : s === 'suspended' ? 'red' : 'gray';
const scoreBand = (s: number) => s >= 90 ? 'high' : s >= 75 ? 'medium' : 'low';

export default function DriverDetailClient({ id }: { id: string }) {
  const d = driverById(id);
  const has = useAppStore((s) => s.has);
  if (!d) return <div>No encontrado.</div>;

  const tractor = d.unitNumber ? tractors.find((t) => t.number === d.unitNumber) : null;
  const myTrips = trips.filter((t) => t.driverId === id);
  const docs = documentsForOwner('driver', id);
  const myAlerts = alertsByEntity('driver', id);
  const totalEarnings = myTrips
    .filter((t) => t.paymentStatus === 'released')
    .reduce((s, t) => s + t.driverCommission, 0);

  return (
    <>
      <Link href="/drivers/" className="row" style={{ marginBottom: 20, color: 'var(--muted)', fontWeight: 600, gap: 6 }}>
        <ChevronLI size={16} /> Volver a operadores
      </Link>

      <div className="row-between" style={{ marginBottom: 24 }}>
        <div className="row" style={{ gap: 16 }}>
          <div className="avatar lg">{d.initials}</div>
          <div>
            <div className="eyebrow">OPERADOR · LICENCIA {d.license}</div>
            <h1 className="h1">{d.name}</h1>
            <div className="row" style={{ gap: 8, marginTop: 6 }}>
              <span className={`chip ${statusVariant(d.status)}`}>{statusLabel(d.status)}</span>
              {has(Feature.Scoring) ? (
                <span className={`score-chip ${scoreBand(d.score)}`}>
                  <ShieldI size={12} /> SCORE {d.score}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <DriverAccessButton driver={{ id: d.id, name: d.name, phone: d.phone, email: d.email }} size="md" />
          <button className="btn outline sm">Suspender</button>
          <button className="btn primary sm">Asignar viaje</button>
        </div>
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: '2fr 1fr', marginBottom: 24, gap: 20 }}>
        <div className="stack-lg">
          {/* Desempeño */}
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 12 }}>Desempeño (últimos 30 días)</div>
            <div className="grid-4">
              <Stat label="Score"     value={String(d.score)}    suffix="/100" />
              <Stat label="A tiempo"  value={`${d.onTimePct}`}   suffix="%" />
              <Stat label="km / L"    value={String(d.kmPerLiter)} />
              <Stat label="Incidentes 12m" value={String(d.incidents12m)} warn={d.incidents12m > 0} />
            </div>
          </div>

          {/* Ingresos */}
          <div className="card">
            <div className="row-between" style={{ marginBottom: 12 }}>
              <span className="eyebrow">Compensación</span>
              <span className="chip blue">{myTrips.length} VIAJES TOTALES</span>
            </div>
            <div className="grid-3">
              <KV label="Ingresos del mes" value={fmt(d.earningsMonthMXN)} accent />
              <KV label="Cobrado total"    value={fmt(totalEarnings)} />
              <KV label="Pendiente"        value={fmt(
                myTrips.filter((t) => t.paymentStatus === 'pending' && PAYABLE_TRIP_STATUSES.includes(t.status))
                       .reduce((s, t) => s + t.driverCommission, 0),
              )} />
            </div>
          </div>

          {/* Historial de viajes */}
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 12 }}>Historial de viajes</div>
            {myTrips.slice(0, 8).map((trip) => (
              <Link
                key={trip.id}
                href={`/trips/${trip.id}/`}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}
              >
                <span className={`chip status-${trip.status}`} style={{ width: 96, justifyContent: 'center' }}>
                  {tripStatusLabel(trip.status)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ fontSize: 13 }}>{trip.folio} · {trip.client}</strong>
                  <div className="caption">
                    <MapPinI size={12} /> {trip.origin.split(',')[0]} → {trip.destination.split(',')[0]}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong className="small" style={{ color: 'var(--blue)' }}>+${fmt(trip.driverCommission).slice(1)}</strong>
                  <div className="caption">{trip.closedAt ? new Date(trip.closedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '—'}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="stack-lg">
          {/* Contacto */}
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 12 }}>Contacto</div>
            <Line icon={<PhoneI size={16} />} label="Teléfono" value={d.phone} />
            <Line icon={<MailI size={16} />}  label="Correo" value={d.email} last />
          </div>

          {/* Unidad asignada */}
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 12 }}>Unidad asignada</div>
            {tractor ? (
              <>
                <div className="row" style={{ gap: 12 }}>
                  <span className="icon-tile sm navy"><TruckI size={16} /></span>
                  <div>
                    <strong>{tractor.number}</strong>
                    <div className="caption">{tractor.brand} {tractor.model} · {tractor.year}</div>
                  </div>
                </div>
                <Link href={`/fleet/tractors/${tractor.id}/`} className="btn outline sm" style={{ marginTop: 12, width: '100%' }}>
                  Ver tracto
                </Link>
              </>
            ) : (
              <div className="small muted">Sin tracto asignado.</div>
            )}
          </div>

          {/* Documentos */}
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 12 }}>Documentos</div>
            {docs.map((doc) => {
              const daysToExp = Math.ceil((+new Date(doc.expiresAt) - Date.now()) / 86_400_000);
              const variant = doc.status === 'expired' ? 'red' : doc.status === 'expiring' ? 'amber' : 'green';
              const label = doc.status === 'expired' ? `Vencido ${Math.abs(daysToExp)}d` : doc.status === 'expiring' ? `Vence ${daysToExp}d` : 'Vigente';
              return (
                <div key={doc.id} className="row" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <span className="icon-tile sm navy" style={{ marginRight: 10 }}><FileI size={14} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{doc.label}</div>
                    <div className="caption">{new Date(doc.expiresAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
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

function Stat({ label, value, suffix, warn }: { label: string; value: string; suffix?: string; warn?: boolean }) {
  return (
    <div>
      <div className="caption" style={{ marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: warn ? 'var(--warning)' : 'var(--text)' }}>
        {value}<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>{suffix}</span>
      </div>
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
function Line({ icon, label, value, last }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <div className="row" style={{ padding: '10px 0', borderBottom: last ? 0 : '1px solid var(--border)' }}>
      <span className="icon-tile sm navy" style={{ marginRight: 10 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="caption">{label}</div>
        <div className="small" style={{ fontWeight: 600 }}>{value}</div>
      </div>
    </div>
  );
}
