import Link from 'next/link';
import type { Metadata } from 'next';
import { Icon } from '../../components/Icon';

export const metadata: Metadata = {
  title: 'Servicios · Transporte de carga para empresas',
  description:
    'Flete completo nacional, transporte dedicado, temperatura controlada, granel y logística a la medida. Flota propia, monitoreo satelital 24/7 y Carta Porte 3.0.',
  alternates: { canonical: '/servicios/' },
  openGraph: {
    title: 'Servicios de transporte de carga · G3 Logistics',
    description: 'Resolvemos la logística de tu empresa con flota propia.',
    url: '/servicios/',
  },
};

const SERVICIOS = [
  {
    icon: 'truck' as const,
    title: 'Flete completo nacional',
    desc: 'Tu carga viaja sola en la unidad, de tu origen a tu destino, sin transbordos.',
    capabilities: [
      'Rutas nacionales con fecha de entrega comprometida',
      'Cita de carga y descarga coordinada con tu almacén',
      'Evidencia de entrega (POD) el mismo día',
    ],
  },
  {
    icon: 'route' as const,
    title: 'Transporte dedicado',
    desc: 'Unidades y operadores asignados a tu operación para cargas recurrentes.',
    capabilities: [
      'Frecuencia fija: diaria, semanal o por temporada',
      'Mismos operadores, que conocen tus instalaciones',
      'Indicadores de servicio mensuales de tu cuenta',
    ],
  },
  {
    icon: 'bell' as const,
    title: 'Temperatura controlada',
    desc: 'Unidades thermo para producto que exige un rango de temperatura de origen a destino.',
    capabilities: [
      'Rango según la ficha técnica de tu producto',
      'Registro de temperatura por viaje, auditable',
      'Alertas si la temperatura sale de rango',
    ],
  },
  {
    icon: 'chart' as const,
    title: 'Carga a granel',
    desc: 'Movimiento de producto a granel con control de peso en cada punto del viaje.',
    capabilities: [
      'Boleta de báscula de origen y destino digitalizada',
      'Unidad limpia entre viajes, sin contaminación cruzada',
      'Coordinación de ventanas con planta, silo o almacén',
    ],
  },
  {
    icon: 'sparkles' as const,
    title: 'Logística a la medida',
    desc: 'Diseñamos el esquema de transporte a partir de tus volúmenes, rutas y temporadas.',
    capabilities: [
      'Diagnóstico de tu operación actual',
      'Propuesta de rutas, frecuencias y tipo de unidad',
      'Arranque acompañado y ajuste con datos reales',
    ],
  },
  {
    icon: 'shield' as const,
    title: 'Cumplimiento y documentación',
    desc: 'Cada viaje sale con su documentación en regla y su evidencia lista para tu auditoría.',
    capabilities: [
      'Carta Porte 3.0 (CFDI 4.0) timbrada desde el viaje',
      'Inspección NOM-068 y bitácora NOM-087',
      'Seguro de carga y responsabilidad civil vigentes',
    ],
  },
];

export default function ServiciosPage() {
  return (
    <>
      <section className="hero">
        <div className="container hero__grid">
          <div>
            <span className="eyebrow">Servicios</span>
            <h1>El transporte que tu operación necesita, con flota propia.</h1>
            <p className="lead">
              No vendemos un tipo de caja: resolvemos cómo llega tu carga.
              Asignamos unidades propias, operadores de G3 y monitoreo
              satelital 24/7 a cada servicio.
            </p>
            <div className="hero__cta">
              <Link href="/contacto/" className="btn btn--primary">
                Cotizar un servicio <Icon name="arrow" />
              </Link>
              <Link href="/seguimiento/" className="btn btn--ghost">
                Ver el seguimiento
              </Link>
            </div>
          </div>

          <div className="preview" aria-hidden>
            <div className="preview__caption">Tu carga · En vivo</div>
            <div className="preview__rows">
              <div className="preview__row">
                <span>Querétaro → Monterrey · 680 km</span>
                <span className="preview__pill preview__pill--ok">En ruta autorizada</span>
              </div>
              <div className="preview__row">
                <span>ETA en destino</span>
                <span className="preview__pill preview__pill--ok">Hoy 18:40</span>
              </div>
              <div className="preview__row">
                <span>Carta Porte 3.0</span>
                <span className="preview__pill preview__pill--ok">Timbrada</span>
              </div>
              <div className="preview__row">
                <span>Última posición GPS</span>
                <span className="preview__pill preview__pill--ok">hace 30 s</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section__head">
            <span className="eyebrow">Qué resolvemos</span>
            <h2>Seis formas de mover tu carga.</h2>
          </div>

          <div className="grid grid--3">
            {SERVICIOS.map((s) => (
              <div key={s.title} className="card">
                <div className="card__icon"><Icon name={s.icon} /></div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                <ul className="list-check mb-0">
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
            <span className="eyebrow">Flota y cobertura</span>
            <h2>Unidades propias, en las rutas que tu empresa necesita.</h2>
            <p>
              Toda la operación se hace con unidades de G3 Logistics: no
              subcontratamos tu carga. Así respondemos por el servicio de
              principio a fin y la flota crece con la demanda de nuestros
              clientes.
            </p>
            <ul className="list-check">
              <li>Cobertura nacional en rutas troncales</li>
              <li>Fuerte presencia en el Pacífico norte, el Bajío y el centro del país</li>
              <li>Acceso a puertos del Pacífico: Manzanillo, Mazatlán, Guaymas y Topolobampo</li>
              <li>Configuraciones actuales: thermo, granel y plataforma en incorporación</li>
            </ul>
          </div>

          <div className="card">
            <h3>Datos operativos</h3>
            <dl className="kv">
              {[
                ['Unidades',                   '100% propias'],
                ['Operadores',                 'Propios y capacitados'],
                ['Tiempo medio de cotización', '< 4 hrs hábiles'],
                ['Monitoreo satelital',        '24/7 con protocolos de reacción'],
                ['Seguimiento',                'Estatus y evidencia de cada viaje'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section__head">
            <span className="eyebrow">Cumplimiento</span>
            <h2>Cada viaje cumple la normativa SICT y SAT.</h2>
            <p>No es un extra; es el estándar mínimo con el que operamos.</p>
          </div>

          <div className="grid grid--3">
            {[
              { icon: 'shield' as const, t: 'NOM-068-SCT-2-2014', d: 'Inspección físico-mecánica antes de cada salida, firmada por el operador y respaldada con foto.' },
              { icon: 'route'  as const, t: 'NOM-087-SCT-2-2017', d: 'Bitácora de horas de servicio del operador, con descansos y controles de jornada auditables.' },
              { icon: 'cam'    as const, t: 'Carta Porte 3.0',    d: 'CFDI 4.0 con complemento Carta Porte 3.0 del SAT, emitido con los datos de cada viaje.' },
            ].map((f) => (
              <div key={f.t} className="card">
                <div className="card__icon"><Icon name={f.icon} /></div>
                <h3>{f.t}</h3>
                <p className="mb-0">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--dark">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>Cotiza tu servicio en menos de 4 horas hábiles.</h2>
              <p>Cuéntanos origen, destino, tipo de carga y frecuencia.</p>
            </div>
            <Link href="/contacto/" className="btn btn--primary">
              Solicitar cotización <Icon name="arrow" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
