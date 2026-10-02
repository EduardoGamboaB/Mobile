'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSecurityStore } from '@/lib/security';
import {
  MFA_MANDATORY_ROLES,
  SSO_PROVIDER_LABEL,
  type SsoProvider,
  type UpdateSsoConfig,
  type UserRole,
} from '@/lib/api/security';
import { ShieldCheckI, LockI, UsersI, KeyI, FileI, ChevronRI } from '@/components/Icons';
import { MfaSecretBox, RecoveryCodesBox } from '@/components/MfaWidgets';

const ROLE_LABEL: Record<UserRole, string> = {
  owner: 'Dueño',
  admin: 'Administrador',
  dispatcher: 'Despachador',
  driver: 'Chofer',
  viewer: 'Consulta',
};
const ROLES: UserRole[] = ['owner', 'admin', 'dispatcher', 'driver', 'viewer'];

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
  fontWeight: 600,
};

/** Card "Seguridad" de Ajustes: MFA, códigos de recuperación, política y SSO. */
export function SecurityCard() {
  const s = useSecurityStore();
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'idle' | 'disable' | 'regenerate'>('idle');

  useEffect(() => {
    s.loadSecurity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const required = s.policy?.requireMfaForRoles ?? ['owner', 'admin'];
  const toggleRole = (r: UserRole) => {
    if (MFA_MANDATORY_ROLES.includes(r)) return;
    s.setRequireMfaForRoles(required.includes(r) ? required.filter((x) => x !== r) : [...required, r]);
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok =
      s.enrollment ? await s.confirmEnrollment(code)
      : mode === 'disable' ? await s.disableMfa(code)
      : mode === 'regenerate' ? await s.regenerateRecoveryCodes(code)
      : false;
    if (ok) { setCode(''); setMode('idle'); }
  };

  const askingCode = !!s.enrollment || mode !== 'idle';

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="row-between" style={{ marginBottom: 4 }}>
        <div className="eyebrow">Seguridad</div>
        <Link href="/audit" className="row small" style={{ color: 'var(--blue)', fontWeight: 700, gap: 4 }}>
          Bitácora de auditoría <ChevronRI size={14} color="var(--blue)" />
        </Link>
      </div>
      <div className="small" style={{ marginBottom: 12 }}>
        Verificación en dos pasos (TOTP), códigos de recuperación, MFA obligatorio por rol e inicio de sesión corporativo (SSO).
      </div>

      {s.error ? (
        <div role="alert" className="small" style={{ padding: '8px 12px', borderRadius: 10, background: 'var(--danger-bg)', color: 'var(--danger)', fontWeight: 600, marginBottom: 12 }}>
          {s.error}
        </div>
      ) : null}

      {/* MFA del usuario */}
      <Section icon={<ShieldCheckI size={18} color="var(--blue)" />} title="Verificación en dos pasos (MFA)"
        hint={s.mfa?.enabled
          ? `Activa desde ${s.mfa.enrolledAt ? new Date(s.mfa.enrolledAt).toLocaleDateString('es-MX') : '—'} · ${s.mfa.recoveryCodesRemaining} códigos de recuperación disponibles.`
          : s.mfa?.requiredByPolicy
            ? 'Tu rol requiere MFA: en tu próximo inicio de sesión se te pedirá activarlo.'
            : 'Protege tu cuenta con una app autenticadora.'}
        right={s.mfa?.enabled
          ? <span className="chip green">ACTIVO</span>
          : <button className="btn accent sm" disabled={s.busy || !!s.enrollment} onClick={() => s.startEnrollment()}>Activar MFA</button>}
      />

      {s.enrollment ? <MfaSecretBox enrollment={s.enrollment} /> : null}

      {s.mfa?.enabled && !askingCode ? (
        <div className="row" style={{ gap: 8, padding: '0 0 12px 44px' }}>
          <button className="btn outline sm" onClick={() => setMode('regenerate')}>Regenerar códigos de recuperación</button>
          <button className="btn ghost sm" style={{ color: 'var(--danger)' }} onClick={() => setMode('disable')}>Desactivar MFA</button>
        </div>
      ) : null}

      {askingCode ? (
        <form onSubmit={submitCode} className="row" style={{ gap: 8, padding: '0 0 12px 44px' }}>
          <input
            aria-label="Código MFA"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={s.enrollment ? 'Código de 6 dígitos' : '6 dígitos o código de recuperación'}
            autoComplete="one-time-code"
            style={{ ...inputStyle, width: 260, letterSpacing: 2 }}
          />
          <button type="submit" className={`btn sm ${mode === 'disable' ? 'danger' : 'primary'}`} disabled={s.busy || !code}>
            {s.enrollment ? 'Confirmar' : mode === 'disable' ? 'Desactivar' : 'Regenerar'}
          </button>
          {mode !== 'idle' ? <button type="button" className="btn ghost sm" onClick={() => { setMode('idle'); setCode(''); }}>Cancelar</button> : null}
        </form>
      ) : null}

      {s.recoveryCodes ? (
        <div style={{ padding: '0 0 12px 44px' }}>
          <div className="caption" style={{ marginBottom: 8, fontWeight: 700, color: 'var(--warning)' }}>
            Guarda estos códigos ahora: no volverás a verlos. Cada uno sirve una sola vez.
          </div>
          <RecoveryCodesBox codes={s.recoveryCodes} />
        </div>
      ) : null}

      {/* Política por rol */}
      <Section icon={<UsersI size={18} color="var(--blue)" />} title="Exigir MFA por rol"
        hint="Dueño y Administrador siempre requieren MFA. Agrega los roles operativos que también deban usarlo." />
      <div className="row" style={{ gap: 8, flexWrap: 'wrap', padding: '0 0 12px 44px' }}>
        {ROLES.map((r) => {
          const on = required.includes(r);
          const locked = MFA_MANDATORY_ROLES.includes(r);
          return (
            <button key={r} type="button" onClick={() => toggleRole(r)} disabled={locked || s.busy}
              aria-pressed={on}
              className={`chip ${on ? 'blue' : 'gray'}`}
              style={{ border: 0, cursor: locked ? 'not-allowed' : 'pointer' }}>
              {locked ? <LockI size={11} /> : null} {ROLE_LABEL[r]}{on ? ' ✓' : ''}
            </button>
          );
        })}
      </div>

      {/* SSO */}
      <SsoSection />
    </div>
  );
}

function SsoSection() {
  const sso = useSecurityStore((s) => s.sso);
  const saveSso = useSecurityStore((s) => s.saveSso);
  const busy = useSecurityStore((s) => s.busy);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<UpdateSsoConfig>({
    provider: 'google',
    enabled: true,
    issuer: 'https://accounts.google.com',
    clientId: '',
    clientSecretRef: '',
    allowedDomains: [],
    jitProvisioning: false,
  });
  const [domains, setDomains] = useState('');

  useEffect(() => {
    if (!sso) return;
    const { companyId: _c, updatedAt: _u, ...rest } = sso;
    setForm(rest);
    setDomains(sso.allowedDomains.join(', '));
  }, [sso]);

  const setProvider = (p: SsoProvider) =>
    setForm((f) => ({
      ...f,
      provider: p,
      issuer:
        p === 'google' ? 'https://accounts.google.com'
        : p === 'microsoft' ? 'https://login.microsoftonline.com/<tenant-id>/v2.0'
        : f.issuer,
    }));

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await saveSso({
      ...form,
      allowedDomains: domains.split(/[,\s]+/).map((d) => d.trim().toLowerCase()).filter(Boolean),
    });
    if (ok) setOpen(false);
  };

  return (
    <>
      <Section icon={<KeyI size={18} color="var(--blue)" />} title="Inicio de sesión corporativo (SSO)"
        hint={sso
          ? `${SSO_PROVIDER_LABEL[sso.provider]} · ${sso.allowedDomains.join(', ')} · ${sso.enabled ? 'habilitado' : 'deshabilitado'}${sso.jitProvisioning ? ' · alta automática' : ''}`
          : 'Google Workspace o Microsoft Entra ID vía OpenID Connect.'}
        right={<button className="btn outline sm" onClick={() => setOpen(!open)}>{open ? 'Cerrar' : sso ? 'Editar' : 'Configurar'}</button>}
        last={!open}
      />
      {open ? (
        <form onSubmit={onSave} style={{ padding: '0 0 4px 44px', display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
          <label className="caption">Proveedor
            <select value={form.provider} onChange={(e) => setProvider(e.target.value as SsoProvider)} style={inputStyle}>
              {(Object.keys(SSO_PROVIDER_LABEL) as SsoProvider[]).map((p) => <option key={p} value={p}>{SSO_PROVIDER_LABEL[p]}</option>)}
            </select>
          </label>
          <label className="caption">Issuer
            <input value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} style={inputStyle} />
          </label>
          <label className="caption">Client ID
            <input value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} style={inputStyle} />
          </label>
          <label className="caption">Referencia del secreto (Secret Manager)
            <input value={form.clientSecretRef} placeholder="projects/g3-prod/secrets/acme-oidc"
              onChange={(e) => setForm({ ...form, clientSecretRef: e.target.value })} style={inputStyle} />
          </label>
          <label className="caption" style={{ gridColumn: '1 / -1' }}>Dominios permitidos (separados por coma)
            <input value={domains} placeholder="acme.mx, acme.com.mx" onChange={(e) => setDomains(e.target.value)} style={inputStyle} />
          </label>
          <label className="row caption" style={{ gap: 8 }}>
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
            Habilitar SSO en el login
          </label>
          <label className="row caption" style={{ gap: 8 }}>
            <input type="checkbox" checked={form.jitProvisioning} onChange={(e) => setForm({ ...form, jitProvisioning: e.target.checked })} />
            Alta automática (rol Consulta)
          </label>
          <div className="caption" style={{ gridColumn: '1 / -1', color: 'var(--muted)' }}>
            <FileI size={12} /> Nunca pegues el client secret aquí: guárdalo en Secret Manager y escribe su referencia.
            Redirect URI a registrar en el IdP: <code>/login/sso/callback</code> de este panel.
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" className="btn primary sm" disabled={busy}>Guardar SSO</button>
          </div>
        </form>
      ) : null}
    </>
  );
}

function Section({ icon, title, hint, right, last }: {
  icon: React.ReactNode; title: string; hint: string; right?: React.ReactNode; last?: boolean;
}) {
  return (
    <div className="row" style={{ padding: '12px 0', gap: 12, borderBottom: last ? 0 : '1px solid var(--border)' }}>
      <span className="icon-tile sm blue">{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600 }}>{title}</div>
        <div className="caption">{hint}</div>
      </div>
      {right}
    </div>
  );
}
