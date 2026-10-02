'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSecurityStore } from '@/lib/security';
import { isDemoMode } from '@/lib/api/config';
import { SSO_PROVIDER_LABEL, type SsoProvider } from '@/lib/api/security';
import { MailI, LockI, ShieldCheckI } from '@/components/Icons';
import { MfaSecretBox, RecoveryCodesBox } from '@/components/MfaWidgets';

export default function LoginPage() {
  const router = useRouter();
  const step = useSecurityStore((s) => s.step);
  const error = useSecurityStore((s) => s.error);
  const busy = useSecurityStore((s) => s.busy);
  const enrollment = useSecurityStore((s) => s.enrollment);
  const recoveryCodes = useSecurityStore((s) => s.recoveryCodes);
  const beginLogin = useSecurityStore((s) => s.beginLogin);
  const submitMfaCode = useSecurityStore((s) => s.submitMfaCode);
  const confirmForcedEnrollment = useSecurityStore((s) => s.confirmForcedEnrollment);
  const acknowledgeRecoveryCodes = useSecurityStore((s) => s.acknowledgeRecoveryCodes);
  const cancelLogin = useSecurityStore((s) => s.cancelLogin);
  const discoverSso = useSecurityStore((s) => s.discoverSso);
  const startSso = useSecurityStore((s) => s.startSso);

  const [email, setEmail] = useState('despacho@g3logistics.mx');
  const [password, setPassword] = useState('demo1234');
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [ssoProvider, setSsoProvider] = useState<SsoProvider | null>(null);

  const onCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = await beginLogin(email, password);
    if (next === 'done') router.push('/dashboard');
  };

  const onCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = step === 'enroll' ? await confirmForcedEnrollment(code) : await submitMfaCode(code);
    setCode('');
    if (ok && step === 'mfa') router.push('/dashboard');
  };

  const onEmailBlur = async () => {
    const r = await discoverSso(email);
    setSsoProvider(r.ssoEnabled ? r.provider : null);
  };

  const onSso = async () => {
    const url = await startSso(email);
    if (url.startsWith('http')) window.location.assign(url);
    else router.push(url);
  };

  return (
    <div className="login-shell">
      <aside className="login-aside">
        <div>
          <div className="brand-block">
            <span className="g">G</span>
            <span className="three">3</span>
            <div className="product">ADMIN</div>
          </div>
        </div>
        <div className="quote">
          “La carretera, conectada.” Operación logística desde una sola consola — viajes, choferes, evidencias y pagos en tiempo real.
        </div>
        <div className="footer-quote">OPERACIÓN · TECNOLOGÍA · DATOS</div>
      </aside>

      <main className="login-main">
        {step === 'credentials' || step === 'done' ? (
          <form onSubmit={onCredentials} className="login-form">
            <div className="eyebrow" style={{ marginBottom: 6 }}>PANEL DE ADMINISTRACIÓN</div>
            <h1 className="h1" style={{ marginBottom: 4 }}>Bienvenido</h1>
            <p className="small" style={{ marginBottom: 28 }}>
              Acceso para despachadores, administradores y supervisores.
            </p>

            <div className="field">
              <label className="label" htmlFor="email">Correo corporativo</label>
              <div className="input">
                <MailI size={18} color="var(--muted)" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={onEmailBlur}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="password">Contraseña</label>
              <div className="input">
                <LockI size={18} color="var(--muted)" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div style={{ textAlign: 'right', marginBottom: 16 }}>
              <a className="small" style={{ color: 'var(--blue)', fontWeight: 600 }}>
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {error ? <ErrorBox text={error} /> : null}

            <button type="submit" className="btn primary lg" style={{ width: '100%' }} disabled={busy}>
              {busy ? 'Verificando…' : 'Entrar al panel'}
            </button>

            {ssoProvider ? (
              <button
                type="button"
                className="btn outline lg"
                style={{ width: '100%', marginTop: 12 }}
                onClick={onSso}
                disabled={busy}
              >
                <ShieldCheckI size={18} /> Entrar con SSO · {SSO_PROVIDER_LABEL[ssoProvider]}
              </button>
            ) : null}

            {isDemoMode ? (
              <div style={{
                marginTop: 24, padding: '14px 16px',
                background: 'var(--blue-light)', borderRadius: 14,
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <span style={{ fontSize: 18 }}>✨</span>
                <div className="small" style={{ color: 'var(--blue)', fontWeight: 600 }}>
                  Modo demo activo · cualquier credencial entra al panel con datos de la compañía G3 Logistics.
                  Si activaste MFA en Ajustes, cualquier código de 6 dígitos (excepto 000000) es válido.
                </div>
              </div>
            ) : null}
          </form>
        ) : null}

        {step === 'mfa' || step === 'enroll' ? (
          <form onSubmit={onCode} className="login-form">
            <div className="eyebrow" style={{ marginBottom: 6 }}>VERIFICACIÓN EN DOS PASOS</div>
            <h1 className="h1" style={{ marginBottom: 4 }}>
              {step === 'enroll' ? 'Activa tu segundo factor' : 'Confirma que eres tú'}
            </h1>
            <p className="small" style={{ marginBottom: 20 }}>
              {step === 'enroll'
                ? 'Tu compañía exige MFA para tu rol. Agrega esta cuenta en tu app autenticadora (Google Authenticator, Microsoft Authenticator, 1Password…) y escribe el primer código.'
                : useRecovery
                  ? 'Escribe uno de tus códigos de recuperación (XXXXX-XXXXX). Cada código sirve una sola vez.'
                  : 'Escribe el código de 6 dígitos que muestra tu app autenticadora.'}
            </p>

            {step === 'enroll' && enrollment ? <MfaSecretBox enrollment={enrollment} /> : null}

            <div className="field">
              <label className="label" htmlFor="mfa-code">
                {useRecovery ? 'Código de recuperación' : 'Código de verificación'}
              </label>
              <div className="input">
                <ShieldCheckI size={18} color="var(--muted)" />
                <input
                  id="mfa-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode={useRecovery ? 'text' : 'numeric'}
                  autoComplete="one-time-code"
                  maxLength={useRecovery ? 11 : 6}
                  placeholder={useRecovery ? 'XXXXX-XXXXX' : '000000'}
                  autoFocus
                  style={{ letterSpacing: 4, fontWeight: 700 }}
                />
              </div>
            </div>

            {error ? <ErrorBox text={error} /> : null}

            <button type="submit" className="btn primary lg" style={{ width: '100%' }} disabled={busy || !code}>
              {busy ? 'Verificando…' : step === 'enroll' ? 'Activar y entrar' : 'Verificar'}
            </button>

            <div className="row-between" style={{ marginTop: 16 }}>
              <button type="button" className="btn ghost sm" onClick={cancelLogin}>
                ← Volver
              </button>
              {step === 'mfa' ? (
                <button type="button" className="btn ghost sm" onClick={() => { setUseRecovery(!useRecovery); setCode(''); }}>
                  {useRecovery ? 'Usar app autenticadora' : 'Usar código de recuperación'}
                </button>
              ) : null}
            </div>
          </form>
        ) : null}

        {step === 'recovery-codes' && recoveryCodes ? (
          <div className="login-form">
            <div className="eyebrow" style={{ marginBottom: 6 }}>MFA ACTIVADO</div>
            <h1 className="h1" style={{ marginBottom: 4 }}>Guarda tus códigos</h1>
            <p className="small" style={{ marginBottom: 20 }}>
              Si pierdes tu teléfono, cada uno de estos códigos te deja entrar una sola vez.
              No volverás a verlos: guárdalos en tu gestor de contraseñas.
            </p>
            <RecoveryCodesBox codes={recoveryCodes} />
            <button
              type="button"
              className="btn primary lg"
              style={{ width: '100%', marginTop: 16 }}
              onClick={() => { acknowledgeRecoveryCodes(); router.push('/dashboard'); }}
            >
              Ya los guardé · entrar al panel
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div role="alert" className="small" style={{
      marginBottom: 16, padding: '10px 14px', borderRadius: 12,
      background: 'var(--danger-bg)', color: 'var(--danger)', fontWeight: 600,
    }}>
      {text}
    </div>
  );
}
