import Link from 'next/link';

/**
 * Tabla de planes. Refleja el catálogo real de @g3/contracts:
 * 5 tiers · precios en MXN · límites de unidades y viajes.
 */
const TIERS = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    period: 'siempre',
    desc: 'Para autotransportistas individuales que arrancan a digitalizar.',
    features: [
      '1 unidad · 1 usuario',
      'Bitácora básica',
      'Carga de evidencias',
      'Reporte de incidentes',
      'Hasta 20 viajes / mes',
    ],
    cta: 'Empezar gratis',
    featured: false,
  },
  {
    key: 'starter',
    name: 'Starter',
    price: '$349',
    period: 'MXN / mes',
    desc: 'Cuando ya tienes flujo y quieres acelerar tu cobro.',
    features: [
      'Hasta 3 unidades · 2 usuarios',
      'Autorización de pagos',
      'OCR de evidencias',
      'Tablero de ingresos',
      'Notificaciones por WhatsApp',
    ],
    cta: 'Probar 14 días',
    featured: false,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$899',
    period: 'MXN / mes',
    desc: 'Para flotas pequeñas que necesitan visibilidad y eficiencia.',
    features: [
      'Hasta 5 unidades · 5 usuarios',
      'Mapa en vivo',
      'Asistente IA + 4 agentes',
      'Scoring de conductores',
      'Alertas inteligentes',
    ],
    cta: 'Hablar con ventas',
    featured: true,
  },
  {
    key: 'business',
    name: 'Business',
    price: '$2,499',
    period: 'MXN / mes',
    desc: 'Operación multi-usuario con integración a tu ERP.',
    features: [
      'Hasta 30 unidades · 20 usuarios',
      'Multi-usuario por rol',
      'Acceso API',
      'Integración ERP',
      'Analítica avanzada',
    ],
    cta: 'Hablar con ventas',
    featured: false,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 'Cotización',
    period: 'a tu medida',
    desc: 'Operaciones grandes con SLA, soporte dedicado y workflows custom.',
    features: [
      'Unidades · usuarios ilimitados',
      'Workflows custom',
      'Modelos predictivos',
      'Exportación a Data Lake',
      'Soporte dedicado',
    ],
    cta: 'Solicitar cotización',
    featured: false,
  },
];

export function PricingTable() {
  return (
    <div className="pricing">
      {TIERS.map((t) => (
        <div key={t.key} className={`tier ${t.featured ? 'tier--featured' : ''}`}>
          <div className="tier__name">{t.name}</div>
          <div className="tier__price">{t.price}</div>
          <div className="tier__period">{t.period}</div>
          <p className="tier__desc">{t.desc}</p>
          <ul className="tier__features">
            {t.features.map((f) => <li key={f}>{f}</li>)}
          </ul>
          <Link
            href="/contacto/"
            className={`btn ${t.featured ? 'btn--primary' : 'btn--ghost-dark'}`}
          >
            {t.cta}
          </Link>
        </div>
      ))}
    </div>
  );
}
