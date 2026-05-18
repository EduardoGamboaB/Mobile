'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  drivers, tractors, trailers, TrailerTypeLabel, type TrailerType,
} from '@/lib/demoData';
import {
  ChevronLI, TruckI, UserI, PackageI, MapPinI, SparklesI, CheckI,
} from '@/components/Icons';

interface Form {
  client: string;
  cargo: string;
  origin: string;
  destination: string;
  loadDate: string;
  tons: string;
  pricePerTon: string;
  trailerType: TrailerType | '';
  tractorId: string;
  trailerId: string;
  driverId: string;
}

const INITIAL: Form = {
  client: '',
  cargo: '',
  origin: '',
  destination: '',
  loadDate: '',
  tons: '',
  pricePerTon: '',
  trailerType: '',
  tractorId: '',
  trailerId: '',
  driverId: '',
};

export default function NewTripPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<Form>(INITIAL);
  const [done, setDone] = useState(false);

  // Filtros AI: tractor disponible (no en mantenimiento/vendido)
  const availableTractors = useMemo(
    () => tractors.filter((t) => t.status === 'active'),
    [],
  );
  // Remolques del tipo solicitado
  const availableTrailers = useMemo(() => {
    return trailers.filter((r) => r.status === 'active' && (!form.trailerType || r.type === form.trailerType));
  }, [form.trailerType]);

  // Recomendación AI: chofer con mejor score y disponible
  const recommendedDriver = useMemo(() => {
    const candidates = drivers
      .filter((d) => d.status !== 'inactive' && d.status !== 'suspended')
      .sort((a, b) => b.score - a.score);
    return candidates[0];
  }, []);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const tons = Number(form.tons) || 0;
  const price = Number(form.pricePerTon) || 0;
  const gross = tons * price;
  const commission = Math.round(gross * 0.1);

  const canStep2 = form.client && form.origin && form.destination && form.loadDate && tons > 0 && price > 0;
  const canStep3 = canStep2 && form.tractorId && form.trailerId;
  const canSubmit = canStep3 && form.driverId;

  const submit = () => setDone(true);

  if (done) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center' }}>
        <div className="icon-tile" style={{ width: 72, height: 72, borderRadius: 36, margin: '0 auto 16px', background: 'var(--success-bg)' }}>
          <CheckI size={36} color="var(--success)" />
        </div>
        <h1 className="h1">Viaje asignado</h1>
        <p className="small" style={{ marginTop: 8, marginBottom: 24 }}>
          Se creó el viaje y se notificó al operador en G3 Drive. La inspección NOM-068 se desbloquea automáticamente al iniciar carga.
        </p>
        <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
          <Link href="/trips/" className="btn primary">Ver listado</Link>
          <button className="btn outline" onClick={() => { setDone(false); setStep(1); setForm(INITIAL); }}>
            Crear otro
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Link href="/trips/" className="row" style={{ marginBottom: 20, color: 'var(--muted)', fontWeight: 600, gap: 6 }}>
        <ChevronLI size={16} /> Cancelar
      </Link>

      <div className="row-between" style={{ marginBottom: 24 }}>
        <div>
          <div className="eyebrow">OPERACIÓN · NUEVO</div>
          <h1 className="h1">Asignar viaje</h1>
        </div>
      </div>

      {/* Stepper */}
      <div className="card" style={{ marginBottom: 24, padding: 0 }}>
        <div className="row" style={{ padding: '16px 20px' }}>
          <StepItem n={1} label="Detalles del viaje" active={step === 1} done={step > 1} onClick={() => setStep(1)} />
          <StepConnector done={step > 1} />
          <StepItem n={2} label="Tracto + remolque" active={step === 2} done={step > 2} onClick={() => canStep2 && setStep(2)} />
          <StepConnector done={step > 2} />
          <StepItem n={3} label="Asignar operador" active={step === 3} done={false} onClick={() => canStep3 && setStep(3)} />
        </div>
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Form principal */}
        <div className="card">
          {step === 1 ? (
            <Step1 form={form} set={set} gross={gross} commission={commission} />
          ) : step === 2 ? (
            <Step2
              form={form}
              set={set}
              tractors={availableTractors}
              trailers={availableTrailers}
            />
          ) : (
            <Step3
              form={form}
              set={set}
              recommended={recommendedDriver}
              tons={tons}
            />
          )}
        </div>

        {/* Resumen */}
        <Summary form={form} gross={gross} commission={commission} />
      </div>

      <div className="row-between" style={{ marginTop: 20 }}>
        <button
          className="btn outline"
          onClick={() => setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3)}
          disabled={step === 1}
        >
          Atrás
        </button>
        {step < 3 ? (
          <button
            className="btn primary"
            onClick={() => setStep((s) => Math.min(3, s + 1) as 1 | 2 | 3)}
            disabled={(step === 1 && !canStep2) || (step === 2 && !canStep3)}
          >
            Continuar →
          </button>
        ) : (
          <button className="btn accent" onClick={submit} disabled={!canSubmit}>
            Crear viaje y notificar operador
          </button>
        )}
      </div>
    </>
  );
}

function Step1({ form, set, gross, commission }: { form: Form; set: <K extends keyof Form>(k: K, v: Form[K]) => void; gross: number; commission: number }) {
  return (
    <>
      <div className="eyebrow" style={{ marginBottom: 16 }}>Detalles del viaje</div>
      <div className="grid-2" style={{ gap: 16 }}>
        <Field label="Cliente"     value={form.client}     onChange={(v) => set('client', v)} placeholder="Ej. Cementos Mexicanos" />
        <Field label="Producto / carga" value={form.cargo} onChange={(v) => set('cargo', v)} placeholder="Ej. Cemento gris CPC-30R" />
        <Field label="Origen"       value={form.origin}    onChange={(v) => set('origin', v)} placeholder="Planta Tula, Hidalgo" />
        <Field label="Destino"      value={form.destination} onChange={(v) => set('destination', v)} placeholder="Bodega Pemex, Tampico" />
        <Field label="Fecha de carga" value={form.loadDate} onChange={(v) => set('loadDate', v)} placeholder="2026-05-22" type="date" />
        <Field label="Toneladas"     value={form.tons}      onChange={(v) => set('tons', v.replace(/[^\d.]/g, ''))} placeholder="28" inputMode="numeric" />
        <Field label="Precio por tonelada (MXN)" value={form.pricePerTon} onChange={(v) => set('pricePerTon', v.replace(/[^\d.]/g, ''))} placeholder="1450" inputMode="numeric" />
        <div>
          <label className="label">Importe estimado</label>
          <div style={{ height: 48, padding: '0 14px', display: 'flex', alignItems: 'center', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <strong style={{ fontSize: 18, color: 'var(--blue)' }}>
              {gross ? '$' + gross.toLocaleString('es-MX') : '—'}
            </strong>
            <span className="caption" style={{ marginLeft: 'auto' }}>
              comisión chofer ≈ ${commission.toLocaleString('es-MX')}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

function Step2({
  form, set, tractors: tList, trailers: rList,
}: { form: Form; set: <K extends keyof Form>(k: K, v: Form[K]) => void; tractors: any[]; trailers: any[] }) {
  return (
    <>
      <div className="eyebrow" style={{ marginBottom: 16 }}>Tracto y remolque</div>
      <label className="label">Tipo de remolque requerido</label>
      <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {Object.entries(TrailerTypeLabel).map(([k, v]) => (
          <button
            key={k}
            onClick={() => set('trailerType', k as TrailerType)}
            className={`chip ${form.trailerType === k ? 'navy' : 'gray'}`}
            style={{ border: 0, cursor: 'pointer', padding: '6px 12px' }}
          >
            {v}
          </button>
        ))}
      </div>

      <label className="label">Tracto · {tList.length} disponibles</label>
      <div style={{ display: 'grid', gap: 8, marginBottom: 20 }}>
        {tList.map((t) => (
          <Option
            key={t.id}
            active={form.tractorId === t.id}
            onClick={() => set('tractorId', t.id)}
            icon={<TruckI size={18} color="var(--blue)" />}
            title={`${t.number} · ${t.brand} ${t.model} ${t.year}`}
            sub={`${t.horsepower} HP · ${t.mileageKm.toLocaleString('es-MX')} km · salud ${t.health}/100`}
          />
        ))}
      </div>

      <label className="label">Remolque · {rList.length} disponibles</label>
      <div style={{ display: 'grid', gap: 8 }}>
        {rList.map((r: any) => (
          <Option
            key={r.id}
            active={form.trailerId === r.id}
            onClick={() => set('trailerId', r.id)}
            icon={<PackageI size={18} color="var(--blue)" />}
            title={`${r.number} · ${TrailerTypeLabel[r.type as TrailerType]}`}
            sub={`${r.capacityTons} ton · placas ${r.plates}${r.tempRange ? ` · ${r.tempRange}` : ''}`}
          />
        ))}
        {rList.length === 0 ? <div className="small muted">No hay remolques disponibles del tipo seleccionado.</div> : null}
      </div>
    </>
  );
}

function Step3({
  form, set, recommended, tons,
}: { form: Form; set: <K extends keyof Form>(k: K, v: Form[K]) => void; recommended: any; tons: number }) {
  return (
    <>
      <div className="eyebrow" style={{ marginBottom: 12 }}>Asignar operador</div>
      <div className="banner info" style={{ marginBottom: 16 }}>
        <SparklesI size={18} />
        <span>
          <strong>G3 Intelligence recomienda</strong>: {recommended.name} (score {recommended.score}, on-time {recommended.onTimePct}%).
          Mejor histórico operando rutas similares.
        </span>
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {drivers
          .filter((d) => d.status !== 'inactive' && d.status !== 'suspended')
          .sort((a, b) => b.score - a.score)
          .map((d) => (
          <Option
            key={d.id}
            active={form.driverId === d.id}
            onClick={() => set('driverId', d.id)}
            icon={<div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{d.initials}</div>}
            title={d.name}
            sub={`Score ${d.score} · on-time ${d.onTimePct}% · km/L ${d.kmPerLiter} · ${d.tripsLast30} viajes 30d`}
            badge={d.id === recommended.id ? 'IA · Recomendado' : undefined}
          />
        ))}
      </div>
    </>
  );
}

function Summary({ form, gross, commission }: { form: Form; gross: number; commission: number }) {
  const tractor = form.tractorId ? tractors.find((t) => t.id === form.tractorId) : null;
  const trailer = form.trailerId ? trailers.find((r) => r.id === form.trailerId) : null;
  const driver  = form.driverId ? drivers.find((d) => d.id === form.driverId) : null;
  return (
    <div className="card">
      <div className="eyebrow" style={{ marginBottom: 14 }}>Resumen del viaje</div>

      {form.client ? (
        <>
          <div className="caption">CLIENTE</div>
          <strong style={{ fontSize: 15 }}>{form.client}</strong>
          {form.cargo ? <div className="caption" style={{ marginTop: 2 }}>{form.cargo}</div> : null}
        </>
      ) : <div className="small muted">Ingresa los detalles del viaje.</div>}

      {form.origin && form.destination ? (
        <>
          <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '14px 0' }} />
          <div className="row" style={{ gap: 8 }}><MapPinI size={14} color="var(--blue)" /><span className="small">{form.origin}</span></div>
          <div className="row" style={{ gap: 8, marginTop: 4 }}><MapPinI size={14} color="var(--blue)" /><span className="small">{form.destination}</span></div>
        </>
      ) : null}

      {gross > 0 ? (
        <>
          <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '14px 0' }} />
          <KV label="Importe"  value={`$${gross.toLocaleString('es-MX')}`} accent />
          <KV label="Comisión chofer" value={`$${commission.toLocaleString('es-MX')}`} />
        </>
      ) : null}

      {tractor ? (
        <>
          <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '14px 0' }} />
          <KV label="Tracto"   value={`${tractor.number} · ${tractor.brand} ${tractor.model}`} />
        </>
      ) : null}
      {trailer ? <KV label="Remolque" value={`${trailer.number} · ${TrailerTypeLabel[trailer.type]}`} /> : null}
      {driver ? (
        <>
          <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '14px 0' }} />
          <div className="row" style={{ gap: 10 }}>
            <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{driver.initials}</div>
            <div>
              <strong style={{ fontSize: 13 }}>{driver.name}</strong>
              <div className="caption">Score {driver.score} · on-time {driver.onTimePct}%</div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type, inputMode }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; inputMode?: 'numeric' | 'text';
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="input">
        <input
          type={type ?? 'text'}
          inputMode={inputMode}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function Option({
  active, onClick, icon, title, sub, badge,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string; badge?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: 12,
        border: `${active ? 2 : 1}px solid ${active ? 'var(--navy)' : 'var(--border)'}`,
        background: active ? 'var(--navy)' : 'var(--bg)',
        color: active ? '#fff' : 'var(--text)',
        borderRadius: 14, cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span className="icon-tile sm" style={{ background: active ? 'rgba(255,255,255,0.15)' : 'var(--surface)' }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ fontSize: 14 }}>{title}</strong>
        <div style={{ fontSize: 12, color: active ? 'rgba(255,255,255,0.75)' : 'var(--muted)' }}>{sub}</div>
      </div>
      {badge ? <span className="chip" style={{ background: active ? 'rgba(255,255,255,0.18)' : 'var(--blue-light)', color: active ? '#fff' : 'var(--blue)' }}>{badge}</span> : null}
      {active ? <CheckI size={18} color="#fff" /> : null}
    </button>
  );
}

function StepItem({ n, label, active, done, onClick }: { n: number; label: string; active: boolean; done: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', border: 0, cursor: done ? 'pointer' : active ? 'default' : 'not-allowed' }}>
      <span style={{
        width: 28, height: 28, borderRadius: '50%',
        background: active ? 'var(--navy)' : done ? 'var(--success)' : 'var(--surface-2)',
        color: active || done ? '#fff' : 'var(--muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 13,
      }}>
        {done ? <CheckI size={14} color="#fff" /> : n}
      </span>
      <span style={{ fontWeight: active ? 700 : 500, color: active ? 'var(--text)' : 'var(--muted)' }}>{label}</span>
    </button>
  );
}

function StepConnector({ done }: { done: boolean }) {
  return <div style={{ flex: 1, height: 2, background: done ? 'var(--success)' : 'var(--border)', margin: '0 16px' }} />;
}

function KV({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="row-between" style={{ padding: '6px 0' }}>
      <span className="small muted">{label}</span>
      <strong style={{ fontSize: accent ? 16 : 14, color: accent ? 'var(--blue)' : 'var(--text)' }}>{value}</strong>
    </div>
  );
}
