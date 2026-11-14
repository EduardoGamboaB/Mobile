import type { Metadata } from 'next';
import { Icon } from '../../components/Icon';
import { ContactForm } from '../../components/ContactForm';
import { BUSINESS, LOCATION_LABEL, MAPS_URL, whatsappLink } from '../../lib/site';

export const metadata: Metadata = {
  title: 'Contacto · Cotiza tu flete en Los Mochis, Sinaloa',
  description:
    'Cotiza tu flete con G3 Logistics en Los Mochis, Sinaloa. Llámanos o escríbenos por WhatsApp al +52 668 125 5045. Respuesta en menos de 4 horas hábiles.',
  alternates: { canonical: '/contacto/' },
  openGraph: {
    title: 'Contacto · G3 Logistics',
    description: 'Cotiza tu servicio. Respondemos en menos de 4 horas hábiles.',
    url: '/contacto/',
    images: [{ url: '/og-g3logistics.jpg', width: 1200, height: 630 }],
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
            <div className="card">
              <div className="card__icon"><Icon name="map" /></div>
              <h3>Ubicación</h3>
              <p>{LOCATION_LABEL}, {BUSINESS.countryName}</p>
              <a className="card__meta link" href={MAPS_URL} target="_blank" rel="noopener noreferrer">Ver en Google Maps</a>
            </div>
            <div className="card">
              <div className="card__icon"><Icon name="phone" /></div>
              <h3>Teléfono y WhatsApp</h3>
              <p><a className="link" href={`tel:${BUSINESS.phoneE164}`}>{BUSINESS.phoneDisplay}</a></p>
              <a className="card__meta link" href={whatsappLink()} target="_blank" rel="noopener noreferrer">Escribir por WhatsApp</a>
            </div>
            <div className="card">
              <div className="card__icon"><Icon name="bell" /></div>
              <h3>Horario comercial</h3>
              <p className="mb-0">
                {BUSINESS.hours.map((h) => (
                  <span key={h.days} style={{ display: 'block' }}>{h.days} {h.opens}-{h.closes}</span>
                ))}
                <span style={{ display: 'block' }}>Monitoreo 24/7 en viajes activos</span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
