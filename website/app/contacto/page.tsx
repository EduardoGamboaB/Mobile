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
                <div style={{ color: 'var(--ink-500)', fontSize: '0.88rem', wordBreak: 'break-all' }}>
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
            style={{ padding: 28, borderTop: '4px solid var(--road-500)' }}
          >
            <span className="eyebrow">Cotizar viaje</span>
            <h3 style={{ marginBottom: 4 }}>Mueve tu carga con G3</h3>
            <p style={{ marginBottom: 18, color: 'var(--ink-500)', fontSize: '0.9rem' }}>
              Te respondemos por correo o WhatsApp con cotización formal.
            </p>

            {[
              { name: 'nombre', label: 'Tu nombre', type: 'text', required: true },
              { name: 'empresa', label: 'Empresa', type: 'text', required: true },
              { name: 'email', label: 'Correo', type: 'email', required: true },
              { name: 'telefono', label: 'WhatsApp', type: 'tel', required: false },
            ].map((f) => (
              <label key={f.name} style={{ display: 'block', marginBottom: 12 }}>
                <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--ink-700)', marginBottom: 6, fontWeight: 600 }}>
                  {f.label}{f.required ? ' *' : ''}
                </span>
                <input type={f.type} name={f.name} required={f.required} style={{
                  width: '100%', padding: '11px 14px',
                  border: '1px solid var(--ink-300)', borderRadius: 10,
                  fontSize: '0.95rem', fontFamily: 'inherit',
                }} />
              </label>
            ))}

            <div className="grid grid--2" style={{ gap: 12 }}>
              <label>
                <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--ink-700)', marginBottom: 6, fontWeight: 600 }}>Origen *</span>
                <input type="text" name="origen" placeholder="CDMX" required style={{
                  width: '100%', padding: '11px 14px',
                  border: '1px solid var(--ink-300)', borderRadius: 10,
                  fontSize: '0.95rem', fontFamily: 'inherit',
                }} />
              </label>
              <label>
                <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--ink-700)', marginBottom: 6, fontWeight: 600 }}>Destino *</span>
                <input type="text" name="destino" placeholder="Monterrey" required style={{
                  width: '100%', padding: '11px 14px',
                  border: '1px solid var(--ink-300)', borderRadius: 10,
                  fontSize: '0.95rem', fontFamily: 'inherit',
                }} />
              </label>
            </div>

            <label style={{ display: 'block', marginTop: 12, marginBottom: 12 }}>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--ink-700)', marginBottom: 6, fontWeight: 600 }}>Tipo de carga</span>
              <select name="tipo_carga" style={{
                width: '100%', padding: '11px 14px',
                border: '1px solid var(--ink-300)', borderRadius: 10,
                fontSize: '0.95rem', fontFamily: 'inherit', background: 'white',
              }}>
                <option>Carga seca</option>
                <option>Refrigerada</option>
                <option>Sobredimensionada</option>
                <option>Dedicado / Spot</option>
                <option>Otro</option>
              </select>
            </label>

            <label style={{ display: 'block', marginBottom: 16 }}>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--ink-700)', marginBottom: 6, fontWeight: 600 }}>Notas</span>
              <textarea name="notas" rows={3} placeholder="Fecha, peso aproximado, urgencia…" style={{
                width: '100%', padding: '11px 14px',
                border: '1px solid var(--ink-300)', borderRadius: 10,
                fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical',
              }} />
            </label>

            <input type="hidden" name="intent" value="fletes" />
            <button type="submit" className="btn btn--primary" style={{ width: '100%', justifyContent: 'center' }}>
              Solicitar cotización
            </button>
          </form>

          {/* ----- Form 2: Probar la tech ----- */}
          <form
            id="tech"
            className="card"
            action="https://formspree.io/f/REPLACE_TECH"
            method="POST"
            style={{ padding: 28, borderTop: '4px solid var(--navy-700)' }}
          >
            <span className="eyebrow">Probar la tecnología</span>
            <h3 style={{ marginBottom: 4 }}>G3 Admin + G3 Drive para tu flota</h3>
            <p style={{ marginBottom: 18, color: 'var(--ink-500)', fontSize: '0.9rem' }}>
              Te damos demo y acceso al plan que mejor se ajuste.
            </p>

            {[
              { name: 'nombre', label: 'Tu nombre', type: 'text', required: true },
              { name: 'empresa', label: 'Empresa', type: 'text', required: true },
              { name: 'email', label: 'Correo', type: 'email', required: true },
              { name: 'telefono', label: 'WhatsApp', type: 'tel', required: false },
            ].map((f) => (
              <label key={f.name} style={{ display: 'block', marginBottom: 12 }}>
                <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--ink-700)', marginBottom: 6, fontWeight: 600 }}>
                  {f.label}{f.required ? ' *' : ''}
                </span>
                <input type={f.type} name={f.name} required={f.required} style={{
                  width: '100%', padding: '11px 14px',
                  border: '1px solid var(--ink-300)', borderRadius: 10,
                  fontSize: '0.95rem', fontFamily: 'inherit',
                }} />
              </label>
            ))}

            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--ink-700)', marginBottom: 6, fontWeight: 600 }}>Tamaño de tu flota</span>
              <select name="flota" style={{
                width: '100%', padding: '11px 14px',
                border: '1px solid var(--ink-300)', borderRadius: 10,
                fontSize: '0.95rem', fontFamily: 'inherit', background: 'white',
              }}>
                <option>1 unidad</option>
                <option>2 a 5 unidades</option>
                <option>6 a 20 unidades</option>
                <option>21 a 50 unidades</option>
                <option>Más de 50 unidades</option>
              </select>
            </label>

            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--ink-700)', marginBottom: 6, fontWeight: 600 }}>Qué te interesa</span>
              <select name="producto" style={{
                width: '100%', padding: '11px 14px',
                border: '1px solid var(--ink-300)', borderRadius: 10,
                fontSize: '0.95rem', fontFamily: 'inherit', background: 'white',
              }}>
                <option>G3 Admin (panel web)</option>
                <option>G3 Drive (app móvil)</option>
                <option>Suite completa Admin + Drive</option>
                <option>Aún no estoy seguro</option>
              </select>
            </label>

            <label style={{ display: 'block', marginBottom: 16 }}>
              <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--ink-700)', marginBottom: 6, fontWeight: 600 }}>Notas</span>
              <textarea name="notas" rows={3} placeholder="¿Algo específico que quieras saber?" style={{
                width: '100%', padding: '11px 14px',
                border: '1px solid var(--ink-300)', borderRadius: 10,
                fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical',
              }} />
            </label>

            <input type="hidden" name="intent" value="tech" />
            <button type="submit" className="btn btn--dark" style={{ width: '100%', justifyContent: 'center' }}>
              Agendar demo
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
