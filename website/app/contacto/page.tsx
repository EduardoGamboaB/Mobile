import type { Metadata } from 'next';
import { Icon } from '../../components/Icon';

export const metadata: Metadata = {
  title: 'Contacto · Cotiza tu viaje',
  description:
    'Cotiza un viaje con la flota de G3 Logistics. Cobertura en 32 estados de México. Respondemos por correo o WhatsApp en menos de 4 horas hábiles.',
  alternates: { canonical: '/contacto/' },
  openGraph: {
    title: 'Contacto · G3 Logistics',
    description: 'Cotiza tu viaje. Respondemos en menos de 4 horas hábiles.',
    url: '/contacto/',
  },
};

const CARDS = [
  {
    icon: 'truck' as const,
    title: 'Cotizar viaje',
    desc: 'Nuevo cliente o nuevo servicio.',
    email: 'fletes@g3logistics.mx',
    accent: 'var(--g3-azul)',
  },
  {
    icon: 'shield' as const,
    title: 'Cuentas empresariales',
    desc: 'Contratos anuales, dedicado y RFP.',
    email: 'empresas@g3logistics.mx',
    accent: 'var(--g3-oscuro)',
  },
  {
    icon: 'sparkles' as const,
    title: 'Soporte clientes',
    desc: 'Ya tienes viaje activo con nosotros.',
    email: 'soporte@g3logistics.mx',
    accent: 'var(--acero)',
  },
];

export default function ContactoPage() {
  return (
    <>
      <section className="hero">
        <div className="container" style={{ textAlign: 'center' }}>
          <span className="eyebrow">Contacto</span>
          <h1>Cotiza tu viaje.</h1>
          <p className="lead" style={{ margin: '0 auto', maxWidth: 640 }}>
            Cuéntanos qué producto agri necesitas mover, origen, destino
            y fecha objetivo. Te respondemos con cotización formal en
            menos de 4 horas hábiles — por correo o por WhatsApp.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid--3">
            {CARDS.map((c) => (
              <a
                key={c.title}
                href={`mailto:${c.email}`}
                className="card"
                style={{ borderTop: `4px solid ${c.accent}`, display: 'block' }}
              >
                <div className="card__icon"><Icon name={c.icon} /></div>
                <h3>{c.title}</h3>
                <p style={{ marginBottom: 12 }}>{c.desc}</p>
                <div style={{ color: 'var(--acero)', fontSize: '0.88rem', wordBreak: 'break-word' }}>
                  {c.email}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tint">
        <div className="container" style={{ maxWidth: 720 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <span className="eyebrow">Formulario de cotización</span>
            <h2>Mueve tu carga con G3</h2>
            <p>Te contactamos por el medio que prefieras.</p>
          </div>

          <form
            id="fletes"
            className="card"
            action="https://formspree.io/f/REPLACE_FLETES"
            method="POST"
            style={{ borderTop: '4px solid var(--g3-azul)' }}
          >
            <div className="form">
              <div className="form-row">
                <label>
                  Tu nombre *
                  <input type="text" name="nombre" required autoComplete="name" />
                </label>
                <label>
                  Empresa *
                  <input type="text" name="empresa" required autoComplete="organization" />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Correo *
                  <input type="email" name="email" required autoComplete="email" inputMode="email" />
                </label>
                <label>
                  WhatsApp
                  <input type="tel" name="telefono" autoComplete="tel" inputMode="tel" placeholder="+52 55 ..." />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Origen *
                  <input type="text" name="origen" placeholder="CDMX" required />
                </label>
                <label>
                  Destino *
                  <input type="text" name="destino" placeholder="Monterrey" required />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Producto a mover
                  <select name="producto" defaultValue="Grano (maíz, sorgo, trigo, soya…)">
                    <option>Grano (maíz, sorgo, trigo, soya…)</option>
                    <option>Fertilizante a granel</option>
                    <option>Fertilizante ensacado</option>
                    <option>Semilla certificada</option>
                    <option>Agroquímico / biológico</option>
                    <option>Otro producto agroindustrial</option>
                  </select>
                </label>
                <label>
                  Modalidad
                  <select name="modalidad" defaultValue="Jaula granelera">
                    <option>Jaula granelera</option>
                    <option>Thermo</option>
                    <option>Aún no lo sé — recomiéndenme</option>
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label>
                  Fecha objetivo
                  <input type="date" name="fecha" />
                </label>
                <label>
                  Toneladas aproximadas
                  <input type="text" name="peso" placeholder="Ej. 28 t · 1 unidad completa" />
                </label>
              </div>

              <label>
                Notas
                <textarea name="notas" rows={3} placeholder="Requerimientos especiales, referencias, contacto en destino…" />
              </label>

              <input type="hidden" name="intent" value="fletes" />
              <button type="submit" className="btn btn--primary">
                Solicitar cotización <Icon name="arrow" />
              </button>
              <p style={{ fontSize: '0.82rem', color: 'var(--acero)', textAlign: 'center', margin: 0 }}>
                Al enviar aceptas que G3 Logistics te contacte por correo o
                WhatsApp para responder tu solicitud.
              </p>
            </div>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid--3">
            {[
              { t: 'Corporativo CDMX',    d: 'Ejército Nacional 843\nGranada, Miguel Hidalgo\nCDMX 11520' },
              { t: 'Patio Monterrey',     d: 'Parque industrial Escobedo\nEscobedo, N.L.\nMonterrey' },
              { t: 'Horario comercial',   d: 'Lunes a viernes 8:00-19:00\nSábados 9:00-14:00\nOperación 24/7 en viajes activos' },
            ].map((c) => (
              <div key={c.t} className="card">
                <h3>{c.t}</h3>
                <p style={{ marginBottom: 0, whiteSpace: 'pre-line' }}>{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
