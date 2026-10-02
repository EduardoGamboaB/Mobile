'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { isLive } from '@/lib/api/config';
import { INTEGRATIONS_CATALOG, type IntegrationCategoryDef } from '@/lib/contracts/integrationsCatalog';
import {
  integrationsBackend as backend,
  SOURCE_LABEL,
  SOURCE_TONE,
  type IntegrationOverviewItemDto,
  type IntegrationScope,
} from '@/lib/integrations';
import { telemetryBackend } from '@/lib/telemetry';
import { IntegrationCard } from '@/components/integrations/IntegrationCard';
import { TelemetryCard } from '@/components/integrations/TelemetryCard';
import { RefreshI } from '@/components/Icons';

export default function IntegrationsPage() {
  const [catalog, setCatalog] = useState<readonly IntegrationCategoryDef[]>(INTEGRATIONS_CATALOG);
  const [items, setItems] = useState<IntegrationOverviewItemDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<IntegrationScope>('company');

  const reload = useCallback(async () => {
    try {
      setItems(await backend.overview());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    // El catálogo del servidor manda; si no responde, usamos la copia del contrato.
    backend.catalog().then((c) => { if (c?.length) setCatalog(c); }).catch(() => undefined);
    void reload();
  }, [reload]);

  const canEditPlatform = !!items?.some((i) => i.canEditPlatform);
  const visible = useMemo(
    () => catalog.filter((d) => (tab === 'platform' ? d.scopes.includes('platform') : true)),
    [catalog, tab],
  );
  const counts = useMemo(() => {
    const c = { company: 0, platform: 0, env: 0, none: 0 };
    for (const i of items ?? []) c[i.effective.source]++;
    return c;
  }, [items]);

  return (
    <>
      <div className="row-between" style={{ marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="eyebrow">CUENTA · PROVEEDORES EXTERNOS</div>
          <h1 className="h1">Integraciones</h1>
          <p className="small muted" style={{ marginTop: 4, maxWidth: 760 }}>
            SMS, correo, push, WhatsApp, timbrado (PAC) y demás servicios externos que usa G3. Si no configuras uno
            propio, se usa el de la plataforma G3; si tampoco hay, el de las variables de entorno del deploy; sin
            ninguno, el canal queda en <strong>modo registro</strong> (no envía).
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span className={`chip ${isLive ? 'green' : 'gray'}`}>{isLive ? 'EN SERVIDOR' : 'DEMO · EN MEMORIA'}</span>
          <button className="btn outline sm" onClick={() => void reload()}><RefreshI size={14} /> Actualizar</button>
        </div>
      </div>

      <div className="row-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'company'} className={tab === 'company' ? 'active' : ''} onClick={() => setTab('company')}>
            Mi compañía
          </button>
          {canEditPlatform ? (
            <button role="tab" aria-selected={tab === 'platform'} className={tab === 'platform' ? 'active' : ''} onClick={() => setTab('platform')}>
              Plataforma G3
            </button>
          ) : null}
        </div>
        {items ? (
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {(Object.keys(counts) as (keyof typeof counts)[]).map((k) => (
              <span key={k} className={`chip ${SOURCE_TONE[k]}`}>{SOURCE_LABEL[k]} · {counts[k]}</span>
            ))}
          </div>
        ) : null}
      </div>

      {tab === 'platform' ? (
        <div className="banner amber" style={{ marginBottom: 16 }}>
          Estás editando los valores por defecto de G3 Tech: aplican a todas las compañías que no tengan configuración propia.
        </div>
      ) : null}

      {error ? <div className="banner danger" style={{ marginBottom: 16 }}>{error}</div> : null}
      {!items && !error ? <div className="card small muted">Cargando integraciones…</div> : null}

      {items ? (
        <div className="stack-lg">
          {visible.map((def) => (
            <IntegrationCard
              key={`${tab}-${def.category}`}
              def={def}
              items={items.filter((i) => i.category === def.category)}
              scope={tab}
              backend={backend}
              onChanged={reload}
            />
          ))}
          {tab === 'company' ? <TelemetryCard backend={telemetryBackend} /> : null}
        </div>
      ) : null}
    </>
  );
}
