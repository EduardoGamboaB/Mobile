import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { WhatsAppWidget } from '../components/WhatsAppWidget';
import { Enhance } from '../components/Enhance';
import { BUSINESS, LOCATION_LABEL, MAPS_URL, SITE_URL } from '../lib/site';

const TITLE = `G3 Logistics | Transporte de carga en ${LOCATION_LABEL}`;
const DESCRIPTION =
  `Transporte de carga en ${LOCATION_LABEL}, con flota propia: flete completo, dedicado, refrigerado y granel a todo México, con monitoreo satelital 24/7.`;
const OG_IMAGE = { url: '/og-g3logistics.jpg', width: 1200, height: 630, alt: `G3 Logistics · Transporte de carga en ${LOCATION_LABEL}` };

export const viewport: Viewport = {
  themeColor: '#101A30',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: '%s | G3 Logistics' },
  description: DESCRIPTION,
  keywords: [
    'transporte de carga Los Mochis',
    'fletes Los Mochis',
    'empresa de transporte Los Mochis Sinaloa',
    'transporte de carga Sinaloa',
    'fletes Sinaloa',
    'autotransporte federal de carga',
    'flete completo nacional',
    'transporte dedicado',
    'transporte con temperatura controlada',
    'transporte de granel',
    'transportista con flota propia',
    'logística Los Mochis',
    'monitoreo satelital 24/7',
    'Carta Porte 3.0',
    'G3 Logistics',
  ],
  authors: [{ name: 'G3 Logistics', url: SITE_URL }],
  creator: 'G3 Logistics',
  publisher: 'G3 Logistics',
  alternates: { canonical: '/', languages: { 'es-MX': '/' } },
  openGraph: {
    type: 'website',
    siteName: 'G3 Logistics',
    title: TITLE,
    description: DESCRIPTION,
    locale: 'es_MX',
    url: SITE_URL,
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  category: 'business',
  // Etiquetas geográficas (las leen algunos buscadores y directorios locales).
  other: {
    'geo.region': BUSINESS.stateCode,
    'geo.placename': LOCATION_LABEL,
    'geo.position': `${BUSINESS.lat};${BUSINESS.lng}`,
    ICBM: `${BUSINESS.lat}, ${BUSINESS.lng}`,
  },
};

// Datos estructurados: negocio local + sitio + servicios, en un solo grafo.
const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'LocalBusiness',
      '@id': `${SITE_URL}/#negocio`,
      name: BUSINESS.name,
      url: SITE_URL,
      logo: `${SITE_URL}/brand/g3-logistics-positivo.svg`,
      image: [`${SITE_URL}${OG_IMAGE.url}`, `${SITE_URL}/img/carrusel/carretera.jpg`],
      description: DESCRIPTION,
      slogan: 'Resolvemos la logística de tu empresa con flota propia.',
      telephone: BUSINESS.phoneE164,
      email: BUSINESS.emailFletes,
      foundingDate: '2018',
      address: {
        '@type': 'PostalAddress',
        addressLocality: BUSINESS.city,
        addressRegion: BUSINESS.state,
        addressCountry: BUSINESS.country,
      },
      geo: { '@type': 'GeoCoordinates', latitude: BUSINESS.lat, longitude: BUSINESS.lng },
      hasMap: MAPS_URL,
      areaServed: [
        { '@type': 'City', name: 'Los Mochis' },
        { '@type': 'State', name: 'Sinaloa' },
        { '@type': 'State', name: 'Sonora' },
        { '@type': 'Country', name: 'México' },
      ],
      openingHoursSpecification: BUSINESS.hours.map((h) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: h.schema,
        opens: h.opens,
        closes: h.closes,
      })),
      contactPoint: [
        { '@type': 'ContactPoint', contactType: 'sales', telephone: BUSINESS.phoneE164, email: BUSINESS.emailFletes, areaServed: 'MX', availableLanguage: ['Spanish'] },
        { '@type': 'ContactPoint', contactType: 'billing', email: BUSINESS.emailFacturacion, areaServed: 'MX', availableLanguage: ['Spanish'] },
      ],
      knowsAbout: ['Autotransporte federal de carga', 'Flete completo', 'Transporte dedicado', 'Transporte refrigerado', 'Transporte de granel', 'Carta Porte 3.0', 'NOM-068-SCT-2', 'NOM-087-SCT-2'],
      makesOffer: ['Flete completo nacional', 'Transporte dedicado', 'Transporte con temperatura controlada', 'Transporte de carga a granel', 'Logística a la medida'].map((name) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name, areaServed: { '@type': 'Country', name: 'México' } },
      })),
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#sitio`,
      url: SITE_URL,
      name: 'G3 Logistics',
      inLanguage: 'es-MX',
      publisher: { '@id': `${SITE_URL}/#negocio` },
    },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-MX">
      <head>
        <meta name="format-detection" content="telephone=no" />
        {/* Tipografía corporativa (Brand Kit v2): Poppins Regular, Medium y Bold */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&display=swap"
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      </head>
      <body>
        <a href="#contenido" className="skip-link">Saltar al contenido</a>
        <Header />
        <main id="contenido">{children}</main>
        <Footer />
        <WhatsAppWidget />
        <Enhance />
      </body>
    </html>
  );
}
