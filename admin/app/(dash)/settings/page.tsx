'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { TierLabel } from '@/lib/tiers';
import { company } from '@/lib/demoData';
import { isLive } from '@/lib/api/config';
import {
  MoonI, SparklesI, BellI, MailI, LockI, ShieldI, ChevronRI,
} from '@/components/Icons';
import { SecurityCard } from '@/components/SecurityCard';

export default function SettingsPage() {
  const night = useAppStore((s) => s.night);
  const setNight = useAppStore((s) => s.setNight);
  const tier = useAppStore((s) => s.tier);
  const expensePolicy = useAppStore((s) => s.expensePolicy);
  const setExpensePolicy = useAppStore((s) => s.setExpensePolicy);
  const loadExpensePolicy = useAppStore((s) => s.loadExpensePolicy);
  const saveExpensePolicy = useAppStore((s) => s.saveExpensePolicy);
  const [policySync, setPolicySync] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [push, setPush] = useState(true);

  // Con backend la regla vive en GET/PUT /expense-policy; en demo, en localStorage.
  useEffect(() => {
    if (!isLive) return;
    loadExpensePolicy().catch(() => setPolicySync('error'));
  }, [loadExpensePolicy]);

  const savePolicy = (patch: Parameters<typeof saveExpensePolicy>[0]) => {
    if (!isLive) {
      setExpensePolicy(patch);
      return;
    }
    setPolicySync('saving');
    saveExpensePolicy(patch)
      .then(() => setPolicySync('saved'))
      .catch(() => setPolicySync('error'));
  };
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

      {/* Regla de gastos — gobierna lo que el chofer puede capturar en G3 Drive */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="row-between" style={{ marginBottom: 4 }}>
          <div className="eyebrow">Reglas de gastos · G3 Drive</div>
          <div className="row" style={{ gap: 6 }}>
            {isLive ? (
              <span className={`chip ${policySync === 'error' ? 'red' : policySync === 'saving' ? 'amber' : 'green'}`}>
                {policySync === 'error' ? 'SIN SINCRONIZAR' : policySync === 'saving' ? 'GUARDANDO…' : 'EN SERVIDOR'}
              </span>
            ) : (
              <span className="chip gray">DEMO · LOCAL</span>
            )}
            <span className="chip blue">APLICA A CHOFERES</span>
          </div>
        </div>
        <div className="small" style={{ marginBottom: 12 }}>
          Todo gasto con foto de ticket se lee con IA. Aquí decides qué pasa
          con los gastos <strong>sin comprobante</strong>.
        </div>
        <ToggleRow
          icon={<ShieldI size={18} color="var(--blue)" />}
          title="Exigir ticket en todos los gastos"
          hint="Si está activo, el chofer no puede registrar ningún gasto sin foto."
          value={expensePolicy.requireReceipt}
          onChange={(v) => savePolicy({ requireReceipt: v })}
        />
        <ToggleRow
          icon={<LockI size={18} color="var(--blue)" />}
          title="Permitir gastos manuales sin ticket"
          hint="El chofer captura monto y concepto a mano (sujeto al tope de abajo)."
          value={expensePolicy.allowManualExpense}
          onChange={(v) => savePolicy({ allowManualExpense: v })}
        />
        <div className="row" style={{ padding: '12px 0', gap: 12 }}>
          <span className="icon-tile sm blue"><BellI size={18} color="var(--blue)" /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>Tope por gasto sin ticket (MXN)</div>
            <div className="caption">Vacío = sin tope. Arriba del tope, la app exige foto.</div>
          </div>
          <input
            type="number"
            min={0}
            step={50}
            placeholder="Sin tope"
            value={expensePolicy.manualMaxAmount ?? ''}
            disabled={expensePolicy.requireReceipt || !expensePolicy.allowManualExpense}
            onChange={(e) => {
              const v = e.target.value;
              setExpensePolicy({ manualMaxAmount: v === '' ? null : Math.max(0, Number(v)) });
            }}
            onBlur={() => savePolicy({})}
            style={{
              width: 120,
              padding: '8px 10px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
              fontWeight: 700,
              textAlign: 'right',
            }}
          />
        </div>
        <div className="caption" style={{ color: 'var(--muted)' }}>
          Regla vigente:{' '}
          {expensePolicy.requireReceipt
            ? 'todo gasto exige foto de ticket.'
            : !expensePolicy.allowManualExpense
              ? 'no se permiten gastos sin comprobante.'
              : expensePolicy.manualMaxAmount != null
                ? `sin ticket hasta $${expensePolicy.manualMaxAmount.toLocaleString('es-MX')} MXN; arriba, foto obligatoria.`
                : 'gastos sin ticket permitidos sin tope.'}
        </div>
      </div>

      {/* Seguridad: MFA, códigos de recuperación, MFA por rol, SSO y bitácora */}
      <SecurityCard />

      <div className="card">
        <div className="eyebrow" style={{ marginBottom: 12 }}>Cuenta</div>
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
