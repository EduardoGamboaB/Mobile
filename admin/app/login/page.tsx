'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { MailI, LockI } from '@/components/Icons';

export default function LoginPage() {
  const router = useRouter();
  const signIn = useAppStore((s) => s.signIn);
  const [email, setEmail] = useState('despacho@g3logistics.mx');
  const [password, setPassword] = useState('demo1234');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signIn();
    router.push('/dashboard');
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
        <form onSubmit={onSubmit} className="login-form">
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

          <button type="submit" className="btn primary lg" style={{ width: '100%' }}>
            Entrar al panel
          </button>

          <div style={{
            marginTop: 24, padding: '14px 16px',
            background: 'var(--blue-light)', borderRadius: 14,
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>✨</span>
            <div className="small" style={{ color: 'var(--blue)', fontWeight: 600 }}>
              Modo demo activo · cualquier credencial entra al panel con datos de la compañía G3 Logistics.
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
