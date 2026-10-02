'use client';
import { useEffect, useState } from 'react';
import {
  driverAccessBackend,
  driverAccessErrorMessage,
  normalizePhone,
  phoneError,
  type DriverAccessBackend,
  type DriverAccessGrant,
} from '@/lib/driverAccess';
import { CheckI, PhoneI, XI } from './Icons';

interface Props {
  driver: { id: string; name: string; phone?: string | null; email?: string | null };
  backend?: DriverAccessBackend;
  size?: 'sm' | 'md';
}

/**
 * "Dar acceso a G3 Drive": crea el usuario del chofer en auth
 * (POST /users/drivers). El chofer entra con su teléfono y un código SMS.
 */
export function DriverAccessButton({ driver, backend = driverAccessBackend, size = 'sm' }: Props) {
  const [grant, setGrant] = useState<DriverAccessGrant | null>(null);
  const [open, setOpen] = useState(false);
  // Tras montar: con backend consulta el estado real (una petición compartida por toda la lista).
  useEffect(() => {
    let alive = true;
    void (async () => {
      await backend.load?.();
      if (alive) setGrant(backend.grantedFor(driver.id));
    })();
    return () => { alive = false; };
  }, [backend, driver.id]);

  if (grant) {
    const chip = (
      <span className="chip green" title={`${grant.phone} · entra a G3 Drive con código SMS (usuario ${grant.userId})`}>
        <CheckI size={11} /> {size === 'sm' ? 'Con acceso' : `G3 Drive · ${grant.phone}`}
      </span>
    );
    if (size === 'sm') return chip;
    return (
      <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 2 }}>
        {chip}
        <span className="caption">Entra a G3 Drive con este número y un código SMS.</span>
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`btn outline ${size === 'sm' ? 'sm' : ''}`}
        style={{ whiteSpace: 'nowrap' }}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <PhoneI size={14} /> {size === 'sm' ? 'Dar acceso' : 'Dar acceso a G3 Drive'}
      </button>
      {open ? (
        <GrantDialog
          driver={driver}
          backend={backend}
          onClose={() => setOpen(false)}
          onGranted={(g) => {
            setGrant(g);
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function GrantDialog({
  driver, backend, onClose, onGranted,
}: {
  driver: Props['driver'];
  backend: DriverAccessBackend;
  onClose: () => void;
  onGranted: (g: DriverAccessGrant) => void;
}) {
  const [phone, setPhone] = useState(driver.phone ?? '+52');
  const [email, setEmail] = useState(driver.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const pe = phoneError(phone);
    if (pe) return setError(pe);
    setBusy(true);
    setError(null);
    try {
      onGranted(await backend.grant({ driverId: driver.id, phone: normalizePhone(phone), fullName: driver.name, email: email || null }));
    } catch (e) {
      setError(driverAccessErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Dar acceso a G3 Drive"
      onClick={(e) => { e.stopPropagation(); onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(6, 18, 31, 0.45)', zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, cursor: 'default',
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 440, boxShadow: 'var(--shadow-lg)' }} onClick={(e) => e.stopPropagation()}>
        <div className="row-between" style={{ marginBottom: 8 }}>
          <h3 className="h3">Dar acceso a G3 Drive</h3>
          <button className="btn ghost sm" onClick={onClose} aria-label="Cerrar"><XI size={14} /></button>
        </div>
        <p className="small" style={{ marginBottom: 14 }}>
          <strong>{driver.name}</strong> entrará a la app G3 Drive con su número de celular y un <strong>código por SMS</strong>
          {' '}(sin contraseña). Verifica que el número sea el del chofer: con él verá sus viajes y capturará bitácora y gastos.
        </p>
        <label className="label" htmlFor={`drv-phone-${driver.id}`}>Celular (formato E.164)</label>
        <input
          id={`drv-phone-${driver.id}`}
          className={`form-control ${error ? 'invalid' : ''}`}
          type="tel"
          value={phone}
          placeholder="+5215512345678"
          autoFocus
          onChange={(e) => { setPhone(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
        />
        <div className="field-hint">Con lada de país: +52 y 10 dígitos para México.</div>
        <label className="label" htmlFor={`drv-email-${driver.id}`} style={{ marginTop: 12 }}>Correo (opcional)</label>
        <input
          id={`drv-email-${driver.id}`}
          className="form-control"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error ? <div className="banner danger" style={{ marginTop: 12 }}>{error}</div> : null}
        <div className="row" style={{ gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button className="btn ghost sm" onClick={onClose}>Cancelar</button>
          <button className="btn accent sm" onClick={() => void submit()} disabled={busy}>
            {busy ? 'Dando acceso…' : 'Dar acceso'}
          </button>
        </div>
      </div>
    </div>
  );
}
