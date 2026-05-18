'use client';
import { useState } from 'react';
import {
  Tier, TierLabel, TierPrice, TierAudience, TIER_BULLETS, TIER_RANK,
  type TierValue,
} from '@/lib/tiers';
import { useAppStore } from '@/lib/store';
import { SparklesI, CheckI } from '@/components/Icons';

const ORDER: TierValue[] = ['free', 'starter', 'pro', 'business', 'enterprise'];

export default function PlansPage() {
  const currentTier = useAppStore((s) => s.tier);
  const setTier = useAppStore((s) => s.setTier);
  const [selected, setSelected] = useState<TierValue>(currentTier);
  const [confirmed, setConfirmed] = useState(false);

  const action = selected === currentTier
    ? null
    : TIER_RANK[selected] > TIER_RANK[currentTier] ? 'upgrade' : 'downgrade';

  const onConfirm = () => {
    if (!action) return;
    setTier(selected);
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 2500);
  };

  return (
    <>
      <div className="row-between" style={{ marginBottom: 24 }}>
        <div>
          <div className="eyebrow">CUENTA · SUBSCRIPCIÓN</div>
          <h1 className="h1">Planes G3 Admin</h1>
          <p className="small" style={{ marginTop: 6, maxWidth: 720 }}>
            G3 Admin replica los tiers de G3 Drive. Mejorar el plan habilita módulos como
            mapa de flotilla, scoring, AI Insights, integración ERP y exportación a data lake.
          </p>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div className="caption">TU PLAN ACTUAL</div>
            <div className="h2" style={{ marginTop: 2 }}>{TierLabel[currentTier]}</div>
          </div>
        </div>
      </div>

      {confirmed ? (
        <div className="banner info" style={{ marginBottom: 20 }}>
          <CheckI size={18} /> Plan actualizado a {TierLabel[selected]}. Los módulos disponibles se actualizan al instante en la barra lateral.
        </div>
      ) : null}

      <div className="grid-3" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        {ORDER.map((t) => (
          <PlanCard
            key={t}
            tier={t}
            selected={t === selected}
            current={t === currentTier}
            onSelect={() => setSelected(t)}
          />
        ))}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="row-between">
          <div>
            <div className="eyebrow">FACTURACIÓN</div>
            <div className="small" style={{ marginTop: 4 }}>
              MXN por unidad por mes · primer mes sin compromiso · cancela cuando quieras.
              Pago disponible vía Stripe / Conekta (próximamente).
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn outline sm" onClick={() => setSelected(currentTier)} disabled={!action}>
              Cancelar
            </button>
            <button
              className={action === 'upgrade' ? 'btn accent' : 'btn outline'}
              onClick={onConfirm}
              disabled={!action}
            >
              {!action
                ? 'Plan actual'
                : selected === 'enterprise'
                  ? 'Solicitar cotización'
                  : action === 'upgrade'
                    ? `Mejorar a ${TierLabel[selected]}`
                    : `Cambiar a ${TierLabel[selected]}`}
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ background: 'var(--surface)' }}>
        <div className="row" style={{ gap: 12, marginBottom: 12 }}>
          <span className="icon-tile sm blue"><SparklesI size={18} color="var(--blue)" /></span>
          <strong>El verdadero juego</strong>
        </div>
        <div className="small">
          Cada plan suma puntos al moat. Pro+ activa el motor de scoring y la captura de
          datos de inteligencia, base de los servicios financieros (Fase 5) que vendemos
          a aseguradoras, financieras y arrendadoras. La suscripción es el caballo de
          Troya hacia el dato; el dato es el activo.
        </div>
      </div>
    </>
  );
}

function PlanCard({
  tier, selected, current, onSelect,
}: { tier: TierValue; selected: boolean; current: boolean; onSelect: () => void }) {
  const price = TierPrice[tier];
  return (
    <div className={`plan-card ${selected ? 'current' : ''}`} onClick={onSelect}>
      <div className="row-between" style={{ marginBottom: 4 }}>
        <strong className="h3" style={{ color: selected ? '#fff' : 'var(--text)' }}>{TierLabel[tier]}</strong>
        {current ? <span className={`chip ${selected ? 'white' : 'green'}`}>ACTUAL</span> : null}
      </div>
      <div className="caption" style={{ marginBottom: 14 }}>{TierAudience[tier]}</div>
      <div className="price">
        {price === 0 ? 'Gratis' : price === null ? 'Cotización' : (
          <>
            <span style={{ fontSize: 18, fontWeight: 700, opacity: 0.6 }}>$</span>
            {price.toLocaleString('es-MX')}
          </>
        )}
      </div>
      <div className="price-suffix" style={{ marginBottom: 14 }}>
        {price === null ? 'Contactar ventas' : 'MXN · por unidad / mes'}
      </div>
      <div>
        {TIER_BULLETS[tier].map((b, i) => (
          <div key={i} className="plan-bullet">
            <span className="dot" />
            <span style={{ fontSize: 13, opacity: selected ? 0.92 : 1 }}>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
