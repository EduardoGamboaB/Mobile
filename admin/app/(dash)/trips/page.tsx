'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPinI, FilterI, PlusI, SearchI, RefreshI } from '@/components/Icons';
import { isInMotion, paymentChip, tripStatusLabel } from '@/lib/tripStatusUi';
import { isLive } from '@/lib/api/config';
import { demoTripList, getTripList, tripHref, type TripView } from '@/lib/trips';

type Filter = 'all' | 'active' | 'scheduled' | 'closed' | 'cancelled';

const fmt = (n: number | null) =>
  n == null ? '—' : '$' + n.toLocaleString('es-MX', { maximumFractionDigits: 0 });

export default function TripsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  // En demo los datos están listos desde el primer render; con backend, se cargan.
  const [trips, setTrips] = useState<TripView[] | null>(() => (isLive ? null : demoTripList()));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isLive) return;
    setError(null);
    try {
      setTrips(await getTripList());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const all = trips ?? [];
  const filtered = all.filter((t) => {
    if (filter === 'active' && !isInMotion(t.status)) return false;
    if (filter === 'scheduled' && t.status !== 'scheduled') return false;
    if (filter === 'closed' && t.status !== 'closed') return false;
    if (filter === 'cancelled' && t.status !== 'cancelled') return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.folio.toLowerCase().includes(q) ||
        t.client.toLowerCase().includes(q) ||
        t.origin.toLowerCase().includes(q) ||
        t.destination.toLowerCase().includes(q) ||
        (t.driver?.name.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  return (
    <>
      <div className="row-between" style={{ marginBottom: 24 }}>
        <div>
          <div className="eyebrow">OPERACIÓN</div>
          <h1 className="h1">Viajes</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {isLive ? <button className="btn outline sm" onClick={() => void load()}><RefreshI size={16} /> Actualizar</button> : null}
          <button className="btn outline sm"><FilterI size={16} /> Filtros</button>
          <Link href="/trips/new/" className="btn primary sm"><PlusI size={16} /> Nuevo viaje</Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: 12 }}>
        <div className="row" style={{ gap: 12 }}>
          <div className="search" style={{ background: 'var(--surface)', border: '1px solid var(--border)', height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', padding: '0 14px', flex: 1, gap: 10 }}>
            <SearchI size={16} color="var(--muted)" />
            <input
              placeholder="Buscar por folio, cliente, origen, destino o chofer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, border: 0, outline: 0, background: 'transparent', color: 'var(--text)' }}
            />
          </div>
          <div className="row" style={{ gap: 6 }}>
            <FilterChip label="Todos"        active={filter === 'all'}       onClick={() => setFilter('all')} count={all.length} />
            <FilterChip label="Activos"      active={filter === 'active'}    onClick={() => setFilter('active')} count={all.filter(t => isInMotion(t.status)).length} />
            <FilterChip label="Programados"  active={filter === 'scheduled'} onClick={() => setFilter('scheduled')} count={all.filter(t => t.status === 'scheduled').length} />
            <FilterChip label="Cerrados"     active={filter === 'closed'}    onClick={() => setFilter('closed')} count={all.filter(t => t.status === 'closed').length} />
          </div>
        </div>
      </div>

      {error ? (
        <div className="banner danger" style={{ marginBottom: 16 }}>
          <span style={{ flex: 1 }}>No se pudieron cargar los viajes: {error}</span>
          <button className="btn outline sm" onClick={() => void load()}>Reintentar</button>
        </div>
      ) : null}

      {trips === null && !error ? (
        <div className="card small muted" role="status">Cargando viajes…</div>
      ) : trips !== null ? (
        <table className="table">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Cliente / carga</th>
              <th>Ruta</th>
              <th>Chofer · unidad</th>
              <th>Estatus</th>
              <th style={{ textAlign: 'right' }}>Importe</th>
              <th style={{ textAlign: 'right' }}>Comisión</th>
              <th>Pago</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="small muted" style={{ textAlign: 'center' }}>
                {all.length === 0 ? 'Aún no hay viajes.' : 'Sin viajes para este filtro.'}
              </td></tr>
            ) : null}
            {filtered.map((t) => {
              const pay = paymentChip(t.status, t.paymentStatus);
              const href = tripHref(t.id);
              return (
                <tr key={t.id} onClick={() => router.push(href)}>
                  <td>
                    <Link href={href} style={{ color: 'var(--blue)', fontWeight: 700 }}>
                      {t.folio}
                    </Link>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.client}</div>
                    <div className="caption">{t.cargo}</div>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <MapPinI size={14} color="var(--blue)" />
                      <span className="small">{t.origin.split(',')[0]} → {t.destination.split(',')[0]}</span>
                    </div>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 8 }}>
                      <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{t.driver?.initials ?? '—'}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{t.driver ? t.driver.name.split(' ').slice(0, 2).join(' ') : 'Sin chofer'}</div>
                        <div className="caption">{t.unit?.number ?? '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`chip status-${t.status}`}>{tripStatusLabel(t.status)}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(t.freightAmount)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--blue)', fontWeight: 700 }}>{fmt(t.driverCommission)}</td>
                  <td>
                    {pay ? <span className={`chip ${pay.variant}`}>{pay.label}</span> : <span className="caption">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}
    </>
  );
}

function FilterChip({ label, active, onClick, count }: { label: string; active: boolean; onClick: () => void; count: number }) {
  return (
    <button onClick={onClick} className={`chip ${active ? 'navy' : 'gray'}`} style={{ border: 0, cursor: 'pointer' }}>
      {label} · {count}
    </button>
  );
}
