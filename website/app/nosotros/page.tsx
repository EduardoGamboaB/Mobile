import Link from 'next/link';
import type { Metadata } from 'next';
import { Icon } from '../../components/Icon';

export const metadata: Metadata = {
  title: 'Nosotros · Transportistas en Los Mochis, Sinaloa',
  description:
    'G3 Logistics: autotransporte federal de carga con base en Los Mochis, Sinaloa. Flota propia, seguimiento de cada viaje y monitoreo satelital 24/7.',
  alternates: { canonical: '/nosotros/' },
  openGraph: {
    title: 'Nosotros · G3 Logistics',
    description: 'Autotransporte federal de carga con flota propia.',
    url: '/nosotros/',
    images: [{ url: '/og-g3logistics.jpg', width: 1200, height: 630 }],
  },
};

export default function NosotrosPage() {
  return (
    <>
      <section className="hero">
        <div className="container" style={{ textAlign: 'center' }}>
          <span className="eyebrow">Quiénes somos</span>
          <h1>Resolvemos la logística de las empresas.</h1>
          <p className="lead" style={{ margin: '0 auto', maxWidth: 720 }}>
            G3 Logistics es una empresa mexicana de autotransporte federal de
            carga. Nuestro trabajo no es mover cajas: es que la carga de
            nuestros clientes llegue a tiempo, completa y documentada, con
            unidades propias y seguimiento de principio a fin.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <div>
            <span className="eyebrow">Nuestra historia</span>
            <h2>De una unidad a una operación con seguimiento total.</h2>
            <p>
              Empezamos en 2018 en Los Mochis, Sinaloa, con una unidad y una convicción: las empresas
              necesitan un transportista que responda por su carga, no uno
              que la subcontrate y desaparezca cuando hay un problema.
            </p>
            <p>
              Crecimos atendiendo a clientes que necesitaban cumplir ventanas
              de entrega estrictas y tener evidencia inmediata de cada viaje.
              Para lograrlo sumamos una torre de control, evidencia
              digital de cada entrega y <strong>monitoreo satelital
              24/7</strong> en todas nuestras unidades.
            </p>
            <p>
              Hoy operamos con <strong>unidades propias</strong>, cotización
              formal en menos de 4 horas hábiles y cumplimiento NOM sin
              excepciones. La flota crece con la demanda de nuestros
              clientes, en los giros y rutas que ellos necesitan.
            </p>
          </div>

          <div className="card">
            <h3>G3 en cifras</h3>
            <dl className="kv">
              {[
                ['Año de fundación',   '2018'],
                ['Flota',              '100% propia'],
                ['Seguimiento',        'Estatus y evidencia por viaje'],
                ['Monitoreo',          'Satelital 24/7'],
                ['Cotización formal',  '< 4 hrs hábiles'],
                ['Cumplimiento',       'NOM-068 · NOM-087 · CP 3.0'],
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
          <div className="section__head">
            <span className="eyebrow">Cómo trabajamos</span>
            <h2>Cuatro principios que aplicamos en cada viaje.</h2>
          </div>

          <div className="grid grid--2">
            {[
              { icon: 'truck' as const,    title: 'Flota propia, responsabilidad propia', desc: 'No subcontratamos tu carga. Las unidades y los operadores son de G3, y respondemos por el servicio completo.' },
              { icon: 'shield' as const,   title: 'Honestidad operativa',                 desc: 'Te decimos qué se puede y qué no antes de aceptar el viaje. Si hay un retraso, te avisamos antes de que preguntes.' },
              { icon: 'sparkles' as const, title: 'Visibilidad sin que la pidas',         desc: 'Estatus de cada viaje, evidencia de cada entrega y monitoreo satelital 24/7, sin tener que llamar para preguntar.' },
              { icon: 'lock' as const,     title: 'Cumplimiento sin excepción',           desc: 'Inspección NOM-068, bitácora NOM-087, Carta Porte 3.0 y seguros vigentes en cada operación.' },
            ].map((p) => (
              <div key={p.title} className="card">
                <div className="card__icon"><Icon name={p.icon} /></div>
                <h3>{p.title}</h3>
                <p className="mb-0">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container split split--reverse">
          <div>
            <span className="eyebrow">Cumplimiento</span>
            <h2>Cumplimos las normas que aplican al autotransporte.</h2>
            <p>
              Cada viaje que sale del patio cumple con la normativa vigente
              de la SICT y del SAT, y con los requisitos que exigen nuestros
              clientes corporativos.
            </p>
            <ul className="list-check">
              <li><strong>NOM-068-SCT-2-2014</strong> — Inspección físico-mecánica antes de cada salida.</li>
              <li><strong>NOM-087-SCT-2-2017</strong> — Bitácora de horas de servicio del operador.</li>
              <li><strong>Carta Porte 3.0 (SAT)</strong> — CFDI 4.0 con complemento en cada viaje.</li>
              <li><strong>Seguros vigentes</strong> — Responsabilidad civil y daños a la carga.</li>
            </ul>
          </div>

          <div className="card">
            <h3>Estándares de operación</h3>
            <dl className="kv">
              {[
                ['Registro SICT',      'Permiso federal vigente'],
                ['Rastreo satelital',  '24/7 · protocolos de reacción'],
                ['Evidencias',         'Digitales, de cada entrega'],
                ['Custodia',           'Disponible por ruta'],
                ['Datos operativos',   'En la nube · respaldo diario'],
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

      <section className="section section--dark">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>Platiquemos de tu operación.</h2>
              <p>Agenda una llamada de 30 minutos con nuestro equipo comercial.</p>
            </div>
            <Link href="/contacto/" className="btn btn--primary">
              Hablar con G3 <Icon name="arrow" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
