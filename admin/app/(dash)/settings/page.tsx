'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { TierLabel } from '@/lib/tiers';
import { company } from '@/lib/demoData';
import {
  MoonI, SparklesI, BellI, MailI, LockI, ShieldI, ChevronRI,
} from '@/components/Icons';

export default function SettingsPage() {
  const night = useAppStore((s) => s.night);
  const setNight = useAppStore((s) => s.setNight);
  const tier = useAppStore((s) => s.tier);
  const [push, setPush] = useState(true);
  const [digest, setDigest] = useState(true);

  return (
    <>
      <div className="row-between" style={{ marginBottom: 24 }}>
        <div>
          <div className="eyebrow">CUENTA</div>
          <h1 className="h1">Ajustes</h1>
        </div>
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 24 }}>
        {/* Compañía */}
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 12 }}>Compañía</div>
          <div className="row" style={{ gap: 12, marginBottom: 16 }}>
            <span className="icon-tile blue"><ShieldI size={20} color="var(--blue)" /></span>
            <div>
              <strong style={{ fontSize: 17 }}>{company.name}</strong>
              <div className="caption">{company.rfc} · {company.city}</div>
            </div>
          </div>
          <Row label="Plan actual" value={TierLabel[tier]} chip />
          <Row label="Miembros activos" value={`${company.members} usuarios`} />
          <Row label="Cuenta abierta" value="Mar 2026" last />
        </div>

        {/* Plan */}
        <Link href="/plans" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ borderStyle: 'dashed', borderColor: 'var(--blue)' }}>
            <div className="row-between" style={{ marginBottom: 12 }}>
              <div className="row" style={{ gap: 10 }}>
                <span className="icon-tile sm blue"><SparklesI size={16} color="var(--blue)" /></span>
                <strong>Mi plan</strong>
              </div>
              <span className="chip blue">{TierLabel[tier].toUpperCase()}</span>
            </div>
            <div className="small" style={{ marginBottom: 16 }}>
              Cambia tu plan, ve los módulos incluidos y mejora cuando quieras. Reflejo exacto del plan en G3 Drive.
            </div>
            <div className="row" style={{ color: 'var(--blue)', fontWeight: 700, fontSize: 14 }}>
              Ver planes y precios <ChevronRI size={16} color="var(--blue)" />
            </div>
          </div>
        </Link>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 12 }}>Apariencia</div>
          <ToggleRow
            icon={<MoonI size={18} color="var(--blue)" />}
            title="Modo nocturno"
            hint="Para uso prolongado o trabajo de despacho nocturno."
            value={night}
            onChange={setNight}
          />
        </div>

        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 12 }}>Notificaciones</div>
          <ToggleRow
            icon={<BellI size={18} color="var(--blue)" />}
            title="Push en este dispositivo"
            hint="Alertas críticas de incidencias y nuevos viajes."
            value={push}
            onChange={setPush}
          />
          <ToggleRow
            icon={<MailI size={18} color="var(--blue)" />}
            title="Resumen por correo"
            hint="Reporte diario de operación a las 7am."
            value={digest}
            onChange={setDigest}
            last
          />
        </div>
      </div>

      <div className="card">
        <div className="eyebrow" style={{ marginBottom: 12 }}>Seguridad</div>
        <ActionRow icon={<LockI size={18} color="var(--blue)" />} title="Cambiar contraseña" />
        <ActionRow icon={<ShieldI size={18} color="var(--blue)" />} title="Sesiones activas (1)" last />
      </div>
    </>
  );
}

function Row({ label, value, chip, last }: { label: string; value: string; chip?: boolean; last?: boolean }) {
  return (
    <div className="row-between" style={{
      padding: '10px 0',
      borderBottom: last ? 0 : '1px solid var(--border)',
    }}>
      <span className="small muted">{label}</span>
      {chip ? <span className="chip blue">{value.toUpperCase()}</span> : <strong style={{ fontSize: 13 }}>{value}</strong>}
    </div>
  );
}

function ToggleRow({
  icon, title, hint, value, onChange, last,
}: { icon: React.ReactNode; title: string; hint: string; value: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return (
    <div className="row" style={{
      padding: '12px 0',
      borderBottom: last ? 0 : '1px solid var(--border)',
      gap: 12,
    }}>
      <span className="icon-tile sm blue">{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600 }}>{title}</div>
        <div className="caption">{hint}</div>
      </div>
      <button
        type="button"
        className={`toggle ${value ? 'on' : ''}`}
        onClick={() => onChange(!value)}
        style={{ border: 0 }}
        aria-pressed={value}
      >
        <span className="knob" />
      </button>
    </div>
  );
}

function ActionRow({ icon, title, last }: { icon: React.ReactNode; title: string; last?: boolean }) {
  return (
    <button style={{
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      gap: 12,
      padding: '12px 0',
      borderBottom: last ? 0 : '1px solid var(--border)',
      background: 'transparent',
      border: 0,
      cursor: 'pointer',
      textAlign: 'left',
    }}>
      <span className="icon-tile sm blue">{icon}</span>
      <span style={{ fontWeight: 600, flex: 1, color: 'var(--text)' }}>{title}</span>
      <ChevronRI size={16} color="var(--muted)" />
    </button>
  );
}
