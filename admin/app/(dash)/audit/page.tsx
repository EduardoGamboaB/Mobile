'use client';
import { useEffect, useState } from 'react';
import { useSecurityStore } from '@/lib/security';
import { AUDIT_ACTION_LABEL, type AuditAction, type AuditEntry } from '@/lib/api/security';
import { ShieldCheckI, AlertI, RefreshI, ChevronLI, ChevronRI } from '@/components/Icons';

const PAGE_SIZE = 25;

const TONE: Partial<Record<AuditAction, string>> = {
  'auth.login.failed': 'red',
  'auth.mfa.verify_failed': 'amber',
  'auth.mfa.locked': 'red',
  'auth.mfa.disabled': 'amber',
  'auth.mfa.recovery_code_used': 'amber',
  'user.role_changed': 'navy',
  'security_policy.updated': 'navy',
  'sso_config.updated': 'navy',
  'expense_policy.updated': 'blue',
  'auth.otp.failed': 'amber',
  'auth.password_reset.completed': 'navy',
  'user.driver_access_granted': 'navy',
  'integration.updated': 'navy',
  'integration.deleted': 'amber',
};

/** Bitácora de auditoría (solo owner/admin — el backend responde 403 al resto). */
export default function AuditPage() {
  const audit = useSecurityStore((s) => s.audit);
  const integrity = useSecurityStore((s) => s.integrity);
  const error = useSecurityStore((s) => s.error);
  const busy = useSecurityStore((s) => s.busy);
  const loadAudit = useSecurityStore((s) => s.loadAudit);
  const verifyAudit = useSecurityStore((s) => s.verifyAudit);
  const [action, setAction] = useState<AuditAction | ''>('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadAudit({ page, pageSize: PAGE_SIZE, action: action || undefined });
  }, [page, action, loadAudit]);

  const pages = audit ? Math.max(1, Math.ceil(audit.total / audit.pageSize)) : 1;

  return (
    <>
      <div className="row-between" style={{ marginBottom: 24 }}>
        <div>
          <div className="eyebrow">SEGURIDAD · CUMPLIMIENTO</div>
          <h1 className="h1">Bitácora de auditoría</h1>
          <div className="small muted">
            Registro inalterable (hash encadenado) de accesos, MFA, roles, SSO y reglas de gastos.
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <select
            aria-label="Filtrar por acción"
            value={action}
            onChange={(e) => { setAction(e.target.value as AuditAction | ''); setPage(1); }}
            style={{ height: 32, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', padding: '0 10px', fontWeight: 600 }}
          >
            <option value="">Todas las acciones</option>
            {(Object.keys(AUDIT_ACTION_LABEL) as AuditAction[]).map((a) => (
              <option key={a} value={a}>{AUDIT_ACTION_LABEL[a]}</option>
            ))}
          </select>
          <button className="btn outline sm" onClick={() => loadAudit({ page, pageSize: PAGE_SIZE, action: action || undefined })}>
            <RefreshI size={14} /> Actualizar
          </button>
          <button className="btn primary sm" onClick={() => verifyAudit()} disabled={busy}>
            <ShieldCheckI size={14} /> Verificar integridad
          </button>
        </div>
      </div>

      {integrity ? (
        <div className="card" style={{ marginBottom: 16, borderColor: integrity.ok ? 'var(--success)' : 'var(--danger)' }}>
          <div className="row" style={{ gap: 10 }}>
            {integrity.ok ? <ShieldCheckI size={20} color="var(--success)" /> : <AlertI size={20} color="var(--danger)" />}
            <strong>
              {integrity.ok
                ? `Cadena íntegra · ${integrity.entries} eventos verificados`
                : `Cadena alterada en el evento #${integrity.brokenAtSeq} — ${integrity.reason}`}
            </strong>
          </div>
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="card small" style={{ marginBottom: 16, color: 'var(--danger)', fontWeight: 600 }}>{error}</div>
      ) : null}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha</th>
              <th>Acción</th>
              <th>Actor</th>
              <th>Recurso</th>
              <th>IP / Agente</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {audit?.items.length ? audit.items.map((e) => <Row key={e.id} e={e} />) : (
              <tr><td colSpan={7} className="small muted" style={{ textAlign: 'center', padding: 24 }}>
                {busy ? 'Cargando…' : 'Sin eventos para este filtro.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="row-between" style={{ marginTop: 16 }}>
        <span className="small muted">{audit ? `${audit.total} eventos` : ''}</span>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn outline sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLI size={14} /></button>
          <span className="small">Página {page} de {pages}</span>
          <button className="btn outline sm" disabled={page >= pages} onClick={() => setPage(page + 1)}><ChevronRI size={14} /></button>
        </div>
      </div>
    </>
  );
}

function Row({ e }: { e: AuditEntry }) {
  const meta = Object.entries(e.metadata ?? {})
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' · ');
  return (
    <tr title={`hash ${e.hash.slice(0, 16)}… · prev ${e.prevHash.slice(0, 16)}…`}>
      <td className="small muted">{e.seq}</td>
      <td className="small">{new Date(e.timestamp).toLocaleString('es-MX')}</td>
      <td><span className={`chip ${TONE[e.action] ?? 'gray'}`}>{AUDIT_ACTION_LABEL[e.action] ?? e.action}</span></td>
      <td className="small">
        {e.actor.type === 'user' ? `${e.actor.userId ?? '—'} (${e.actor.role ?? '—'})` : e.actor.type === 'system' ? 'Sistema' : 'Anónimo'}
      </td>
      <td className="small">{e.resource.type}{e.resource.id ? ` · ${e.resource.id}` : ''}</td>
      <td className="small muted" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {e.ip ?? '—'} · {e.userAgent ?? '—'}
      </td>
      <td className="caption" style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta || '—'}</td>
    </tr>
  );
}
