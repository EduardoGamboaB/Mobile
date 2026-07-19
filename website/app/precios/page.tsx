import Link from 'next/link';
import type { Metadata } from 'next';
import { PricingTable } from '../../components/PricingTable';
import { Icon } from '../../components/Icon';

export const metadata: Metadata = {
  title: 'Precios · Planes desde gratis hasta empresarial',
  description:
    'Cinco planes en MXN: Free ($0), Starter ($349), Pro ($899), Business ($2,499) y Enterprise (cotización). IA, mapa en vivo y autorización de pagos según plan.',
  alternates: { canonical: '/precios/' },
  openGraph: {
    title: 'Precios de G3 Logistics',
    description: '5 planes en MXN. Desde $0 hasta empresarial.',
    url: '/precios/',
  },
};

const FAQ = [
  {
    q: '¿Tengo que dejar tarjeta para el plan Free?',
    a: 'No. El plan Free es indefinido, soporta 1 unidad y 1 usuario, y no pide datos de pago.',
  },
  {
    q: '¿Puedo subir y bajar de plan?',
    a: 'Sí. Subes en cualquier momento y aplica inmediato. Bajas al cierre del ciclo facturable.',
  },
  {
    q: '¿Qué pasa si supero el límite de viajes del mes?',
    a: 'La app te avisa antes y te invita a subir al siguiente plan. No se borra nada — todo queda guardado.',
  },
  {
    q: '¿La IA está incluida o es aparte?',
    a: 'Los 6 agentes IA (OCR, clasificación, asistente, scoring, etc.) vienen desde el plan Pro. Free y Starter no los incluyen.',
  },
  {
    q: '¿Aceptan facturación CFDI?',
    a: 'Sí, en todos los planes pagos. Configuras tu RFC al activar la suscripción.',
  },
  {
    q: '¿Cómo funciona Enterprise?',
    a: 'Cotizamos según número de unidades, integraciones con tu ERP, requerimientos de SLA y soporte dedicado. Habitualmente desde 50 unidades.',
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="hero">
        <div className="container" style={{ textAlign: 'center' }}>
          <span className="eyebrow">Precios</span>
          <h1>Crece a tu ritmo. Paga lo que usas.</h1>
          <p className="lead" style={{ margin: '0 auto', maxWidth: 640 }}>
            Cinco planes pensados para acompañarte desde tu primer tracto
            hasta una flota empresarial. Todos los precios en MXN, sin
            sorpresas ni cargos por usuario adicional dentro del plan.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <PricingTable />
          <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--ink-500)', fontSize: '0.9rem' }}>
            Precios en pesos mexicanos. Facturación mensual. IVA no incluido.
          </p>
        </div>
      </section>

      <section className="section section--tint">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span className="eyebrow">Detalle</span>
            <h2>Qué incluye cada plan.</h2>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{
                width: '100%', minWidth: 640,
                borderCollapse: 'collapse',
                fontSize: '0.92rem',
              }}>
              <thead>
                <tr style={{ background: 'var(--navy-50)' }}>
                  {['Capacidad', 'Free', 'Starter', 'Pro', 'Business', 'Enterprise'].map((h, i) => (
                    <th key={h} style={{
                      textAlign: i === 0 ? 'left' : 'center',
                      padding: '14px 16px',
                      color: 'var(--navy-900)',
                      fontWeight: 700,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Unidades (tractos + remolques)', '1', '3', '5', '30', 'Ilimitado'],
                  ['Usuarios del panel', '1', '2', '5', '20', 'Ilimitado'],
                  ['Viajes / mes', '20', '100', '500', '5,000', 'Ilimitado'],
                  ['Bitácora + evidencias', '•', '•', '•', '•', '•'],
                  ['OCR de evidencias', '—', '•', '•', '•', '•'],
                  ['Autorización de pagos', '—', '•', '•', '•', '•'],
                  ['Mapa en vivo', '—', '—', '•', '•', '•'],
                  ['Asistente IA + agentes', '—', '—', '•', '•', '•'],
                  ['Scoring conductores/unidades', '—', '—', '•', '•', '•'],
                  ['API + integración ERP', '—', '—', '—', '•', '•'],
                  ['Multi-usuario por rol', '—', '—', '—', '•', '•'],
                  ['Workflows custom', '—', '—', '—', '—', '•'],
                  ['Data Lake / BigQuery', '—', '—', '—', '—', '•'],
                  ['Soporte dedicado', '—', 'Email', 'Email', 'Slack', '24/7 + SLA'],
                ].map((row) => (
                  <tr key={row[0]} style={{ borderTop: '1px solid var(--ink-100)' }}>
                    {row.map((cell, i) => (
                      <td key={i} style={{
                        textAlign: i === 0 ? 'left' : 'center',
                        padding: '12px 16px',
                        color: cell === '—' ? 'var(--ink-300)' : 'var(--ink-700)',
                        fontWeight: cell === '•' ? 600 : 400,
                      }}>
                        {cell === '•' ? <span style={{ color: 'var(--green-600)' }}>✓</span> : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
          <p style={{ textAlign: 'center', marginTop: 14, color: 'var(--ink-500)', fontSize: '0.82rem' }}>
            Desliza la tabla horizontalmente en dispositivos móviles.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span className="eyebrow">Preguntas frecuentes</span>
            <h2>Lo que nos preguntan en demos.</h2>
          </div>

          <div className="grid grid--2">
            {FAQ.map((f) => (
              <div key={f.q} className="card">
                <h3>{f.q}</h3>
                <p style={{ marginBottom: 0 }}>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--dark">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>¿Dudas de qué plan te conviene?</h2>
              <p>30 minutos contigo y te decimos cuál y por qué.</p>
            </div>
            <Link href="/contacto/" className="btn btn--dark">
              Agendar llamada <Icon name="arrow" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
