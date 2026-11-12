import Link from 'next/link';
import type { Metadata } from 'next';
import { Icon } from '../../components/Icon';

export const metadata: Metadata = {
  title: 'Tecnología · G3 Drive, G3 Admin y monitoreo satelital 24/7',
  description:
    'Tecnología propia para cada viaje: G3 Drive, la app de nuestros operadores, y G3 Admin, nuestra torre de control. Más monitoreo satelital 24/7 con protocolos de reacción.',
  alternates: { canonical: '/tecnologia/' },
  openGraph: {
    title: 'Tecnología · G3 Logistics',
    description: 'G3 Drive + G3 Admin + monitoreo satelital 24/7.',
    url: '/tecnologia/',
  },
};

const DRIVE = [
  { icon: 'cam' as const,    t: 'Evidencia al momento',       d: 'Fotos de carga y descarga, boleta de báscula y firma de entrega capturadas en el lugar, sin esperar papeles.' },
  { icon: 'shield' as const, t: 'Salidas seguras',            d: 'Inspección NOM-068 con foto antes de cada salida y bitácora de horas NOM-087 para operadores descansados.' },
  { icon: 'map' as const,    t: 'Funciona sin señal',         d: 'La app guarda todo en el teléfono y lo sincroniza al recuperar cobertura: no se pierde ningún registro en carretera.' },
  { icon: 'bell' as const,   t: 'Respuesta inmediata',        d: 'Chat directo con la torre de control y botón de emergencia para reportar cualquier incidente desde la cabina.' },
];

const ADMIN = [
  { icon: 'route' as const,  t: 'Cada viaje bajo control',    d: 'Folio único y estatus validado en cada etapa: asignación, recolección, tránsito, entrega y cierre.' },
  { icon: 'chart' as const,  t: 'Incidencias atendidas',      d: 'Alertas e incidentes llegan a la torre de control con ubicación y foto para resolverlos antes de que te afecten.' },
  { icon: 'check' as const,  t: 'Documentación sin recaptura', d: 'Carta Porte 3.0 (CFDI 4.0) generada con los datos del viaje: menos errores y salidas a tiempo.' },
  { icon: 'wallet' as const, t: 'Costos transparentes',       d: 'Gastos por viaje con tope y comprobante obligatorio: cotizaciones claras y sin cargos sorpresa.' },
];

const MONITOREO = [
  { icon: 'map' as const,    t: 'Ubicación en tiempo real',      d: 'Rastreo GPS de cada unidad durante todo el recorrido, no solo en los puntos de control.' },
  { icon: 'bell' as const,   t: 'Centro de monitoreo 24/7',      d: 'Vigilancia de la flota día y noche, con protocolos de reacción ante cualquier incidente.' },
  { icon: 'route' as const,  t: 'Geocercas y rutas autorizadas', d: 'Alerta inmediata si una unidad se desvía de su ruta o se detiene donde no debe.' },
  { icon: 'lock' as const,   t: 'Paro de motor remoto',          d: 'Inmovilización de la unidad a distancia ante robo o desvío, como parte del protocolo de seguridad.' },
  { icon: 'cam' as const,    t: 'Video y temperatura',           d: 'Video a bordo y sensores de temperatura en las unidades equipadas, para seguridad y cadena de frío.' },
  { icon: 'phone' as const,  t: 'Seguimiento compartido',        d: 'Liga para ver el recorrido en vivo, histórico de cada viaje y reportes descargables.' },
];

function FeatureGrid({ items, cols = 2 }: { items: { icon: Parameters<typeof Icon>[0]['name']; t: string; d: string }[]; cols?: 2 | 3 }) {
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

export default function TecnologiaPage() {
  return (
    <>
      <section className="hero hero--center">
        <div className="container">
          <span className="eyebrow">Tecnología</span>
          <h1>Tu carga, visible y protegida en todo momento.</h1>
          <p className="lead">
            Desarrollamos nuestra propia tecnología para operar cada viaje
            —<strong>G3 Drive</strong> en la cabina y <strong>G3 Admin</strong>{' '}
            en la torre de control— y la complementamos con monitoreo
            satelital 24/7.
          </p>
          <nav className="chips" aria-label="Secciones de la página">
            <a href="#g3-drive" className="chip">G3 Drive</a>
            <a href="#g3-admin" className="chip">G3 Admin</a>
            <a href="#monitoreo" className="chip">Monitoreo 24/7</a>
          </nav>
        </div>
      </section>

      <section className="section" id="g3-drive">
        <div className="container split split--top">
          <div className="split__intro">
            <span className="eyebrow">G3 Drive · app del operador</span>
            <h2>Lo que pasa en carretera, registrado en el momento.</h2>
            <p>
              Cada operador de G3 trabaja con G3 Drive, la app que
              desarrollamos para documentar el viaje desde la cabina. Tú
              recibes evidencia completa de cada entrega.
            </p>
          </div>
          <FeatureGrid items={DRIVE} />
        </div>
      </section>

      <section className="section section--tint" id="g3-admin">
        <div className="container split split--top">
          <div className="split__intro">
            <span className="eyebrow">G3 Admin · torre de control</span>
            <h2>Un equipo que ve toda la operación y actúa a tiempo.</h2>
            <p>
              Desde G3 Admin nuestra torre de control asigna unidades,
              sigue cada viaje y atiende incidencias, con la información
              de G3 Drive al instante.
            </p>
          </div>
          <FeatureGrid items={ADMIN} />
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
                ['Asignación',   'Unidad y operador en G3 Admin'],
                ['Salida',       'Inspección NOM-068 + Carta Porte'],
                ['En carretera', 'GPS y monitoreo 24/7'],
                ['Entrega',      'Fotos, báscula y firma en G3 Drive'],
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
              <h2>Ve la tecnología trabajando con tu carga.</h2>
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
