'use client';
import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSecurityStore } from '@/lib/security';

/** Redirect URI del IdP (SSO_REDIRECT_URI en el auth-service). */
export default function SsoCallbackPage() {
  return (
    <Suspense fallback={null}>
      <SsoCallback />
    </Suspense>
  );
}

function SsoCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const completeSso = useSecurityStore((s) => s.completeSso);
  const error = useSecurityStore((s) => s.error);
  const ran = useRef(false);
  const idpError = params?.get('error');

  useEffect(() => {
    if (ran.current || idpError) return;
    ran.current = true;
    const code = params?.get('code') ?? '';
    const state = params?.get('state') ?? '';
    completeSso({ code, state }).then((ok) => {
      if (ok) router.replace('/dashboard');
    });
  }, [params, idpError, completeSso, router]);

  const message = idpError
    ? 'El proveedor de identidad canceló o rechazó el inicio de sesión.'
    : error;

  return (
    <div className="login-shell">
      <main className="login-main" style={{ gridColumn: '1 / -1' }}>
        <div className="login-form">
          <div className="eyebrow" style={{ marginBottom: 6 }}>INICIO DE SESIÓN CON SSO</div>
          <h1 className="h1" style={{ marginBottom: 12 }}>{message ? 'No pudimos validar tu acceso' : 'Validando tu identidad…'}</h1>
          {message ? (
            <>
              <p className="small" role="alert" style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: 16 }}>{message}</p>
              <button className="btn primary" onClick={() => router.replace('/login')}>Volver al inicio de sesión</button>
            </>
          ) : (
            <p className="small">Un momento, estamos confirmando tu sesión con tu proveedor corporativo.</p>
          )}
        </div>
      </main>
    </div>
  );
}
