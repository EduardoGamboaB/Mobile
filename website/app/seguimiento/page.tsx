import Link from 'next/link';
import type { Metadata } from 'next';
import { Icon } from '../../components/Icon';

export const metadata: Metadata = {
  title: 'Seguimiento y seguridad · Visibilidad de tu carga en cada viaje',
  description:
    'Seguimiento en tiempo real, evidencia digital de cada entrega, documentación en regla y monitoreo satelital 24/7 con protocolos de reacción.',
  alternates: { canonical: '/seguimiento/' },
  openGraph: {
    title: 'Seguimiento y seguridad · G3 Logistics',
    description: 'Tu carga, visible y protegida en todo momento.',
    url: '/seguimiento/',
  },
};

type Feature = { icon: Parameters<typeof Icon>[0]['name']; t: string; d: string };

const EVIDENCIA: Feature[] = [
  { icon: 'cam' as const,    t: 'Evidencia al momento',        d: 'Fotos de carga y descarga, boleta de báscula y firma de entrega capturadas en el lugar, sin esperar papeles.' },
  { icon: 'shield' as const, t: 'Salidas seguras',             d: 'Inspección NOM-068 con foto antes de cada salida y control de horas NOM-087 para operadores descansados.' },
  { icon: 'map' as const,    t: 'Registro continuo del viaje', d: 'Cada evento queda registrado aun en tramos sin señal y se actualiza al recuperar cobertura.' },
  { icon: 'bell' as const,   t: 'Reporte inmediato',           d: 'El operador reporta cualquier incidente desde la cabina y nuestro equipo responde en minutos.' },
];

const CONTROL: Feature[] = [
  { icon: 'route' as const,  t: 'Estatus de cada viaje',       d: 'Folio único y estatus en cada etapa: asignación, recolección, tránsito, entrega y cierre.' },
  { icon: 'chart' as const,  t: 'Incidencias atendidas',       d: 'Alertas con ubicación y foto que nuestro equipo resuelve antes de que afecten tu entrega.' },
  { icon: 'check' as const,  t: 'Documentación sin errores',   d: 'Carta Porte 3.0 (CFDI 4.0) emitida con los datos del viaje: salidas a tiempo y sin recaptura.' },
  { icon: 'wallet' as const, t: 'Costos transparentes',        d: 'Gastos de cada viaje controlados y comprobados: cotizaciones claras y sin cargos sorpresa.' },
];

const MONITOREO: Feature[] = [
  { icon: 'map' as const,    t: 'Ubicación en tiempo real',      d: 'Rastreo GPS de cada unidad durante todo el recorrido, no solo en los puntos de control.' },
  { icon: 'bell' as const,   t: 'Centro de monitoreo 24/7',      d: 'Vigilancia de la flota día y noche, con protocolos de reacción ante cualquier incidente.' },
  { icon: 'route' as const,  t: 'Geocercas y rutas autorizadas', d: 'Alerta inmediata si una unidad se desvía de su ruta o se detiene donde no debe.' },
  { icon: 'lock' as const,   t: 'Paro de motor remoto',          d: 'Inmovilización de la unidad a distancia ante robo o desvío, como parte del protocolo de seguridad.' },
  { icon: 'cam' as const,    t: 'Video y temperatura',           d: 'Video a bordo y sensores de temperatura en las unidades equipadas, para seguridad y cadena de frío.' },
  { icon: 'phone' as const,  t: 'Seguimiento compartido',        d: 'Liga para ver el recorrido en vivo, histórico de cada viaje y reportes descargables.' },
];

function FeatureGrid({ items, cols = 2 }: { items: Feature[]; cols?: 2 | 3 }) {
  return (
    <div className={`grid grid--${cols}`}>
      {items.map((f) => (
        <div key={f.t} className="card">
          <div className="card__icon"><Icon name={f.icon} /></div>
          <h3>{f.t}</h3>
          <p className="mb-0">{f.d}</p>
        </div>
      ))}
    </div>
  );
}

export default function SeguimientoPage() {
  return (
    <>
      <section className="hero hero--center">
        <div className="container">
          <span className="eyebrow">Seguimiento y seguridad</span>
          <h1>Tu carga, visible y protegida en todo momento.</h1>
          <p className="lead">
            En cada viaje sabes dónde está tu carga, en qué etapa va y
            recibes la evidencia de su entrega. Y mientras tanto, un centro
            de monitoreo vigila la unidad las 24 horas.
          </p>
          <nav className="chips" aria-label="Secciones de la página">
            <a href="#evidencia" className="chip">Evidencia</a>
            <a href="#control" className="chip">Control del viaje</a>
            <a href="#monitoreo" className="chip">Monitoreo 24/7</a>
          </nav>
        </div>
      </section>

      <section className="section" id="evidencia">
        <div className="container split split--top">
          <div className="split__intro">
            <span className="eyebrow">Evidencia de cada entrega</span>
            <h2>Lo que pasa en carretera, registrado en el momento.</h2>
            <p>
              Nuestros operadores documentan el viaje desde la cabina. Tú
              recibes evidencia completa de cada recolección y entrega.
            </p>
          </div>
          <FeatureGrid items={EVIDENCIA} />
        </div>
      </section>

      <section className="section section--tint" id="control">
        <div className="container split split--top">
          <div className="split__intro">
            <span className="eyebrow">Control de cada viaje</span>
            <h2>Un equipo que ve toda la operación y actúa a tiempo.</h2>
            <p>
              Nuestra torre de control asigna unidades, sigue cada viaje y
              atiende incidencias con información al instante.
            </p>
          </div>
          <FeatureGrid items={CONTROL} />
        </div>
      </section>

      <section className="section section--dark" id="monitoreo">
        <div className="container">
          <div className="section__head">
            <span className="eyebrow">Monitoreo satelital 24/7</span>
            <h2>Seguridad para cada unidad, todo el recorrido.</h2>
            <p>
              Todas nuestras unidades cuentan con rastreo GPS y centro de
              monitoreo con protocolos de reacción para proteger tu carga
              en carretera.
            </p>
          </div>
          <FeatureGrid items={MONITOREO} cols={3} />
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <div>
            <span className="eyebrow">Lo que ganas tú</span>
            <h2>Menos llamadas para saber dónde está tu carga.</h2>
            <ul className="list-check">
              <li><strong>Visibilidad:</strong> estatus del viaje y ubicación en vivo.</li>
              <li><strong>Seguridad:</strong> monitoreo 24/7, geocercas y reacción ante desvíos.</li>
              <li><strong>Evidencia:</strong> fotos, báscula y firma de entrega, listas para tu cierre.</li>
              <li><strong>Cumplimiento:</strong> Carta Porte 3.0 y NOM en regla en cada salida.</li>
            </ul>
          </div>
          <div className="card">
            <h3>Así se ve un viaje con G3</h3>
            <dl className="kv">
              {[
                ['Asignación',   'Unidad y operador confirmados'],
                ['Salida',       'Inspección NOM-068 + Carta Porte'],
                ['En carretera', 'GPS y monitoreo 24/7'],
                ['Entrega',      'Fotos, báscula y firma de recibido'],
                ['Cierre',       'Evidencias y documentos para ti'],
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

      <section className="section section--tint">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>Mueve tu carga con visibilidad total.</h2>
              <p>Cotiza un servicio y te mostramos el seguimiento en vivo.</p>
            </div>
            <Link href="/contacto/" className="btn btn--primary">
              Cotizar un servicio <Icon name="arrow" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
