'use client';
import { useEffect, useMemo, useState } from 'react';
import type { IntegrationCategoryDef, IntegrationField } from '@/lib/contracts/integrationsCatalog';
import {
  SOURCE_LABEL,
  SOURCE_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  buildUpsertPayload,
  fieldErrorsFromError,
  initialFormState,
  isFullConfig,
  isSecretReference,
  secretHint,
  storedSecrets,
  validateForm,
  type IntegrationConfigDto,
  type IntegrationFormState,
  type IntegrationOverviewItemDto,
  type IntegrationScope,
  type IntegrationTestDto,
  type IntegrationsBackend,
} from '@/lib/integrations';
import { CheckI, FileI, LockI, RefreshI, XI, ZapI } from '@/components/Icons';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

const providerName = (def: IntegrationCategoryDef, id: string | null) =>
  id ? def.providers.find((p) => p.id === id)?.name ?? id : '—';

interface CardProps {
  def: IntegrationCategoryDef;
  items: IntegrationOverviewItemDto[];
  scope: IntegrationScope;
  backend: IntegrationsBackend;
  onChanged: () => Promise<void>;
}

/** Una categoría (SMS, correo, PAC…): qué parte de G3 la usa y una ranura por slot. */
export function IntegrationCard({ def, items, scope, backend, onChanged }: CardProps) {
  // En "Mi compañía", lo que solo configura la plataforma se ve en lectura.
  const readOnly = scope === 'company' && !def.scopes.includes('company');
  return (
    <div className="card" id={`int-${def.category}`}>
      <div className="row-between" style={{ alignItems: 'flex-start', marginBottom: 12, gap: 12 }}>
        <div>
          <h3 className="h3">{def.label}</h3>
          <div className="small" style={{ marginTop: 2 }}>{def.description}</div>
          <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {def.usedBy.map((u) => (
              <span key={u} className="chip gray" style={{ textTransform: 'none', letterSpacing: 0 }}>Usa: {u}</span>
            ))}
          </div>
        </div>
        {readOnly ? (
          <span className="chip navy"><LockI size={11} color="#fff" /> Lo administra G3</span>
        ) : null}
      </div>
      <div className={def.slots.length > 1 ? 'grid-2' : ''} style={{ alignItems: 'start' }}>
        {def.slots.map((slot) => {
          const item = items.find((i) => i.slot === slot.id);
          if (!item) return null;
          return (
            <SlotPanel
              key={slot.id}
              def={def}
              slotLabel={def.slots.length > 1 ? slot.label : null}
              item={item}
              scope={scope}
              readOnly={readOnly}
              backend={backend}
              onChanged={onChanged}
            />
          );
        })}
      </div>
    </div>
  );
}

function EffectiveLine({ def, item }: { def: IntegrationCategoryDef; item: IntegrationOverviewItemDto }) {
  const e = item.effective;
  return (
    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
      <span className="caption">En uso:</span>
      <span className={`chip ${SOURCE_TONE[e.source]}`}>{SOURCE_LABEL[e.source]}</span>
      {e.source === 'none' ? (
        <span className="caption" style={{ color: 'var(--warning)', fontWeight: 600 }}>modo registro, no envía</span>
      ) : (
        <>
          <span className="small" style={{ fontWeight: 600 }}>
            {e.source === 'env' ? `Respaldo del deploy (${def.envFallback.join(', ')})` : providerName(def, e.provider)}
          </span>
          {e.status ? <span className={`chip ${STATUS_TONE[e.status]}`}>{STATUS_LABEL[e.status]}</span> : null}
        </>
      )}
    </div>
  );
}

function LastTest({ t }: { t: IntegrationTestDto | null }) {
  if (!t) return <span className="caption">Sin pruebas todavía.</span>;
  return (
    <span className="caption">
      Última prueba {fmtDate(t.testedAt)} · {t.ok ? 'correcta' : 'falló'}
      {t.live ? ` · ${t.latencyMs} ms` : ' · sin prueba en vivo'}
    </span>
  );
}

interface SlotProps {
  def: IntegrationCategoryDef;
  slotLabel: string | null;
  item: IntegrationOverviewItemDto;
  scope: IntegrationScope;
  readOnly: boolean;
  backend: IntegrationsBackend;
  onChanged: () => Promise<void>;
}

function SlotPanel({ def, slotLabel, item, scope, readOnly, backend, onChanged }: SlotProps) {
  const config: IntegrationConfigDto | null =
    scope === 'company' ? item.company : isFullConfig(item.platform) ? item.platform : null;
  const [open, setOpen] = useState(false);
  const [testResult, setTestResult] = useState<IntegrationTestDto | null>(null);
  const [busy, setBusy] = useState<null | 'test' | 'remove'>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setBusy('test');
    setError(null);
    try {
      setTestResult(await backend.test(def.category, item.slot, scope));
      await onChanged();
    } catch (e) {
      setError(fieldErrorsFromError(e)._form ?? 'No se pudo probar');
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    const what = scope === 'company' ? 'tu configuración propia (se vuelve a heredar la de G3)' : 'la configuración de plataforma';
    if (typeof window !== 'undefined' && !window.confirm(`¿Eliminar ${what}?`)) return;
    setBusy('remove');
    setError(null);
    try {
      await backend.remove(def.category, item.slot, scope);
      setTestResult(null);
      setOpen(false);
      await onChanged();
    } catch (e) {
      setError(fieldErrorsFromError(e)._form ?? 'No se pudo eliminar');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="slot-panel" data-testid={`slot-${def.category}-${item.slot}`}>
      {slotLabel ? <div className="eyebrow" style={{ marginBottom: 8 }}>{slotLabel}</div> : null}
      <EffectiveLine def={def} item={item} />

      {readOnly ? (
        <div className="caption" style={{ marginTop: 10 }}>
          {item.effective.source === 'none'
            ? 'G3 aún no lo configura: mientras tanto el canal solo registra, no envía.'
            : 'Lo contrata y administra G3 Tech para todas las compañías. No requiere acción de tu parte.'}
        </div>
      ) : (
        <>
          <div style={{ borderTop: '1px solid var(--border)', margin: '12px 0' }} />
          <div className="row-between" style={{ gap: 8, flexWrap: 'wrap' }}>
            <div>
              <div className="small" style={{ fontWeight: 700 }}>
                {scope === 'company' ? 'Configuración propia' : 'Configuración de plataforma'}
                {config ? ` · ${providerName(def, config.provider)}` : ''}
              </div>
              {config ? (
                <div className="row" style={{ gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  <span className={`chip ${STATUS_TONE[config.status]}`}>{STATUS_LABEL[config.status]}</span>
                  {!config.enabled ? <span className="chip amber">Deshabilitada</span> : null}
                  <LastTest t={config.lastTest} />
                </div>
              ) : (
                <div className="caption" style={{ marginTop: 4 }}>
                  {scope === 'company'
                    ? item.platform
                      ? `Sin configuración propia: heredas la de G3 (${providerName(def, item.platform.provider)}).`
                      : 'Sin configuración propia.'
                    : 'Sin configuración de plataforma.'}
                </div>
              )}
            </div>
            <div className="row" style={{ gap: 6 }}>
              {config ? (
                <button className="btn outline sm" onClick={() => void runTest()} disabled={busy !== null}>
                  <RefreshI size={14} /> {busy === 'test' ? 'Probando…' : 'Probar conexión'}
                </button>
              ) : null}
              <button className={`btn sm ${open ? 'ghost' : 'primary'}`} onClick={() => setOpen((v) => !v)}>
                {open ? 'Cerrar' : config ? 'Editar' : 'Configurar'}
              </button>
            </div>
          </div>

          {testResult ? <TestBanner t={testResult} onClose={() => setTestResult(null)} /> : null}
          {error ? <div className="banner danger" style={{ marginTop: 10 }}>{error}</div> : null}

          {open ? (
            <ConfigForm
              def={def}
              slot={item.slot}
              scope={scope}
              config={config}
              backend={backend}
              onSaved={async () => {
                setTestResult(null);
                await onChanged();
              }}
              onRemove={config ? remove : null}
              removing={busy === 'remove'}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function TestBanner({ t, onClose }: { t: IntegrationTestDto; onClose: () => void }) {
  return (
    <div className={`banner ${t.ok ? 'info' : 'danger'}`} style={{ marginTop: 10 }} role="status">
      {t.ok ? <CheckI size={16} /> : <XI size={16} />}
      <div style={{ flex: 1 }}>
        <div>{t.ok ? 'Prueba correcta' : 'La prueba falló'} · {t.message}</div>
        <div style={{ fontWeight: 500, marginTop: 2 }}>
          {t.live
            ? `Llamada real al proveedor · ${t.latencyMs} ms`
            : 'Este proveedor no admite prueba en vivo: solo se validó el formato de la captura, no las credenciales.'}
        </div>
      </div>
      <button className="btn ghost sm" onClick={onClose} aria-label="Cerrar resultado"><XI size={14} /></button>
    </div>
  );
}

interface FormProps {
  def: IntegrationCategoryDef;
  slot: string;
  scope: IntegrationScope;
  config: IntegrationConfigDto | null;
  backend: IntegrationsBackend;
  onSaved: () => Promise<void>;
  onRemove: (() => Promise<void>) | null;
  removing: boolean;
}

function ConfigForm({ def, slot, scope, config, backend, onSaved, onRemove, removing }: FormProps) {
  const [state, setState] = useState<IntegrationFormState>(() => initialFormState(def, config));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  // Si la config guardada cambia (tras guardar), recarga el formulario.
  useEffect(() => {
    setState(initialFormState(def, config));
  }, [def, config]);

  const provider = useMemo(() => def.providers.find((p) => p.id === state.provider), [def, state.provider]);
  const stored = storedSecrets(config, state.provider);

  const setValue = (k: string, v: string | boolean) => {
    setSaved(false);
    setState((s) => ({ ...s, values: { ...s.values, [k]: v } }));
    setErrors((e) => {
      const { [k]: _omit, ...rest } = e;
      void _omit;
      return rest;
    });
  };

  const toggleClear = (k: string) =>
    setState((s) => ({
      ...s,
      clearSecrets: s.clearSecrets.includes(k) ? s.clearSecrets.filter((x) => x !== k) : [...s.clearSecrets, k],
      values: { ...s.values, [k]: '' },
    }));

  const save = async () => {
    const local = validateForm(def, state, config);
    setErrors(local);
    setSaved(false);
    if (Object.keys(local).length) return;
    setSaving(true);
    try {
      await backend.upsert(def.category, slot, scope, buildUpsertPayload(def, state, config));
      setSaved(true);
      setErrors({});
      await onSaved();
    } catch (e) {
      setErrors(fieldErrorsFromError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: 14 }}>
      <div className="field-grid">
        <div>
          <label className="label" htmlFor={`${def.category}-${slot}-provider`}>Proveedor</label>
          <select
            id={`${def.category}-${slot}-provider`}
            className={`form-control ${errors.provider ? 'invalid' : ''}`}
            value={state.provider}
            onChange={(e) => {
              setErrors({});
              setSaved(false);
              setState(initialFormState(def, config, e.target.value));
            }}
          >
            {def.providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {provider ? <div className="field-hint">{provider.description}</div> : null}
          {errors.provider ? <div className="field-error">{errors.provider}</div> : null}
        </div>
        <div>
          <span className="label">Habilitada</span>
          <div className="row" style={{ gap: 10, height: 38 }}>
            <button
              type="button"
              className={`toggle ${state.enabled ? 'on' : ''}`}
              style={{ border: 0 }}
              aria-pressed={state.enabled}
              aria-label="Habilitar configuración"
              onClick={() => setState((s) => ({ ...s, enabled: !s.enabled }))}
            >
              <span className="knob" />
            </button>
            <span className="caption">
              {state.enabled ? 'Se usa esta configuración.' : 'Guardada pero sin usar: se hereda la siguiente fuente.'}
            </span>
          </div>
        </div>

        {provider?.fields.map((f) => (
          <FieldInput
            key={`${state.provider}-${f.key}`}
            id={`${def.category}-${slot}-${f.key}`}
            field={f}
            value={state.values[f.key]}
            error={errors[f.key]}
            storedHint={stored.includes(f.key) ? secretHint(config?.secrets[f.key]) : null}
            clearing={state.clearSecrets.includes(f.key)}
            onChange={(v) => setValue(f.key, v)}
            onToggleClear={() => toggleClear(f.key)}
          />
        ))}
      </div>

      {provider?.fields.some((f) => f.type === 'secret') ? (
        <div className="caption" style={{ marginTop: 10 }}>
          <LockI size={11} /> Los secretos se cifran en reposo y nunca se vuelven a mostrar. También puedes
          referenciar uno existente: <span className="mono">gsm:projects/&lt;proyecto&gt;/secrets/&lt;nombre&gt;/versions/latest</span>{' '}
          (Secret Manager) o <span className="mono">env:NOMBRE_VARIABLE</span> (variable de entorno del servicio).
        </div>
      ) : null}

      {Object.entries(errors)
        .filter(([k]) => k === '_form' || (!provider?.fields.some((f) => f.key === k) && k !== 'provider'))
        .map(([k, m]) => (
          <div key={k} className="banner danger" style={{ marginTop: 10 }}>{k === '_form' ? m : `${k}: ${m}`}</div>
        ))}
      {saved ? <div className="banner info" style={{ marginTop: 10 }}><CheckI size={16} /> Guardado. Pruébala con “Probar conexión”.</div> : null}

      <div className="row" style={{ gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        <button className="btn accent sm" onClick={() => void save()} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <span className="spacer" />
        {onRemove ? (
          <button className="btn outline sm" style={{ color: 'var(--danger)' }} onClick={() => void onRemove()} disabled={removing}>
            {removing ? 'Eliminando…' : scope === 'company' ? 'Eliminar configuración propia' : 'Eliminar configuración de plataforma'}
          </button>
        ) : null}
      </div>

      {provider && provider.setupChecklist.length ? (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div className="row-between" style={{ marginBottom: 6 }}>
            <span className="eyebrow">Checklist de alta en {provider.name}</span>
            <a href={provider.docsUrl} target="_blank" rel="noreferrer noopener" className="small" style={{ color: 'var(--blue)', fontWeight: 600 }}>
              <FileI size={12} /> Documentación
            </a>
          </div>
          <ul className="checklist">
            {provider.setupChecklist.map((step, i) => (
              <li key={i}>
                <input
                  type="checkbox"
                  id={`${def.category}-${slot}-chk-${i}`}
                  checked={!!checked[i]}
                  onChange={() => setChecked((c) => ({ ...c, [i]: !c[i] }))}
                />
                <label htmlFor={`${def.category}-${slot}-chk-${i}`}>{step}</label>
              </li>
            ))}
          </ul>
          <div className="caption">Las casillas son solo una guía visual; no se guardan.</div>
        </div>
      ) : null}
    </div>
  );
}

interface FieldProps {
  id: string;
  field: IntegrationField;
  value: string | boolean | undefined;
  error?: string;
  storedHint: string | null;
  clearing: boolean;
  onChange: (v: string | boolean) => void;
  onToggleClear: () => void;
}

const INPUT_TYPE: Partial<Record<IntegrationField['type'], string>> = {
  url: 'url',
  email: 'email',
  phone: 'tel',
  secret: 'password',
};

function FieldInput({ id, field: f, value, error, storedHint, clearing, onChange, onToggleClear }: FieldProps) {
  const label = (
    <label className="label" htmlFor={id}>
      {f.label}{f.required ? ' *' : ''}
    </label>
  );
  if (f.type === 'boolean') {
    return (
      <div>
        {label}
        <button
          id={id}
          type="button"
          className={`toggle ${value === true ? 'on' : ''}`}
          style={{ border: 0 }}
          aria-pressed={value === true}
          onClick={() => onChange(value !== true)}
        >
          <span className="knob" />
        </button>
        {f.help ? <div className="field-hint">{f.help}</div> : null}
        {error ? <div className="field-error">{error}</div> : null}
      </div>
    );
  }
  if (f.type === 'select') {
    return (
      <div>
        {label}
        <select id={id} className={`form-control ${error ? 'invalid' : ''}`} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)}>
          {!f.required ? <option value="">—</option> : null}
          {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {f.help ? <div className="field-hint">{f.help}</div> : null}
        {error ? <div className="field-error">{error}</div> : null}
      </div>
    );
  }
  const str = typeof value === 'string' ? value : '';
  return (
    <div>
      {label}
      <div className="row" style={{ gap: 6 }}>
        <input
          id={id}
          className={`form-control ${error ? 'invalid' : ''}`}
          type={INPUT_TYPE[f.type] ?? 'text'}
          value={str}
          placeholder={f.type === 'secret' && storedHint && !clearing ? 'Sin cambios' : f.placeholder}
          autoComplete={f.type === 'secret' ? 'new-password' : 'off'}
          spellCheck={false}
          disabled={clearing}
          onChange={(e) => onChange(e.target.value)}
        />
        {f.type === 'secret' && storedHint ? (
          <button type="button" className="btn outline sm" onClick={onToggleClear} title={clearing ? 'Deshacer' : 'Borrar el secreto guardado'}>
            {clearing ? 'Deshacer' : 'Borrar'}
          </button>
        ) : null}
      </div>
      {f.type === 'secret' && storedHint ? (
        <div className="field-hint" style={clearing ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>
          {clearing ? 'Se borrará al guardar.' : storedHint}
        </div>
      ) : null}
      {f.type === 'secret' && str && isSecretReference(str) ? (
        <div className="field-hint"><ZapI size={11} /> Referencia: G3 leerá el valor de {str.startsWith('gsm:') ? 'Secret Manager' : 'la variable de entorno'}.</div>
      ) : null}
      {f.help ? <div className="field-hint">{f.help}</div> : null}
      {error ? <div className="field-error">{error}</div> : null}
    </div>
  );
}

