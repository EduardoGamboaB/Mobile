import type { Metadata } from 'next';
import { Icon } from '../../components/Icon';

export const metadata: Metadata = {
  title: 'Contacto · Agenda una demo de G3 Logistics',
  description:
    'Habla con G3 Logistics: agenda demo de 30 minutos, cotiza Enterprise o escribe a soporte. Atendemos por email y WhatsApp en menos de 4 horas hábiles.',
  alternates: { canonical: '/contacto/' },
  openGraph: {
    title: 'Contacto · G3 Logistics',
    description: 'Demo gratuita o cotización Enterprise. Respondemos en menos de 4 horas.',
    url: '/contacto/',
  },
};

export default function ContactoPage() {
  return (
    <>
      <section className="hero">
        <div className="container" style={{ textAlign: 'center' }}>
          <span className="eyebrow">Contacto</span>
          <h1>Hablemos 30 minutos.</h1>
          <p className="lead" style={{ margin: '0 auto', maxWidth: 600 }}>
            Te mostramos cómo G3 se conecta con tu operación actual. Sin
            compromiso, sin guion de ventas — preguntamos cómo trabajas y
            te decimos honestamente si te servimos.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <div>
            <h2>Escríbenos.</h2>
            <p>Respondemos en menos de 4 horas hábiles.</p>

            <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <a href="mailto:ventas@g3logistics.mx" className="card" style={{
                display: 'flex', gap: 14, alignItems: 'center',
              }}>
                <div className="card__icon" style={{ margin: 0 }}><Icon name="wallet" /></div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--navy-900)' }}>Ventas</div>
                  <div style={{ color: 'var(--ink-500)', fontSize: '0.9rem' }}>ventas@g3logistics.mx</div>
                </div>
              </a>

              <a href="mailto:soporte@g3logistics.mx" className="card" style={{
                display: 'flex', gap: 14, alignItems: 'center',
              }}>
                <div className="card__icon" style={{ margin: 0 }}><Icon name="shield" /></div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--navy-900)' }}>Soporte clientes</div>
                  <div style={{ color: 'var(--ink-500)', fontSize: '0.9rem' }}>soporte@g3logistics.mx</div>
                </div>
              </a>

              <a href="https://wa.me/525555550000" className="card" style={{
                display: 'flex', gap: 14, alignItems: 'center',
              }}>
                <div className="card__icon" style={{ margin: 0 }}><Icon name="phone" /></div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--navy-900)' }}>WhatsApp</div>
                  <div style={{ color: 'var(--ink-500)', fontSize: '0.9rem' }}>+52 55 5555 0000</div>
                </div>
              </a>
            </div>
          </div>

          <form
            className="card"
            action="https://formspree.io/f/REPLACE_ID"
            method="POST"
            style={{ padding: 28 }}
          >
            <h3 style={{ marginBottom: 16 }}>Agenda una demo</h3>

            {[
              { name: 'nombre', label: 'Nombre completo', type: 'text', required: true },
              { name: 'empresa', label: 'Empresa', type: 'text', required: true },
              { name: 'email', label: 'Correo electrónico', type: 'email', required: true },
              { name: 'telefono', label: 'Teléfono / WhatsApp', type: 'tel', required: false },
            ].map((f) => (
              <label key={f.name} style={{ display: 'block', marginBottom: 14 }}>
                <span style={{
                  display: 'block', fontSize: '0.85rem',
                  color: 'var(--ink-700)', marginBottom: 6, fontWeight: 600,
                }}>{f.label}{f.required ? ' *' : ''}</span>
                <input
                  type={f.type}
                  name={f.name}
                  required={f.required}
                  style={{
                    width: '100%', padding: '11px 14px',
                    border: '1px solid var(--ink-300)', borderRadius: 10,
                    fontSize: '0.95rem', fontFamily: 'inherit',
                  }}
                />
              </label>
            ))}

            <label style={{ display: 'block', marginBottom: 14 }}>
              <span style={{
                display: 'block', fontSize: '0.85rem',
                color: 'var(--ink-700)', marginBottom: 6, fontWeight: 600,
              }}>Tamaño de la flota</span>
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

            <label style={{ display: 'block', marginBottom: 16 }}>
              <span style={{
                display: 'block', fontSize: '0.85rem',
                color: 'var(--ink-700)', marginBottom: 6, fontWeight: 600,
              }}>¿Algo más que debamos saber?</span>
              <textarea
                name="mensaje"
                rows={4}
                style={{
                  width: '100%', padding: '11px 14px',
                  border: '1px solid var(--ink-300)', borderRadius: 10,
                  fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical',
                }}
              />
            </label>

            <button type="submit" className="btn btn--primary" style={{ width: '100%', justifyContent: 'center' }}>
              Enviar
            </button>
            <p style={{ fontSize: '0.78rem', color: 'var(--ink-500)', marginTop: 14, marginBottom: 0 }}>
              Al enviar aceptas nuestro aviso de privacidad. Nunca compartimos
              tus datos con terceros.
            </p>
          </form>
        </div>
      </section>
    </>
  );
}
