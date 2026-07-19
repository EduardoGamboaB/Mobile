import Link from 'next/link';
import type { Metadata } from 'next';
import { Icon } from '../../components/Icon';

export const metadata: Metadata = {
  title: 'Nosotros · Empresa mexicana de transporte de carga',
  description:
    'G3 Logistics es una empresa mexicana de transporte terrestre de carga. Operamos flota propia en 32 estados con torre de control 24/7 y cumplimiento NOM-068 y NOM-087.',
  alternates: { canonical: '/nosotros/' },
  openGraph: {
    title: 'Nosotros · G3 Logistics',
    description: 'Empresa mexicana de transporte de carga terrestre. Flota propia, 32 estados, 24/7.',
    url: '/nosotros/',
  },
};

export default function NosotrosPage() {
  return (
    <>
      <section className="hero">
        <div className="container" style={{ textAlign: 'center' }}>
          <span className="eyebrow">Quiénes somos</span>
          <h1>Somos transportistas. Y lo somos con orgullo.</h1>
          <p className="lead" style={{ margin: '0 auto', maxWidth: 720 }}>
            G3 Logistics nació en 2018 con un tracto y una idea sencilla:
            operar transporte de carga como lo esperan los clientes de este
            siglo — con visibilidad real, tiempos honestos y personas
            respondiendo del otro lado del teléfono.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <div>
            <span className="eyebrow">Nuestra historia</span>
            <h2>De un tracto a una flota nacional.</h2>
            <p>
              Empezamos con un tracto y rutas del Bajío. En cada nuevo nivel
              descubrimos un problema operativo: la carta porte llegaba días
              tarde, el cliente no sabía dónde iba su carga, la bitácora en
              papel se perdía en la caseta.
            </p>
            <p>
              Probamos cinco sistemas de gestión distintos. Ninguno funcionó
              para nuestra realidad — sin señal en zonas serranas,
              operadores que prefieren WhatsApp, costos que se disparan con
              cada integración. Así que construimos el nuestro.
            </p>
            <p>
              Hoy operamos <strong>+1,200 viajes al mes</strong> en 32
              estados, con <strong>38 tractos</strong> y{' '}
              <strong>52 remolques</strong> propios, atendiendo desde
              corporativos automotrices hasta operaciones farma con cadena
              de frío auditable.
            </p>
          </div>

          <div className="card">
            <h3>Cifras de la operación</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              {[
                ['Año de fundación',        '2018'],
                ['Viajes acumulados',       '+45,000'],
                ['Unidades en flota propia','38 tractos · 52 remolques'],
                ['Operadores activos',      '46'],
                ['Estados con cobertura',   '32 (México)'],
                ['Entregas a tiempo',       '99.4%'],
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

      <section className="section section--tint">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span className="eyebrow">Cómo trabajamos</span>
            <h2>Cuatro principios que aplicamos en cada viaje.</h2>
          </div>

          <div className="grid grid--2">
            {[
              {
                icon: 'truck' as const,
                title: 'La operación manda',
                desc: 'Cada decisión — desde el tipo de unidad hasta la ruta — se toma pensando en la persona que va al volante y en la carga que va atrás.',
              },
              {
                icon: 'shield' as const,
                title: 'Honestidad operativa',
                desc: 'Te decimos qué se puede y qué no antes de aceptar el viaje. Si vamos tarde, te avisamos antes que tú nos preguntes.',
              },
              {
                icon: 'sparkles' as const,
                title: 'Tecnología que sirve',
                desc: 'Torre de control 24/7, GPS por segundo, evidencias digitales y OCR de carta porte. Todo integrado para que tú solo veas resultados.',
              },
              {
                icon: 'lock' as const,
                title: 'Cumplimiento sin excepción',
                desc: 'Inspección pre-viaje NOM-068 y bitácora NOM-087 en cada operación. Seguros vigentes y trazabilidad auditable en cada folio.',
              },
            ].map((p) => (
              <div key={p.title} className="card">
                <div className="card__icon"><Icon name={p.icon} /></div>
                <h3>{p.title}</h3>
                <p style={{ marginBottom: 0 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container split split--reverse">
          <div>
            <span className="eyebrow">Cumplimiento</span>
            <h2>Cumplimos las NOM que aplican al autotransporte de carga.</h2>
            <p>
              Cada viaje que sale de nuestro patio cumple con la normativa
              vigente de la SICT y con las certificaciones de nuestros
              clientes corporativos.
            </p>
            <ul className="list-check">
              <li><strong>NOM-068-SCT-2-2014</strong> — Inspección físico-mecánica pre-viaje de 12 puntos.</li>
              <li><strong>NOM-087-SCT-2-2017</strong> — Bitácora de horas de servicio del operador.</li>
              <li><strong>NOM-251-SSA1-2009</strong> — Cadena de frío para alimentos, cuando aplica.</li>
              <li><strong>Carta Porte 3.0 (SAT)</strong> — Timbrado por PAC con doble redundancia.</li>
              <li><strong>Seguros vigentes</strong> — Responsabilidad civil, daños a carga y riesgos operativos.</li>
            </ul>
          </div>

          <div className="card">
            <h3>Certificaciones y estándares</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
              {[
                ['Registro SICT',        'Concesión federal vigente'],
                ['Rastreo satelital',    'GPS por segundo · redundancia dual'],
                ['Custodia armada',      'Disponible por corredor y ruta'],
                ['SLA promedio',         '99.4% entregas a tiempo · <0.3% incidencias'],
                ['Datos operativos',     'GCP · us-central1 · respaldo diario'],
              ].map(([k, v]) => (
                <div key={k} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--ink-100)',
                  fontSize: '0.9rem',
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

      <section className="section section--dark">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>Conoce a G3 en persona.</h2>
              <p>Agenda una llamada de 30 minutos con nuestro equipo comercial.</p>
            </div>
            <Link href="/contacto/" className="btn btn--dark">
              Hablar con G3 <Icon name="arrow" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
