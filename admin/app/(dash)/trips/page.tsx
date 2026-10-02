'use client';
import { useState } from 'react';
import Link from 'next/link';
import { trips, drivers, units } from '@/lib/demoData';
import { MapPinI, FilterI, PlusI, SearchI } from '@/components/Icons';
import { isInMotion, paymentChip, tripStatusLabel } from '@/lib/tripStatusUi';

type Filter = 'all' | 'active' | 'scheduled' | 'closed' | 'cancelled';

const fmt = (n: number | null) =>
  n == null ? '—' : '$' + n.toLocaleString('es-MX', { maximumFractionDigits: 0 });

export default function TripsPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const filtered = trips.filter((t) => {
    if (filter === 'active' && !isInMotion(t.status)) return false;
    if (filter === 'scheduled' && t.status !== 'scheduled') return false;
    if (filter === 'closed' && t.status !== 'closed') return false;
    if (filter === 'cancelled' && t.status !== 'cancelled') return false;
    if (search) {
      const q = search.toLowerCase();
      const driver = drivers.find((d) => d.id === t.driverId);
      return (
        t.folio.toLowerCase().includes(q) ||
        t.client.toLowerCase().includes(q) ||
        t.origin.toLowerCase().includes(q) ||
        t.destination.toLowerCase().includes(q) ||
        (driver?.name.toLowerCase().includes(q) ?? false)
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
            <FilterChip label="Todos"        active={filter === 'all'}       onClick={() => setFilter('all')} count={trips.length} />
            <FilterChip label="Activos"      active={filter === 'active'}    onClick={() => setFilter('active')} count={trips.filter(t => isInMotion(t.status)).length} />
            <FilterChip label="Programados"  active={filter === 'scheduled'} onClick={() => setFilter('scheduled')} count={trips.filter(t => t.status === 'scheduled').length} />
            <FilterChip label="Cerrados"     active={filter === 'closed'}    onClick={() => setFilter('closed')} count={trips.filter(t => t.status === 'closed').length} />
          </div>
        </div>
      </div>

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
          {filtered.map((t) => {
            const driver = drivers.find((d) => d.id === t.driverId);
            const unit = units.find((u) => u.id === t.tractorId);
            const pay = paymentChip(t.status, t.paymentStatus);
            return (
              <tr key={t.id} onClick={() => (window.location.href = `/trips/${t.id}/`)}>
                <td>
                  <Link href={`/trips/${t.id}/`} style={{ color: 'var(--blue)', fontWeight: 700 }}>
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
                    <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{driver?.initials}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{driver?.name.split(' ').slice(0,2).join(' ')}</div>
                      <div className="caption">{unit?.number ?? '—'}</div>
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
