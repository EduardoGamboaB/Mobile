import Link from 'next/link';
import type { Metadata } from 'next';
import { Icon } from '../../../components/Icon';

export const metadata: Metadata = {
  title: 'G3 Admin — Centro de mando para tu flota | G3 Logistics',
  description:
    'Panel web para dueños y dispatchers: viajes, mapa en vivo, autorización de pagos, scoring y alertas. Plan gratuito con 1 unidad.',
};

const FEATURES = [
  {
    icon: 'truck' as const,
    title: 'Gestión de flota',
    desc: 'Tractos, remolques y conductores en un solo lugar con foto, papeles, licencias y vencimientos.',
  },
  {
    icon: 'route' as const,
    title: 'Viajes con folio automático',
    desc: 'Captura un viaje en 30 segundos y obtén un folio único G3-AAAA-NNNNN. Estados a lo largo del ciclo.',
  },
  {
    icon: 'map' as const,
    title: 'Mapa en vivo (Pro+)',
    desc: 'Posición, velocidad y dirección de cada tracto activo. Alertas por desvío de ruta.',
  },
  {
    icon: 'wallet' as const,
    title: 'Autorización de pagos (Starter+)',
    desc: 'Cuando el conductor entrega, tú decides cuándo se libera el pago. Sin esperas externas.',
  },
  {
    icon: 'chart' as const,
    title: 'Scoring de conductores y unidades (Pro+)',
    desc: 'Métricas de incidencias, consumo de combustible, puntualidad y comportamiento en ruta.',
  },
  {
    icon: 'bell' as const,
    title: 'Alertas inteligentes (Pro+)',
    desc: 'Licencias por vencer, mantenimiento programado, SOS de conductores y desvíos. Llegan por WhatsApp.',
  },
  {
    icon: 'sparkles' as const,
    title: 'Asistente IA',
    desc: 'Pregunta en lenguaje natural: "¿qué viajes faltan por cobrar?", "¿cuáles conductores tuvieron incidentes esta semana?".',
  },
  {
    icon: 'lock' as const,
    title: 'Multi-usuario por rol (Business+)',
    desc: 'Owner, admin, dispatcher, viewer. Cada rol ve solo lo que necesita para su trabajo.',
  },
];

export default function AdminPage() {
  return (
    <>
      <section className="hero">
        <div className="container hero__grid">
          <div>
            <span className="eyebrow">Producto · Web</span>
            <h1>G3 Admin</h1>
            <p className="lead">
              El centro de mando para dueños y dispatchers. Toda tu operación
              en una pantalla — viajes, flota, conductores, pagos y alertas.
            </p>
            <div className="hero__cta">
              <Link href="/contacto/" className="btn btn--primary">
                Agendar demo <Icon name="arrow" />
              </Link>
              <Link href="/precios/" className="btn btn--ghost">
                Ver planes
              </Link>
            </div>
          </div>

          <div className="preview" aria-hidden>
            <div className="preview__chrome"><span /><span /><span /></div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              Dashboard · Hoy
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                ['Viajes activos', '14'],
                ['En tránsito', '8'],
                ['Pendientes de pago', '3'],
                ['Alertas', '2'],
              ].map(([k, v]) => (
                <div key={k} style={{ background: 'rgba(255,255,255,0.06)', padding: '14px', borderRadius: 12 }}>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k}</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span className="eyebrow">Capacidades</span>
            <h2>Todo lo que necesita una oficina de transporte.</h2>
          </div>

          <div className="grid grid--4">
            {FEATURES.map((f) => (
              <div key={f.title} className="card">
                <div className="card__icon"><Icon name={f.icon} /></div>
                <h3>{f.title}</h3>
                <p style={{ marginBottom: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tint">
        <div className="container split">
          <div>
            <span className="eyebrow">Roles</span>
            <h2>Cada quien ve lo suyo.</h2>
            <p>
              G3 Admin no es un panel único — es la vista que cada perfil
              necesita en su día a día.
            </p>
            <ul className="list-check">
              <li><strong>Owner</strong>: ingresos, scoring de la flota, presión de tier.</li>
              <li><strong>Admin</strong>: usuarios, integraciones, configuración de planes.</li>
              <li><strong>Dispatcher</strong>: captura de viajes, mapa en vivo, autorización de pagos.</li>
              <li><strong>Viewer</strong>: solo lectura — útil para contadores externos o socios.</li>
            </ul>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: 24 }}>
              <h3 style={{ marginBottom: 6 }}>Pedro · Owner</h3>
              <p style={{ color: 'var(--ink-500)', margin: 0, fontSize: '0.9rem' }}>Acceso: total</p>
            </div>
            <div style={{ borderTop: '1px solid var(--ink-100)', padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Ingresos del mes</span>
                <strong>$284,500</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Viajes completados</span>
                <strong>47</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Score promedio flota</span>
                <strong style={{ color: 'var(--green-600)' }}>8.4 / 10</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--dark">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>Empieza con G3 Admin gratis.</h2>
              <p>Plan Free incluye 1 unidad y bitácora completa. Sin tarjeta.</p>
            </div>
            <Link href="/contacto/" className="btn btn--dark">Empezar</Link>
          </div>
        </div>
      </section>
    </>
  );
}
