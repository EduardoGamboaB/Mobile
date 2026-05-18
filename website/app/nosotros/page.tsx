import Link from 'next/link';
import type { Metadata } from 'next';
import { Icon } from '../../components/Icon';

export const metadata: Metadata = {
  title: 'Nosotros · Transportista con tecnología propia',
  description:
    'G3 Logistics es una empresa mexicana de transporte de carga terrestre. Operamos flota propia y desarrollamos los productos G3 Admin y G3 Drive — hoy disponibles para otros transportistas.',
  alternates: { canonical: '/nosotros/' },
  openGraph: {
    title: 'Nosotros · G3 Logistics',
    description: 'Transportistas mexicanos que construyeron su propia tecnología.',
    url: '/nosotros/',
  },
};

export default function NosotrosPage() {
  return (
    <>
      <section className="hero">
        <div className="container" style={{ textAlign: 'center' }}>
          <span className="eyebrow">Quiénes somos</span>
          <h1>La transportista que construyó su propia tecnología.</h1>
          <p className="lead" style={{ margin: '0 auto', maxWidth: 720 }}>
            G3 Logistics empezó moviendo carga, no escribiendo software.
            Pero ningún sistema del mercado servía para cómo opera
            realmente una flota mexicana — así que construimos el nuestro.
            Hoy operamos más de 1,200 viajes al mes con esa misma
            tecnología, y la ofrecemos a otros transportistas.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <div>
            <span className="eyebrow">Nuestra historia</span>
            <h2>De flota propia a producto.</h2>
            <p>
              Empezamos con un tracto. Después fueron tres. Luego diez. En
              cada nuevo nivel descubrimos un problema operativo distinto:
              la bitácora en papel se perdía, las cartas porte llegaban
              días tarde, los conductores no sabían cuánto iban a cobrar,
              dispatch no sabía dónde estaba la unidad.
            </p>
            <p>
              Probamos cinco TMS distintos. Ninguno funcionó para nuestra
              realidad: sin señal en zonas serranas, conductores que
              prefieren WhatsApp, costos que se disparan con cada
              integración. Así que empezamos a construir.
            </p>
            <p>
              <strong>G3 Admin</strong> nació como un panel para que el
              dueño viera todo desde el celular. <strong>G3 Drive</strong>{' '}
              nació para que el conductor capturara la bitácora sin
              quitarse los guantes. Probados durante años en nuestros
              propios kilómetros antes de ofrecerlos a nadie.
            </p>
          </div>

          <div className="card">
            <h3>Cifras de la operación</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              {[
                ['Año de fundación', '2018'],
                ['Viajes acumulados', '+45,000'],
                ['Unidades en flota propia', '38 tractos · 52 remolques'],
                ['Conductores activos', '46'],
                ['Estados con cobertura', '32 (México)'],
                ['Productos tech lanzados', '2 (Admin + Drive)'],
              ].map(([k, v]) => (
                <div key={k} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--ink-100)',
                  fontSize: '0.92rem',
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
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span className="eyebrow">Cómo trabajamos</span>
            <h2>Cuatro principios que aplicamos a la carga y al código.</h2>
          </div>

          <div className="grid grid--2">
            {[
              {
                icon: 'truck' as const,
                title: 'La operación manda',
                desc: 'Cada decisión de producto se valida primero con nuestros propios conductores y dispatchers. Si no les sirve, no llega a clientes.',
              },
              {
                icon: 'shield' as const,
                title: 'Honestidad operativa',
                desc: 'Te decimos qué se puede y qué no antes de cerrar el viaje. Si vamos tarde, te avisamos antes que tú nos preguntes.',
              },
              {
                icon: 'sparkles' as const,
                title: 'Tech que sirve, no que impresiona',
                desc: 'Construimos features para resolver, no para vender. Por eso seis agentes IA, no veinte. Por eso modo offline, no real-time-everything.',
              },
              {
                icon: 'lock' as const,
                title: 'Soberanía de datos',
                desc: 'Tus datos viven en GCP us-central1 bajo nuestro control. Nada se vende, nada se comparte con terceros, nada se entrena con tu información.',
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
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span className="eyebrow">Doble identidad</span>
            <h2>Somos dos negocios en uno.</h2>
            <p style={{ maxWidth: 620, margin: '0 auto' }}>
              Si necesitas mover carga o si quieres llevarte nuestra
              tecnología, escribes al mismo equipo. Cuidamos los dos
              lados con la misma seriedad.
            </p>
          </div>

          <div className="grid grid--2">
            <div className="card" style={{ borderTop: '4px solid var(--road-500)' }}>
              <h3>G3 Logistics — Transportista</h3>
              <p>
                Operamos transporte terrestre de carga en México. Flota
                propia, conductores propios, oficina propia.
              </p>
              <Link href="/servicios/" className="btn btn--dark" style={{ marginTop: 12 }}>
                Ver servicios <Icon name="arrow" />
              </Link>
            </div>

            <div className="card" style={{ borderTop: '4px solid var(--navy-700)' }}>
              <h3>G3 Admin + G3 Drive — Productos</h3>
              <p>
                Los productos tech que usamos internamente, ahora
                disponibles para otros transportistas. Plan Free
                indefinido, escala a empresarial.
              </p>
              <Link href="/productos/admin/" className="btn btn--dark" style={{ marginTop: 12 }}>
                Ver productos <Icon name="arrow" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--dark">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>Conoce al equipo.</h2>
              <p>Te respondemos por correo o WhatsApp. Lo prometido en el sitio se cumple.</p>
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
