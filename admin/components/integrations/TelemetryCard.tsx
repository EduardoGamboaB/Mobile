'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  INGEST_TOKEN_HEADER,
  TELEMETRY_PROVIDERS,
  TELEMETRY_PROVIDER_INFO,
  ingestUrl,
  type IngestTokenCreatedDto,
  type IngestTokenDto,
  type TelemetryBackend,
  type TelemetryProvider,
  type UnknownDeviceHitDto,
} from '@/lib/telemetry';
import { CheckI, KeyI, MapPinI, PlusI, RefreshI } from '@/components/Icons';

const fmtDate = (iso: string) => new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn outline sm"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(
          () => {
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          },
          () => setDone(false),
        );
      }}
    >
      {done ? <><CheckI size={14} /> Copiado</> : label}
    </button>
  );
}

/** Telemetría GPS: tokens de ingesta, URL del webhook por proveedor e IMEIs desconocidos. */
export function TelemetryCard({ backend }: { backend: TelemetryBackend }) {
  const [tokens, setTokens] = useState<IngestTokenDto[]>([]);
  const [unknown, setUnknown] = useState<UnknownDeviceHitDto[]>([]);
  const [created, setCreated] = useState<IngestTokenCreatedDto | null>(null);
  const [label, setLabel] = useState('');
  const [provider, setProvider] = useState<TelemetryProvider>('suntech');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [t, u] = await Promise.all([backend.listTokens(), backend.unknownDevices()]);
      setTokens(t);
      setUnknown(u);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [backend]);

  useEffect(() => { void reload(); }, [reload]);

  const create = async () => {
    setBusy(true);
    try {
      const t = await backend.createToken(label);
      setCreated(t);
      setLabel('');
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (t: IngestTokenDto) => {
    if (!window.confirm(`¿Revocar el token ${t.prefix}…? Los equipos que lo usen dejarán de reportar.`)) return;
    try {
      await backend.revokeToken(t.id);
      if (created?.id === t.id) setCreated(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const url = ingestUrl(provider);
  const info = TELEMETRY_PROVIDER_INFO[provider];
  const active = tokens.filter((t) => !t.revokedAt);

  return (
    <div className="card" id="telemetry">
      <div className="row-between" style={{ alignItems: 'flex-start', marginBottom: 12, gap: 12 }}>
        <div>
          <h3 className="h3">Telemetría GPS</h3>
          <div className="small" style={{ marginTop: 2 }}>
            Lee el GPS que tu flota ya trae (Suntech, Teltonika, Queclink) sin reinstalar equipo: la plataforma del
            proveedor reenvía las posiciones a G3 por webhook.
          </div>
          <div className="row" style={{ gap: 6, marginTop: 8 }}>
            <span className="chip gray" style={{ textTransform: 'none', letterSpacing: 0 }}>Usa: fleet · posiciones en vivo y recorrido</span>
          </div>
        </div>
        <span className={`chip ${active.length ? 'green' : 'gray'}`}>{active.length} token{active.length === 1 ? '' : 's'} activo{active.length === 1 ? '' : 's'}</span>
      </div>

      {error ? <div className="banner danger" style={{ marginBottom: 12 }}>{error}</div> : null}

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="slot-panel">
          <div className="eyebrow" style={{ marginBottom: 8 }}>1 · Tokens de ingesta</div>
          <div className="row" style={{ gap: 6 }}>
            <input
              className="form-control"
              placeholder="Etiqueta (p.ej. Servidor Suntech)"
              value={label}
              maxLength={80}
              onChange={(e) => setLabel(e.target.value)}
            />
            <button className="btn accent sm" style={{ whiteSpace: 'nowrap' }} onClick={() => void create()} disabled={busy}>
              <PlusI size={14} /> Crear token
            </button>
          </div>

          {created ? (
            <div className="banner amber" style={{ marginTop: 10, flexDirection: 'column', gap: 6 }} role="status">
              <div><KeyI size={14} /> Copia el token ahora: <strong>no se volverá a mostrar</strong>.</div>
              <div className="row" style={{ gap: 6, width: '100%' }}>
                <code className="mono code-box" style={{ flex: 1, color: 'var(--text)' }} data-testid="new-ingest-token">{created.token}</code>
                <CopyButton text={created.token} />
              </div>
              <button className="btn ghost sm" onClick={() => setCreated(null)}>Ya lo guardé</button>
            </div>
          ) : null}

          <div style={{ marginTop: 12 }}>
            {tokens.length === 0 ? (
              <div className="caption">Sin tokens. Crea uno por cada plataforma o middleware que te reenvíe posiciones.</div>
            ) : (
              tokens.map((t) => (
                <div key={t.id} className="row-between" style={{ padding: '8px 0', borderTop: '1px solid var(--border)', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="row" style={{ gap: 6 }}>
                      <span className="mono">{t.prefix}…</span>
                      {t.revokedAt ? <span className="chip gray">Revocado</span> : <span className="chip green">Activo</span>}
                    </div>
                    <div className="caption">
                      {t.label ?? 'Sin etiqueta'} · creado {fmtDate(t.createdAt)}
                      {t.revokedAt ? ` · revocado ${fmtDate(t.revokedAt)}` : ''}
                    </div>
                  </div>
                  {!t.revokedAt ? (
                    <button className="btn outline sm" style={{ color: 'var(--danger)' }} onClick={() => void revoke(t)}>Revocar</button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="slot-panel">
          <div className="eyebrow" style={{ marginBottom: 8 }}>2 · Webhook en la plataforma del proveedor</div>
          <div className="tabs" style={{ flexWrap: 'wrap', marginBottom: 10 }}>
            {TELEMETRY_PROVIDERS.map((p) => (
              <button key={p} className={provider === p ? 'active' : ''} onClick={() => setProvider(p)}>
                {p === 'generic' ? 'Genérico' : p[0].toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <div className="small" style={{ fontWeight: 700 }}>{info.name}</div>
          <label className="label" style={{ marginTop: 10 }}>URL (POST)</label>
          <div className="row" style={{ gap: 6 }}>
            <code className="mono code-box" style={{ flex: 1 }} data-testid="ingest-url">{url}</code>
            <CopyButton text={url} />
          </div>
          <label className="label" style={{ marginTop: 10 }}>Header</label>
          <code className="mono code-box" style={{ display: 'block' }}>{INGEST_TOKEN_HEADER}: g3it_…</code>
          <label className="label" style={{ marginTop: 10 }}>Cuerpo</label>
          <div className="small">{info.body}</div>
          <ol className="small" style={{ marginTop: 10, paddingLeft: 18, display: 'grid', gap: 4 }}>
            <li>Da de alta cada equipo (IMEI) en G3 y vincúlalo a su tracto o remolque.</li>
            <li>Crea un token y configúralo como header en el reenvío.</li>
            <li>{info.note}</li>
            <li>G3 responde 202 con cuántas posiciones aceptó; los IMEI no registrados aparecen abajo.</li>
          </ol>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="row-between" style={{ marginBottom: 8 }}>
          <span className="eyebrow">Equipos que reportan sin estar registrados</span>
          <button className="btn ghost sm" onClick={() => void reload()}><RefreshI size={14} /> Actualizar</button>
        </div>
        {unknown.length === 0 ? (
          <div className="caption">Ninguno. Si un equipo reporta con un IMEI que no está dado de alta en tu flota, aparece aquí.</div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Proveedor</th><th>IMEI / ID</th><th style={{ textAlign: 'right' }}>Reportes</th><th>Último</th></tr>
            </thead>
            <tbody>
              {unknown.map((u) => (
                <tr key={`${u.provider}-${u.externalId}`}>
                  <td><span className="chip blue">{u.provider}</span></td>
                  <td className="mono"><MapPinI size={12} color="var(--muted)" /> {u.externalId}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{u.hits}</td>
                  <td className="small">{fmtDate(u.lastSeenAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
