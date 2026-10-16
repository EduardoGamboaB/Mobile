import Link from 'next/link';
import type { Metadata } from 'next';
import { Icon } from '../../components/Icon';

export const metadata: Metadata = {
  title: 'Nosotros · Transportistas del agro mexicano',
  description:
    'G3 Logistics es una empresa mexicana especializada en transporte agroindustrial. Flota propia de jaula granelera y thermo, con cumplimiento NOM y torre de control 24/7.',
  alternates: { canonical: '/nosotros/' },
  openGraph: {
    title: 'Nosotros · G3 Logistics',
    description: 'Transportistas del agro. Jaula granelera + thermo. Cumplimiento NOM.',
    url: '/nosotros/',
  },
};

export default function NosotrosPage() {
  return (
    <>
      <section className="hero">
        <div className="container" style={{ textAlign: 'center' }}>
          <span className="eyebrow">Quiénes somos</span>
          <h1>Somos transportistas del agro. Y lo somos con orgullo.</h1>
          <p className="lead" style={{ margin: '0 auto', maxWidth: 720 }}>
            G3 Logistics nació en 2018 con una convicción: al campo
            mexicano le hace falta un transportista que entienda el ciclo
            agrícola — no uno que mueve grano como quien mueve refrescos.
            Empezamos en el Bajío con una unidad y una idea; hoy operamos
            12 unidades sobre corredores agroindustriales.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <div>
            <span className="eyebrow">Nuestra historia</span>
            <h2>De una jaula a un corredor agrícola.</h2>
            <p>
              Empezamos con una jaula granelera moviendo grano en el
              Bajío. Los primeros clientes fueron cooperativas y molinos
              que necesitaban un socio que no cancelara viajes cuando
              apretaba la temporada.
            </p>
            <p>
              Con el tiempo entendimos que el agro necesitaba más:
              temperatura controlada para semilla y biológico, ventanas
              de descarga negociadas con silos, evidencias digitales
              inmediatas para no atrasar la cadena. Sumamos <strong>thermo</strong>{' '}
              a la flota y una torre de control 24/7.
            </p>
            <p>
              Hoy operamos <strong>12 unidades propias</strong>, con
              cotización formal en menos de 4 horas hábiles, cumplimiento
              NOM sin excepciones y trazabilidad viaje por viaje. Para
              2026 sumamos <strong>plataforma</strong> — para mover
              maquinaria agrícola y ensacado — completando la oferta que
              nuestros clientes agri nos han pedido.
            </p>
          </div>

          <div className="card">
            <h3>Cifras de la operación</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              {[
                ['Año de fundación',        '2018'],
                ['Unidades propias',        '12 · jaula + thermo'],
                ['Modalidades activas',     '2 · próxima: plataforma'],
                ['Sector atendido',         '100% agro y agroindustria'],
                ['Cotización formal',       '< 4 hrs hábiles'],
                ['Cumplimiento SICT',       'NOM-068 · NOM-087'],
              ].map(([k, v]) => (
                <div key={k} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--linea)',
                  fontSize: '0.92rem',
                  gap: 12,
                }}>
                  <span style={{ color: 'var(--acero)' }}>{k}</span>
                  <strong style={{ color: 'var(--g3-azul)', textAlign: 'right' }}>{v}</strong>
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
                title: 'El ciclo agrícola manda',
                desc: 'Cada decisión — desde la modalidad hasta la ventana de descarga — respeta el tempo del sector: temporada, cosecha, humedad, ventanas de silo.',
              },
              {
                icon: 'shield' as const,
                title: 'Honestidad operativa',
                desc: 'Te decimos qué se puede y qué no antes de aceptar el viaje. Si vamos tarde a silo, te avisamos antes que tú nos preguntes.',
              },
              {
                icon: 'sparkles' as const,
                title: 'Tecnología al servicio del agro',
                desc: 'Torre de control 24/7, GPS por segundo, boleta de báscula digital, OCR de carta porte. Sirve al cliente agri, no lo estorba.',
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
            <h2>Cumplimos las NOM que aplican al autotransporte.</h2>
            <p>
              Cada viaje que sale del patio cumple con la normativa
              vigente de la SICT y con las certificaciones que nuestros
              clientes corporativos del agro exigen.
            </p>
            <ul className="list-check">
              <li><strong>NOM-068-SCT-2-2014</strong> — Inspección físico-mecánica pre-viaje de 12 puntos.</li>
              <li><strong>NOM-087-SCT-2-2017</strong> — Bitácora de horas de servicio del operador.</li>
              <li><strong>Carta Porte 3.0 (SAT)</strong> — Timbrado por PAC con doble redundancia.</li>
              <li><strong>Seguros vigentes</strong> — Responsabilidad civil, daños a carga y riesgos operativos.</li>
              <li><strong>Prácticas de sanidad</strong> — Jaula limpia entre viajes, sin contaminación cruzada de grano.</li>
            </ul>
          </div>

          <div className="card">
            <h3>Certificaciones y estándares</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
              {[
                ['Registro SICT',        'Concesión federal vigente'],
                ['Rastreo satelital',    'GPS por segundo · redundancia dual'],
                ['Custodia armada',      'Disponible por corredor y ruta'],
                ['Boleta de báscula',    'Digital y respaldada en la nube'],
                ['Datos operativos',     'GCP · us-central1 · respaldo diario'],
              ].map(([k, v]) => (
                <div key={k} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--linea)',
                  fontSize: '0.9rem',
                  gap: 12,
                }}>
                  <span style={{ color: 'var(--acero)' }}>{k}</span>
                  <strong style={{ color: 'var(--g3-azul)', textAlign: 'right' }}>{v}</strong>
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
