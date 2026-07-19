import Link from 'next/link';
import type { Metadata } from 'next';
import { Icon } from '../../components/Icon';

export const metadata: Metadata = {
  title: 'Servicios · Transporte de granos, fertilizantes y carga agroindustrial',
  description:
    'Especialistas en transporte agroindustrial en México: jaula granelera, thermo y (próximamente) plataforma. Cobertura del corredor agrícola del Bajío y norte del país.',
  alternates: { canonical: '/servicios/' },
  openGraph: {
    title: 'Servicios de transporte agroindustrial · G3 Logistics',
    description: 'Jaula granelera + thermo. Granos, fertilizantes y carga del sector agro.',
    url: '/servicios/',
  },
};

const SERVICIOS = [
  {
    icon: 'truck' as const,
    title: 'Jaula granelera',
    tag: 'Modalidad principal',
    desc: 'Transporte de grano a granel de origen a silo, planta o centro de acopio. La modalidad que más operamos: la conocemos a detalle.',
    capabilities: [
      'Capacidad hasta 30 toneladas por unidad',
      'Compatibilidad con básculas y silos',
      'Descarga por gravedad o con lona lateral',
      'Piso limpio entre viajes · sin contaminación cruzada',
    ],
    products: 'Maíz · sorgo · trigo · soya · cebada · cártamo · girasol · avena.',
  },
  {
    icon: 'shield' as const,
    title: 'Thermo',
    tag: 'Temperatura controlada',
    desc: 'Carga agri sensible a temperatura: semilla, biológico, fertilizante que exige rango controlado, perecedero agroindustrial.',
    capabilities: [
      'Rango controlado por ficha técnica del producto',
      'Registro de temperatura por viaje (auditable)',
      'Cadena de frío continua sin cortes',
      'Sensor calibrado y bitácora de operador',
    ],
    products: 'Semilla certificada · biológicos · fertilizante hidratado · perecedero agri.',
  },
  {
    icon: 'route' as const,
    title: 'Plataforma',
    tag: 'Próximamente 2026',
    desc: 'En incorporación: maquinaria agrícola, ensacado en tarima, estructuras de silo y carga indivisible. Avisamos cuando entra en operación.',
    capabilities: [
      'Maquinaria agrícola y equipo de labranza',
      'Fertilizante y agroquímico ensacado en tarima',
      'Estructuras de silo, tolvas, tuberías',
      'Permisos SICT gestionados cuando aplique',
    ],
    products: 'Tractores · sembradoras · cosechadoras · fertilizante en saco.',
    upcoming: true,
  },
];

const SECTORES = [
  { name: 'Agricultura de granos',   desc: 'Maíz, sorgo, trigo, soya, cebada, cártamo y girasol.' },
  { name: 'Fertilizantes',           desc: 'Urea, DAP, MAP, sulfato y mezclas físicas a granel.' },
  { name: 'Semillas y agroinsumos',  desc: 'Semilla certificada, biológicos y agroquímico.' },
  { name: 'Acopio y silos',          desc: 'Bodegas de acopio, silos y CEDIs agroindustriales.' },
  { name: 'Agroindustria',           desc: 'Molinos, cerveceras, engordas y plantas alimenticias.' },
  { name: 'Cooperativas',            desc: 'Cooperativas y uniones de productores rurales.' },
];

export default function ServiciosPage() {
  return (
    <>
      <section className="hero">
        <div className="container hero__grid">
          <div>
            <span className="eyebrow">Servicios de transporte</span>
            <h1>
              Especialistas en granos, fertilizantes y carga agroindustrial.
            </h1>
            <p className="lead">
              Flota propia de jaula granelera y thermo. Torre de control
              24/7 y trazabilidad viaje por viaje desde el patio hasta el
              silo, la planta o el centro de acopio.
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
                <span>Cd. Obregón → Guadalajara · 1,140 km</span>
                <span className="preview__pill preview__pill--ok">Sorgo · 28 t</span>
              </div>
              <div className="preview__row">
                <span>ETA silo destino</span>
                <span className="preview__pill preview__pill--ok">Mañana 09:30</span>
              </div>
              <div className="preview__row">
                <span>Peso confirmado en báscula origen</span>
                <span className="preview__pill preview__pill--ok">28,340 kg</span>
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
            <span className="eyebrow">Modalidades</span>
            <h2>Dos activas hoy · una más en 2026.</h2>
          </div>

          <div className="grid grid--3">
            {SERVICIOS.map((s) => (
              <div key={s.title} className="card" style={{ position: 'relative' }}>
                {s.upcoming && (
                  <span className="badge" style={{ position: 'absolute', top: 18, right: 18 }}>
                    {s.tag}
                  </span>
                )}
                <div className="card__icon"><Icon name={s.icon} /></div>
                <h3>{s.title}</h3>
                {!s.upcoming && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--road-500)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                    {s.tag}
                  </div>
                )}
                <p>{s.desc}</p>
                <ul className="list-check" style={{ marginTop: 4 }}>
                  {s.capabilities.map((c) => <li key={c}>{c}</li>)}
                </ul>
                <div style={{ marginTop: 12, paddingTop: 14, borderTop: '1px solid var(--ink-100)', fontSize: '0.85rem', color: 'var(--ink-500)' }}>
                  <strong style={{ color: 'var(--navy-900)' }}>Productos: </strong>{s.products}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tint" id="cobertura">
        <div className="container split">
          <div>
            <span className="eyebrow">Cobertura</span>
            <h2>Corredor agrícola: Bajío + norte del país.</h2>
            <p>
              Concentramos operación donde vive el grano y el fertilizante
              en México — puertos del Pacífico, valles agrícolas del norte
              y centros de consumo del Bajío y centro.
            </p>
            <ul className="list-check">
              <li>Corredor norte: Sinaloa, Sonora, Chihuahua y Tamaulipas</li>
              <li>Bajío: Guanajuato, Jalisco, Michoacán, Querétaro y Aguascalientes</li>
              <li>Puertos operados: Manzanillo, Mazatlán, Guaymas, Topolobampo</li>
              <li>Rutas troncales cerealera y de agroquímico</li>
              <li>Servicio a silos, plantas alimenticias y centros de acopio</li>
            </ul>
          </div>

          <div className="card">
            <h3>Datos operativos</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
              {[
                ['Unidades propias',           '12 · jaula + thermo'],
                ['Modalidades activas',        '2 · próxima: plataforma'],
                ['Tiempo medio de cotización', '< 4 hrs hábiles'],
                ['Torre de control',           '24/7 · 365 días'],
                ['Trazabilidad en vivo',       '100% de los viajes'],
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
            <h2>Cada viaje cumple la normativa SICT.</h2>
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
            <h2>Vivimos del ciclo agrícola mexicano.</h2>
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
              <p>Cuéntanos origen, destino, producto y fecha — te respondemos por correo o WhatsApp.</p>
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
