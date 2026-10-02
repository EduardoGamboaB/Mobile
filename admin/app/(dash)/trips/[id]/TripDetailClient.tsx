'use client';
import Link from 'next/link';
import { tripById, driverById, unitById, incidents, logbookForTrip } from '@/lib/demoData';
import { PAYABLE_TRIP_STATUSES } from '@/lib/contracts/tripStatus';
import { tripStatusLabel } from '@/lib/tripStatusUi';
import { TripProfitabilitySection } from '@/components/ProfitabilityBreakdown';
import {
  ChevronLI, MapPinI, PackageI, AlertI, CheckI, ShieldCheckI,
} from '@/components/Icons';
import { useAppStore } from '@/lib/store';
import { Feature } from '@/lib/tiers';

const fmt = (n: number | null) =>
  n == null ? 'Sin capturar' : '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const LOG_TITLE: Record<string, string> = {
  departure: 'Salida', loading: 'Carga', stop: 'Parada', toll: 'Caseta', diesel: 'Diesel',
  incident: 'Incidencia', arrival: 'Llegada', unloading: 'Descarga', closing: 'Cierre',
};

export default function TripDetailClient({ id }: { id: string }) {
  const trip = tripById(id);
  const has = useAppStore((s) => s.has);

  if (!trip) {
    return (
      <div>
        <h2 className="h2">Viaje no encontrado</h2>
        <Link href="/trips/" className="btn outline sm" style={{ marginTop: 12 }}>Volver</Link>
      </div>
    );
  }

  const driver = driverById(trip.driverId);
  const unit = unitById(trip.tractorId);
  const tripIncidents = incidents.filter((i) => i.tripFolio === trip.folio);
  const log = logbookForTrip(trip.id);

  return (
    <>
      <Link href="/trips/" className="row" style={{ marginBottom: 20, color: 'var(--muted)', fontWeight: 600, gap: 6 }}>
        <ChevronLI size={16} /> Volver a viajes
      </Link>

      <div className="row-between" style={{ marginBottom: 24 }}>
        <div>
          <div className="eyebrow">{trip.folio} · {trip.cargo}</div>
          <h1 className="h1">{trip.client}</h1>
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <span className={`chip status-${trip.status}`}>{tripStatusLabel(trip.status)}</span>
            <span className="chip gray">{trip.tons} TON</span>
            {trip.inspectionPct === 100
              ? <span className="chip green">NOM-068 ✓</span>
              : <span className="chip amber">NOM-068 · {trip.inspectionPct}%</span>}
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn outline sm">Cambiar estatus</button>
          {trip.paymentStatus === 'pending' && PAYABLE_TRIP_STATUSES.includes(trip.status) && has(Feature.PaymentAuthorization) ? (
            <button className="btn accent sm">Autorizar pago</button>
          ) : null}
        </div>
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: '2fr 1fr', marginBottom: 24 }}>
        <div className="stack-lg">
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 12 }}>Ruta</div>
            <div className="row" style={{ gap: 12 }}>
              <span className="icon-tile sm navy"><MapPinI size={16} /></span>
              <div style={{ flex: 1 }}>
                <strong>{trip.origin}</strong>
                <div className="caption">Carga · {new Date(trip.loadDate).toLocaleString('es-MX')}</div>
              </div>
            </div>
            <div style={{ width: 2, height: 18, background: 'var(--border)', marginLeft: 15, marginTop: 4, marginBottom: 4 }} />
            <div className="row" style={{ gap: 12 }}>
              <span className="icon-tile sm blue"><PackageI size={16} color="var(--blue)" /></span>
              <div style={{ flex: 1 }}>
                <strong>{trip.destination}</strong>
                <div className="caption">
                  {trip.status === 'pre_closed' && trip.preClosedAt
                    ? `Precerrado · entregó ${new Date(trip.preClosedAt).toLocaleString('es-MX')} · en retorno a matriz`
                    : trip.closedAt
                      ? `Cerrado en matriz · ${new Date(trip.closedAt).toLocaleString('es-MX')}`
                      : `ETA · ${new Date(trip.etaUnload).toLocaleString('es-MX')}`}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 12 }}>Importes</div>
            <RowKV label={`Precio por tonelada · ${trip.tons} ton`} value={fmt(trip.pricePerTon)} />
            <RowKV label="Importe total del viaje" value={fmt(trip.freightAmount)} />
            <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '12px 0' }} />
            <RowKV label="Casetas estimadas" value={`− ${fmt(trip.estimatedTolls)}`} muted />
            <RowKV label="Diesel estimado"  value={`− ${fmt(trip.estimatedDiesel)}`} muted />
            <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '12px 0' }} />
            <RowKV label="Comisión chofer" value={fmt(trip.driverCommission)} strong />
          </div>

          <TripProfitabilitySection tripId={trip.id} />

          <div className="card">
            <div className="row-between" style={{ marginBottom: 12 }}>
              <span className="eyebrow">Bitácora del viaje</span>
              <span className="chip blue">{trip.evidenceCount} EVIDENCIAS</span>
            </div>
            {log.length === 0 ? (
              <div className="caption" style={{ paddingBottom: 12 }}>Sin registros de bitácora todavía.</div>
            ) : null}
            {log.map((e) => (
              <TimelineRow
                key={e.id}
                icon={<MapPinI size={14} color="var(--blue)" />}
                title={`${LOG_TITLE[e.eventType] ?? e.eventType} · ${e.locationText}`}
                meta={[
                  new Date(e.occurredAt).toLocaleString('es-MX'),
                  e.expenseAmount != null
                    ? fmt(e.expenseAmount)
                    : e.eventType === 'toll' || e.eventType === 'diesel' ? 'monto sin capturar' : null,
                  e.expenseAmount != null ? (e.expenseHasReceipt ? 'con ticket' : 'SIN ticket') : null,
                ].filter(Boolean).join(' · ')}
              />
            ))}
            {trip.status === 'closed' ? (
              <>
                {trip.preClosedAt ? (
                  <TimelineRow icon={<CheckI size={14} color="var(--success)" />} title="Precierre · entrega con cliente" meta={`${new Date(trip.preClosedAt).toLocaleString('es-MX')} · retorno en vacío`} />
                ) : null}
                <TimelineRow icon={<CheckI size={14} color="var(--success)" />} title="Viaje cerrado en matriz" meta={`${trip.closedAt ? new Date(trip.closedAt).toLocaleString('es-MX') : ''}`} last />
              </>
            ) : trip.status === 'pre_closed' ? (
              <>
                <TimelineRow icon={<CheckI size={14} color="var(--success)" />} title="Precierre · entrega con cliente" meta={`${trip.preClosedAt ? new Date(trip.preClosedAt).toLocaleString('es-MX') : ''} · cliente recibió`} />
                <TimelineRow icon={<MapPinI size={14} color="var(--muted)" />} title="Retorno en vacío a matriz" meta="El viaje cierra cuando la unidad llegue a matriz" last />
              </>
            ) : (
              <TimelineRow icon={<MapPinI size={14} color="var(--muted)" />} title="En camino al destino" meta={`ETA ${new Date(trip.etaUnload).toLocaleString('es-MX')}`} last />
            )}
          </div>
        </div>

        <div className="stack-lg">
          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 12 }}>Chofer asignado</div>
            <div className="row" style={{ gap: 12 }}>
              <div className="avatar lg">{driver?.initials}</div>
              <div>
                <strong>{driver?.name}</strong>
                <div className="caption">{driver?.phone}</div>
              </div>
            </div>
            <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '16px 0 12px' }} />
            <div className="row-between" style={{ marginBottom: 6 }}>
              <span className="small muted">Score</span>
              <span className={`score-chip ${(driver?.score ?? 0) > 85 ? 'high' : 'medium'}`}>★ {driver?.score}</span>
            </div>
            <div className="row-between"><span className="small muted">A tiempo</span><span className="small">{driver?.onTimePct}%</span></div>
            <div className="row-between"><span className="small muted">km/L promedio</span><span className="small">{driver?.kmPerLiter}</span></div>
          </div>

          <div className="card">
            <div className="eyebrow" style={{ marginBottom: 12 }}>Unidad asignada</div>
            <div className="row" style={{ gap: 12 }}>
              <span className="icon-tile sm navy"><PackageI size={16} /></span>
              <div>
                <strong>{unit?.number}</strong>
                <div className="caption">{`${unit?.brand} ${unit?.model}`} · {unit?.plates}</div>
              </div>
            </div>
            <div className="row-between" style={{ marginTop: 16 }}>
              <span className="small muted">Salud (mantenimiento)</span>
              <span className="small" style={{ fontWeight: 700 }}>{unit?.health}/100</span>
            </div>
            <div className="bar" style={{ marginTop: 6 }}>
              <div className="fill" style={{ width: `${unit?.health}%`, background: (unit?.health ?? 0) > 80 ? 'var(--success)' : 'var(--warning)' }} />
            </div>
          </div>

          <div className="card">
            <div className="row-between" style={{ marginBottom: 8 }}>
              <span className="eyebrow">Inspección NOM-068</span>
              <ShieldCheckI size={16} color={trip.inspectionPct === 100 ? 'var(--success)' : 'var(--warning)'} />
            </div>
            <div className="row-between" style={{ marginBottom: 8 }}>
              <span className="small">{trip.inspectionPct === 100 ? 'Completa' : 'Pendiente'}</span>
              <strong>{trip.inspectionPct}%</strong>
            </div>
            <div className={`bar ${trip.inspectionPct === 100 ? 'success' : 'warning'}`}>
              <div className="fill" style={{ width: `${trip.inspectionPct}%` }} />
            </div>
            <div className="caption" style={{ marginTop: 8 }}>36 puntos · 13 categorías</div>
          </div>

          {tripIncidents.length > 0 ? (
            <div className="card" style={{ borderColor: 'var(--danger)' }}>
              <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                <AlertI size={16} color="var(--danger)" />
                <strong style={{ color: 'var(--danger)' }}>Incidencias del viaje</strong>
              </div>
              {tripIncidents.map((i) => (
                <div key={i.id} style={{ paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 8 }}>
                  <div className="row-between">
                    <strong style={{ fontSize: 13 }}>{i.type}</strong>
                    <span className={`chip ${i.resolved ? 'green' : 'red'}`}>
                      {i.resolved ? 'RESUELTA' : i.urgency.toUpperCase()}
                    </span>
                  </div>
                  <div className="small" style={{ marginTop: 4 }}>{i.description}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

function RowKV({ label, value, muted, strong }: { label: string; value: string; muted?: boolean; strong?: boolean }) {
  return (
    <div className="row-between" style={{ padding: '4px 0' }}>
      <span className={muted ? 'small muted' : 'small'} style={{ color: muted ? 'var(--muted)' : 'var(--text-soft)' }}>{label}</span>
      <span style={{
        fontWeight: strong ? 800 : 600,
        fontSize: strong ? 18 : 14,
        color: strong ? 'var(--blue)' : 'var(--text)',
      }}>{value}</span>
    </div>
  );
}

function TimelineRow({ icon, title, meta, last }: { icon: React.ReactNode; title: string; meta: string; last?: boolean }) {
  return (
    <div className="row" style={{ alignItems: 'flex-start', gap: 12, paddingBottom: last ? 0 : 16, position: 'relative' }}>
      <span className="icon-tile sm blue" style={{ width: 30, height: 30, borderRadius: '50%' }}>{icon}</span>
      {!last ? <div style={{ position: 'absolute', left: 14, top: 32, bottom: 0, width: 2, background: 'var(--border)' }} /> : null}
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
        <div className="caption">{meta}</div>
      </div>
    </div>
  );
}
