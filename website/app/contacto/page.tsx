import type { Metadata } from 'next';
import { Icon } from '../../components/Icon';

export const metadata: Metadata = {
  title: 'Contacto · Cotizar viaje o probar la tecnología',
  description:
    'Cotiza un viaje con la flota de G3 Logistics o prueba los productos G3 Admin y G3 Drive en tu propia flota. Respondemos por correo o WhatsApp en menos de 4 horas hábiles.',
  alternates: { canonical: '/contacto/' },
  openGraph: {
    title: 'Contacto · G3 Logistics',
    description: 'Cotiza un viaje o prueba nuestra tecnología. Respondemos en menos de 4 horas.',
    url: '/contacto/',
  },
};

const CARDS = [
  {
    icon: 'truck' as const,
    title: 'Mover carga',
    desc: 'Cotiza un viaje con la flota G3.',
    email: 'fletes@g3logistics.mx',
    accent: 'var(--road-500)',
  },
  {
    icon: 'sparkles' as const,
    title: 'Probar la tecnología',
    desc: 'G3 Admin + G3 Drive en tu flota.',
    email: 'tecnologia@g3logistics.mx',
    accent: 'var(--navy-700)',
  },
  {
    icon: 'shield' as const,
    title: 'Soporte clientes',
    desc: 'Ya tienes cuenta y necesitas ayuda.',
    email: 'soporte@g3logistics.mx',
    accent: 'var(--green-600)',
  },
];

export default function ContactoPage() {
  return (
    <>
      <section className="hero">
        <div className="container" style={{ textAlign: 'center' }}>
          <span className="eyebrow">Contacto</span>
          <h1>¿Qué necesitas hoy?</h1>
          <p className="lead" style={{ margin: '0 auto', maxWidth: 620 }}>
            Cotizar un viaje, conocer nuestra tecnología, o pedir soporte.
            Los tres caminos llegan al mismo equipo — respondemos en
            menos de 4 horas hábiles.
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
                <div style={{ color: 'var(--ink-500)', fontSize: '0.88rem', wordBreak: 'break-word' }}>
                  {c.email}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tint">
        <div className="container split">
          {/* ----- Form 1: Cotizar viaje ----- */}
          <form
            id="fletes"
            className="card"
            action="https://formspree.io/f/REPLACE_FLETES"
            method="POST"
            style={{ borderTop: '4px solid var(--road-500)' }}
          >
            <span className="eyebrow">Cotizar viaje</span>
            <h3 style={{ marginBottom: 4 }}>Mueve tu carga con G3</h3>
            <p style={{ marginBottom: 18, color: 'var(--ink-500)', fontSize: '0.9rem' }}>
              Te respondemos por correo o WhatsApp con cotización formal.
            </p>

            <div className="form">
              <label>
                Tu nombre *
                <input type="text" name="nombre" required autoComplete="name" />
              </label>
              <label>
                Empresa *
                <input type="text" name="empresa" required autoComplete="organization" />
              </label>
              <div className="form-row">
                <label>
                  Correo *
                  <input type="email" name="email" required autoComplete="email" inputMode="email" />
                </label>
                <label>
                  WhatsApp
                  <input type="tel" name="telefono" autoComplete="tel" inputMode="tel" />
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
              <label>
                Tipo de carga
                <select name="tipo_carga" defaultValue="Carga seca">
                  <option>Carga seca</option>
                  <option>Refrigerada</option>
                  <option>Sobredimensionada</option>
                  <option>Dedicado / Spot</option>
                  <option>Otro</option>
                </select>
              </label>
              <label>
                Notas
                <textarea name="notas" rows={3} placeholder="Fecha, peso aproximado, urgencia…" />
              </label>

              <input type="hidden" name="intent" value="fletes" />
              <button type="submit" className="btn btn--primary">
                Solicitar cotización <Icon name="arrow" />
              </button>
            </div>
          </form>

          {/* ----- Form 2: Probar la tech ----- */}
          <form
            id="tech"
            className="card"
            action="https://formspree.io/f/REPLACE_TECH"
            method="POST"
            style={{ borderTop: '4px solid var(--navy-700)' }}
          >
            <span className="eyebrow">Probar la tecnología</span>
            <h3 style={{ marginBottom: 4 }}>G3 Admin + G3 Drive para tu flota</h3>
            <p style={{ marginBottom: 18, color: 'var(--ink-500)', fontSize: '0.9rem' }}>
              Te damos demo y acceso al plan que mejor se ajuste.
            </p>

            <div className="form">
              <label>
                Tu nombre *
                <input type="text" name="nombre" required autoComplete="name" />
              </label>
              <label>
                Empresa *
                <input type="text" name="empresa" required autoComplete="organization" />
              </label>
              <div className="form-row">
                <label>
                  Correo *
                  <input type="email" name="email" required autoComplete="email" inputMode="email" />
                </label>
                <label>
                  WhatsApp
                  <input type="tel" name="telefono" autoComplete="tel" inputMode="tel" />
                </label>
              </div>
              <label>
                Tamaño de tu flota
                <select name="flota" defaultValue="1 unidad">
                  <option>1 unidad</option>
                  <option>2 a 5 unidades</option>
                  <option>6 a 20 unidades</option>
                  <option>21 a 50 unidades</option>
                  <option>Más de 50 unidades</option>
                </select>
              </label>
              <label>
                Qué te interesa
                <select name="producto" defaultValue="G3 Admin (panel web)">
                  <option>G3 Admin (panel web)</option>
                  <option>G3 Drive (app móvil)</option>
                  <option>Suite completa Admin + Drive</option>
                  <option>Aún no estoy seguro</option>
                </select>
              </label>
              <label>
                Notas
                <textarea name="notas" rows={3} placeholder="¿Algo específico que quieras saber?" />
              </label>

              <input type="hidden" name="intent" value="tech" />
              <button type="submit" className="btn btn--dark">
                Agendar demo <Icon name="arrow" />
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
