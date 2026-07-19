import Link from 'next/link';
import type { Metadata } from 'next';
import { Icon } from '../../components/Icon';

export const metadata: Metadata = {
  title: 'Servicios de transporte de carga · México',
  description:
    'Transporte terrestre de carga en México: seca, refrigerada, sobredimensionada y dedicada. Cobertura en 32 estados con trazabilidad en vivo, torre de control 24/7 y cumplimiento NOM.',
  alternates: { canonical: '/servicios/' },
  openGraph: {
    title: 'Servicios de transporte · G3 Logistics',
    description: 'Movemos tu carga: seca, refrigerada, sobredimensionada y dedicada.',
    url: '/servicios/',
  },
};

const SERVICIOS = [
  {
    icon: 'truck' as const,
    title: 'Carga seca',
    desc: 'Caja 53\' y 48\' para mercancía general, producto terminado, materias primas y manufactura ligera.',
    capabilities: [
      'Hasta 30 toneladas por unidad',
      'FTL (full truck load) y LTL (consolidado)',
      'Cross-docking en hubs de CDMX y Monterrey',
    ],
  },
  {
    icon: 'shield' as const,
    title: 'Carga refrigerada',
    desc: 'Cadena de frío continua para alimentos, perecederos, farmacéutica y químicos sensibles.',
    capabilities: [
      'Rango controlado -20°C a +20°C',
      'Registro de temperatura por viaje (auditable)',
      'Cumplimiento NOM-251 y buenas prácticas farma',
    ],
  },
  {
    icon: 'route' as const,
    title: 'Sobredimensionada',
    desc: 'Plataforma y lowboy para maquinaria pesada, estructuras, transformadores y carga indivisible.',
    capabilities: [
      'Permisos SICT y federales gestionados por nosotros',
      'Pilotos y custodias coordinados',
      'Análisis de ruta con obras civiles y libramientos',
    ],
  },
  {
    icon: 'wallet' as const,
    title: 'Dedicado / Spot',
    desc: 'Unidades asignadas exclusivamente a tu operación, o flete puntual con cotización en horas.',
    capabilities: [
      'Contratos por temporada o anuales',
      'SLA medibles y reporting mensual',
      'Spot: cotización en menos de 4 horas hábiles',
    ],
  },
];

const SECTORES = [
  { name: 'Automotriz',          desc: 'JIT a planta y centros de distribución' },
  { name: 'Manufactura',         desc: 'Materias primas y producto terminado' },
  { name: 'Alimentos y bebidas', desc: 'Frío continuo y temperatura ambiente' },
  { name: 'Farmacéutica',        desc: 'Cadena de frío con registro auditable' },
  { name: 'Comercio y retail',   desc: 'Cross-dock y reposición a tienda' },
  { name: 'Construcción',        desc: 'Plataforma para estructuras y maquinaria' },
];

export default function ServiciosPage() {
  return (
    <>
      <section className="hero">
        <div className="container hero__grid">
          <div>
            <span className="eyebrow">Servicios de transporte</span>
            <h1>Movemos tu carga por todo México con trazabilidad en vivo.</h1>
            <p className="lead">
              Flota propia. Operadores capacitados. Torre de control 24/7.
              Cobertura en 32 estados con visibilidad real desde la
              recolección hasta la entrega — no estimaciones por correo.
            </p>
            <div className="hero__cta">
              <Link href="/contacto/" className="btn btn--primary">
                Cotizar un viaje <Icon name="arrow" />
              </Link>
              <a href="mailto:fletes@g3logistics.mx" className="btn btn--ghost">
                fletes@g3logistics.mx
              </a>
            </div>
          </div>

          <div className="preview" aria-hidden>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Tu carga · En vivo
            </div>
            <div className="preview__rows">
              <div className="preview__row">
                <span>CDMX → Monterrey · 720 km</span>
                <span className="preview__pill preview__pill--ok">88 km/h</span>
              </div>
              <div className="preview__row">
                <span>ETA estimado</span>
                <span className="preview__pill preview__pill--ok">17:34</span>
              </div>
              <div className="preview__row">
                <span>Temperatura caja (reefer)</span>
                <span className="preview__pill preview__pill--ok">4.2 °C</span>
              </div>
              <div className="preview__row">
                <span>Última actualización</span>
                <span className="preview__pill preview__pill--ok">hace 12s</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span className="eyebrow">Tipos de servicio</span>
            <h2>Cuatro modalidades. Una sola operación.</h2>
          </div>

          <div className="grid grid--2">
            {SERVICIOS.map((s) => (
              <div key={s.title} className="card">
                <div className="card__icon"><Icon name={s.icon} /></div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                <ul className="list-check" style={{ margin: 0 }}>
                  {s.capabilities.map((c) => <li key={c}>{c}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tint" id="cobertura">
        <div className="container split">
          <div>
            <span className="eyebrow">Cobertura</span>
            <h2>32 estados, rutas troncales y last-mile.</h2>
            <p>
              Operamos las principales rutas comerciales del país: corredor
              Bajío-CDMX, ruta del noreste (Mty, N.L., Coahuila), corredor
              del Pacífico (GDL, Tepic, Mazatlán) y península de Yucatán.
            </p>
            <ul className="list-check">
              <li>Recolecciones en CDMX, Mty, GDL, QRO, Puebla, Toluca, León, Tijuana, Mérida</li>
              <li>Entregas en planta, centros de distribución y last-mile urbano</li>
              <li>Cross-docking en hubs propios de CDMX y Monterrey</li>
              <li>Rutas internacionales: T-MEC con asociaciones en Laredo y El Paso</li>
            </ul>
          </div>

          <div className="card">
            <h3>Datos operativos</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
              {[
                ['Viajes completados',        '+1,200 / mes'],
                ['Entregas a tiempo',         '99.4%'],
                ['Tiempo medio de cotización','< 4 hrs'],
                ['Incidencias críticas',      '< 0.3%'],
                ['Trazabilidad en vivo',      '100% de los viajes'],
              ].map(([k, v]) => (
                <div key={k} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--ink-100)',
                  fontSize: '0.92rem',
                  gap: 12,
                }}>
                  <span style={{ color: 'var(--ink-700)' }}>{k}</span>
                  <strong style={{ color: 'var(--navy-900)', textAlign: 'right' }}>{v}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span className="eyebrow">Cumplimiento NOM</span>
            <h2>Cada viaje cumple con la normativa SICT.</h2>
            <p style={{ maxWidth: 640, margin: '0 auto' }}>
              No es un extra; es el estándar mínimo con el que operamos.
            </p>
          </div>

          <div className="grid grid--3">
            {[
              { icon: 'shield' as const, t: 'NOM-068-SCT-2-2014', d: 'Inspección físico-mecánica pre-viaje de 12 puntos, firmada por el operador y respaldada con foto en cada salida.' },
              { icon: 'route'  as const, t: 'NOM-087-SCT-2-2017', d: 'Bitácora de horas de servicio del operador. Descansos obligatorios y controles de jornada auditables por autoridad.' },
              { icon: 'cam'    as const, t: 'Carta Porte 3.0',    d: 'Timbrado CFDI 4.0 con complemento Carta Porte 3.0 (SAT) y respaldo por PAC con doble redundancia.' },
            ].map((f) => (
              <div key={f.t} className="card">
                <div className="card__icon"><Icon name={f.icon} /></div>
                <h3>{f.t}</h3>
                <p style={{ marginBottom: 0 }}>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tint">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span className="eyebrow">Sectores que atendemos</span>
            <h2>Operamos donde la operación no perdona errores.</h2>
          </div>

          <div className="grid grid--3">
            {SECTORES.map((s) => (
              <div key={s.name} className="card">
                <h3>{s.name}</h3>
                <p style={{ marginBottom: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--dark">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>Cotiza tu viaje en menos de 4 horas hábiles.</h2>
              <p>Cuéntanos origen, destino, tipo de carga y fecha — te respondemos por correo o WhatsApp.</p>
            </div>
            <Link href="/contacto/" className="btn btn--dark">
              Solicitar cotización <Icon name="arrow" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
