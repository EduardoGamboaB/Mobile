'use client';
import Link from 'next/link';
import { tractors, drivers } from '@/lib/demoData';
import { PlusI, TruckI, FilterI } from '@/components/Icons';

const statusVariant = (s: string) =>
  s === 'active' ? 'green' : s === 'maintenance' ? 'amber' : s === 'parked' ? 'gray' : 'red';
const statusLabel = (s: string) =>
  s === 'active' ? 'ACTIVO' : s === 'maintenance' ? 'MANTENIMIENTO' : s === 'parked' ? 'EN PATIO' : 'VENDIDO';

export default function TractorsPage() {
  return (
    <>
      <div className="row-between" style={{ marginBottom: 24 }}>
        <div>
          <div className="eyebrow">FLOTILLA</div>
          <h1 className="h1">Tractos</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn outline sm"><FilterI size={16} /> Filtros</button>
          <button className="btn primary sm"><PlusI size={16} /> Alta de tracto</button>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        <Stat label="TOTAL" value={tractors.length} />
        <Stat label="ACTIVOS" value={tractors.filter((t) => t.status === 'active').length} />
        <Stat label="EN MANTENIMIENTO" value={tractors.filter((t) => t.status === 'maintenance').length} warn />
        <Stat label="EN PATIO" value={tractors.filter((t) => t.status === 'parked').length} />
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Unidad</th>
            <th>Marca · modelo · año</th>
            <th>Placas / VIN</th>
            <th>Operador asignado</th>
            <th>Estatus</th>
            <th>Salud</th>
            <th>Kilometraje</th>
            <th>Servicio</th>
          </tr>
        </thead>
        <tbody>
          {tractors.map((t) => {
            const driver = drivers.find((d) => d.id === t.driverId);
            const kmToService = t.nextServiceKm - t.mileageKm;
            const serviceWarn = kmToService < 5000;
            return (
              <tr key={t.id} onClick={() => (window.location.href = `/fleet/tractors/${t.id}/`)}>
                <td>
                  <div className="row" style={{ gap: 10 }}>
                    <span className="icon-tile sm navy"><TruckI size={16} /></span>
                    <div>
                      <Link href={`/fleet/tractors/${t.id}/`} style={{ color: 'var(--blue)', fontWeight: 700 }}>
                        {t.number}
                      </Link>
                      <div className="caption">{t.horsepower} HP · {t.fuel}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <strong>{t.brand} {t.model}</strong>
                  <div className="caption">Año {t.year}</div>
                </td>
                <td>
                  <strong>{t.plates}</strong>
                  <div className="caption" style={{ fontFamily: 'monospace', fontSize: 11 }}>{t.vin}</div>
                </td>
                <td>
                  {driver ? (
                    <div className="row" style={{ gap: 8 }}>
                      <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{driver.initials}</div>
                      <span className="small">{driver.name.split(' ').slice(0, 2).join(' ')}</span>
                    </div>
                  ) : <span className="caption">Sin asignar</span>}
                </td>
                <td><span className={`chip ${statusVariant(t.status)}`}>{statusLabel(t.status)}</span></td>
                <td>
                  <div className="row" style={{ gap: 8 }}>
                    <div className={`bar ${t.health > 80 ? 'success' : t.health > 60 ? 'warning' : 'danger'}`} style={{ width: 60 }}>
                      <div className="fill" style={{ width: `${t.health}%` }} />
                    </div>
                    <span className="small">{t.health}/100</span>
                  </div>
                </td>
                <td>{t.mileageKm.toLocaleString('es-MX')} km</td>
                <td>
                  {serviceWarn ? (
                    <span className="chip amber">{kmToService.toLocaleString('es-MX')} km</span>
                  ) : (
                    <span className="small">{kmToService.toLocaleString('es-MX')} km</span>
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

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="kpi">
      <span className="label">{label}</span>
      <div className="value" style={warn && value > 0 ? { color: 'var(--warning)' } : {}}>{value}</div>
    </div>
  );
}
