import Link from 'next/link';
import type { Metadata } from 'next';
import { Icon } from '../../components/Icon';

export const metadata: Metadata = {
  title: 'Tecnología · TMS propio y monitoreo satelital TotalProtect',
  description:
    'G3 Logistics opera con un TMS desarrollado in house y con la plataforma de monitoreo satelital 24/7 de TotalProtect: visibilidad, seguridad y evidencia de cada viaje.',
  alternates: { canonical: '/tecnologia/' },
  openGraph: {
    title: 'Tecnología · G3 Logistics',
    description: 'TMS propio + monitoreo satelital TotalProtect 24/7.',
    url: '/tecnologia/',
  },
};

const TMS = [
  { icon: 'route' as const,  t: 'Control de cada viaje',  d: 'Folio automático y estatus validado en cada etapa: asignación, recolección, tránsito, entrega y cierre.' },
  { icon: 'cam' as const,    t: 'Evidencias digitales',   d: 'Fotos de carga y descarga, boleta de báscula y POD capturadas en la app y disponibles al momento.' },
  { icon: 'shield' as const, t: 'Carta Porte 3.0',        d: 'CFDI 4.0 con complemento Carta Porte generado desde los datos del viaje, sin recaptura.' },
  { icon: 'phone' as const,  t: 'App del operador',       d: 'Bitácora NOM-087, inspección NOM-068 con evidencia, chat con la torre de control y modo sin señal.' },
  { icon: 'wallet' as const, t: 'Gastos bajo control',    d: 'Política de gastos por viaje con tope y comprobante obligatorio: costos claros y sin sorpresas.' },
  { icon: 'chart' as const,  t: 'Torre de control',       d: 'Panel con viajes activos, incidencias y desempeño de la operación para responderte con datos.' },
];

const TOTALPROTECT = [
  { icon: 'map' as const,    t: 'Rastreo en tiempo real',    d: 'Posición GPS de cada unidad durante todo el recorrido, no solo en los puntos de control.' },
  { icon: 'bell' as const,   t: 'Monitoreo 24/7 con reacción', d: 'Centro de monitoreo que vigila la flota día y noche y activa protocolos ante cualquier incidente.' },
  { icon: 'route' as const,  t: 'Geocercas y rutas autorizadas', d: 'Alertas inmediatas si una unidad se desvía de su ruta o se detiene donde no debe.' },
  { icon: 'lock' as const,   t: 'Paro de motor remoto',      d: 'Inmovilización de la unidad a distancia ante robo o desvío, como parte del protocolo de seguridad.' },
  { icon: 'cam' as const,    t: 'Video y temperatura',       d: 'Video a bordo y sensores de temperatura en las unidades equipadas, para seguridad y cadena de frío.' },
  { icon: 'check' as const,  t: 'Liga de seguimiento e histórico', d: 'Comparte el recorrido en vivo con tu equipo y consulta el histórico y reportes de cada viaje.' },
];

export default function TecnologiaPage() {
  return (
    <>
      <section className="hero">
        <div className="container" style={{ textAlign: 'center' }}>
          <span className="eyebrow">Tecnología</span>
          <h1>Tu carga, visible y protegida en todo momento.</h1>
          <p className="lead" style={{ margin: '0 auto', maxWidth: 720 }}>
            Operamos con dos capas de tecnología que trabajan juntas: un TMS
            que desarrollamos nosotros mismos para controlar cada viaje y la
            plataforma de monitoreo satelital de TotalProtect para vigilar
            cada unidad las 24 horas.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section__head">
            <span className="eyebrow">TMS G3 · desarrollado in house</span>
            <h2>Un sistema hecho para nuestra operación y tus entregas.</h2>
            <p>
              Lo construyó nuestro propio equipo de tecnología. Por eso se
              adapta a cómo operamos y evoluciona con lo que nuestros clientes
              nos piden.
            </p>
          </div>
          <div className="grid grid--3">
            {TMS.map((f) => (
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
          <div className="section__head">
            <span className="eyebrow">Monitoreo satelital · TotalProtect</span>
            <h2>Seguridad 24/7 para cada unidad de la flota.</h2>
            <p>
              Nuestras unidades operan con la plataforma de TotalProtect:
              rastreo GPS, centro de monitoreo y protocolos de reacción
              para proteger tu carga en carretera.
            </p>
          </div>
          <div className="grid grid--3">
            {TOTALPROTECT.map((f) => (
              <div key={f.t} className="card">
                <div className="card__icon"><Icon name={f.icon} /></div>
                <h3>{f.t}</h3>
                <p className="mb-0">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tint">
        <div className="container split">
          <div>
            <span className="eyebrow">Lo que ganas tú</span>
            <h2>Menos llamadas para saber dónde está tu carga.</h2>
            <p>
              El TMS sabe en qué etapa va cada viaje y TotalProtect sabe dónde
              está cada unidad. Juntos te dan respuestas antes de que las
              pidas.
            </p>
            <ul className="list-check">
              <li><strong>Visibilidad:</strong> estatus del viaje y ubicación en vivo en un mismo seguimiento.</li>
              <li><strong>Seguridad:</strong> monitoreo 24/7, geocercas y reacción ante desvíos.</li>
              <li><strong>Evidencia:</strong> fotos, báscula y POD de cada entrega, listos para tu cierre.</li>
              <li><strong>Cumplimiento:</strong> Carta Porte 3.0 y NOM en regla en cada salida.</li>
            </ul>
          </div>
          <div className="card">
            <h3>Cómo se ve un viaje</h3>
            <dl className="kv">
              {[
                ['Asignación',   'Unidad y operador en el TMS'],
                ['Salida',       'Inspección NOM-068 + Carta Porte'],
                ['En carretera', 'GPS y monitoreo TotalProtect'],
                ['Entrega',      'Fotos, báscula y POD en la app'],
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

      <section className="section">
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
