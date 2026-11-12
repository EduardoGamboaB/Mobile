import type { Metadata } from 'next';
import { Icon } from '../../components/Icon';
import { ContactForm } from '../../components/ContactForm';
import { whatsappLink } from '../../lib/site';

export const metadata: Metadata = {
  title: 'Contacto · Cotiza tu servicio',
  description:
    'Cotiza un servicio de transporte con la flota propia de G3 Logistics. Respondemos por correo o WhatsApp en menos de 4 horas hábiles.',
  alternates: { canonical: '/contacto/' },
  openGraph: {
    title: 'Contacto · G3 Logistics',
    description: 'Cotiza tu servicio. Respondemos en menos de 4 horas hábiles.',
    url: '/contacto/',
  },
};

const CARDS = [
  { icon: 'truck' as const,  title: 'Fletes',      desc: 'Cotizaciones, nuevas rutas y seguimiento de tus viajes.', email: 'fletes@g3logistics.mx' },
  { icon: 'wallet' as const, title: 'Facturación', desc: 'Facturas, complementos de pago y Carta Porte.',          email: 'facturacion@g3logistics.mx' },
];

export default function ContactoPage() {
  return (
    <>
      <section className="hero">
        <div className="container" style={{ textAlign: 'center' }}>
          <span className="eyebrow">Contacto</span>
          <h1>Cuéntanos qué necesitas mover.</h1>
          <p className="lead" style={{ margin: '0 auto', maxWidth: 640 }}>
            Te respondemos con una propuesta formal en menos de 4 horas
            hábiles, por correo o por WhatsApp.
          </p>
          <div className="hero__cta hero__cta--center">
            <a href={whatsappLink()} className="btn btn--primary" target="_blank" rel="noopener noreferrer">
              Escríbenos por WhatsApp <Icon name="arrow" />
            </a>
            <a href="#contacto-form" className="btn btn--ghost">Llenar el formulario</a>
          </div>
        </div>
      </section>

      <section className="section section--tint">
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="section__head">
            <span className="eyebrow">Formulario de contacto</span>
            <h2>Solicita tu cotización</h2>
            <p>Los campos con * son obligatorios.</p>
          </div>
          <ContactForm id="contacto-form" />
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 860 }}>
          <div className="grid grid--2">
            {CARDS.map((c) => (
              <a key={c.title} href={`mailto:${c.email}`} className="card card--link">
                <div className="card__icon"><Icon name={c.icon} /></div>
                <h3>{c.title}</h3>
                <p className="mb-0">{c.desc}</p>
                <span className="card__meta">{c.email}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tint">
        <div className="container">
          <div className="grid grid--3">
            {[
              { t: 'Corporativo CDMX',  d: 'Ejército Nacional 843\nGranada, Miguel Hidalgo\nCDMX 11520' },
              { t: 'Patio Monterrey',   d: 'Parque industrial Escobedo\nEscobedo, N.L.\nMonterrey' },
              { t: 'Horario comercial', d: 'Lunes a viernes 8:00-19:00\nSábados 9:00-14:00\nMonitoreo 24/7 en viajes activos' },
            ].map((c) => (
              <div key={c.t} className="card">
                <h3>{c.t}</h3>
                <p className="mb-0" style={{ whiteSpace: 'pre-line' }}>{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
