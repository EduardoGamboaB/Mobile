'use client';
import type { MfaEnrollResponse } from '@/lib/api/security';

/**
 * Secreto TOTP para captura manual + enlace otpauth://. No hay librería de
 * QR en el admin (y no agregamos dependencias por esto): el enlace abre la
 * app autenticadora en móvil y el secreto se captura a mano en escritorio.
 */
export function MfaSecretBox({ enrollment }: { enrollment: MfaEnrollResponse }) {
  const grouped = enrollment.secret.match(/.{1,4}/g)?.join(' ') ?? enrollment.secret;
  return (
    <div style={{
      padding: 16, borderRadius: 14, marginBottom: 16,
      background: 'var(--surface)', border: '1px solid var(--border)',
    }}>
      <div className="caption" style={{ marginBottom: 6 }}>
        Clave de configuración · {enrollment.issuer} ({enrollment.account})
      </div>
      <code
        data-testid="mfa-secret"
        style={{ display: 'block', fontSize: 16, fontWeight: 700, letterSpacing: 1.5, wordBreak: 'break-all', userSelect: 'all' }}
      >
        {grouped}
      </code>
      <div className="caption" style={{ marginTop: 8 }}>
        Tipo: basada en tiempo · 6 dígitos · 30 s.{' '}
        <a href={enrollment.otpauthUri} style={{ color: 'var(--blue)', fontWeight: 600 }}>
          Abrir en app autenticadora
        </a>
      </div>
    </div>
  );
}

export function RecoveryCodesBox({ codes }: { codes: string[] }) {
  const copy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(codes.join('\n')).catch(() => undefined);
    }
  };
  return (
    <div style={{ padding: 16, borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {codes.map((c) => (
          <code key={c} style={{ fontWeight: 700, fontSize: 15, letterSpacing: 1 }}>{c}</code>
        ))}
      </div>
      <button type="button" className="btn outline sm" onClick={copy}>Copiar códigos</button>
    </div>
  );
}
