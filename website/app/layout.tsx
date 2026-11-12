import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { WhatsAppWidget } from '../components/WhatsAppWidget';
import { Enhance } from '../components/Enhance';

const SITE_URL = 'https://www.g3logistics.mx';

export const viewport: Viewport = {
  themeColor: '#101A30',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'G3 Logistics — Soluciones de transporte de carga para empresas',
    template: '%s | G3 Logistics',
  },
  description:
    'Resolvemos la logística de tu empresa con flota propia: flete completo, transporte dedicado, temperatura controlada y granel. Seguimiento en tiempo real, monitoreo satelital 24/7 y Carta Porte 3.0.',
  keywords: [
    'transporte de carga México',
    'autotransporte federal de carga',
    'flete completo nacional',
    'transporte dedicado',
    'transporte con temperatura controlada',
    'transporte de granel',
    'empresa transportista flota propia',
    'rastreo GPS de carga',
    'monitoreo satelital 24/7',
    'Carta Porte 3.0',
    'NOM-068 SICT',
    'NOM-087 SICT',
    'cotizar flete',
    'G3 Logistics',
  ],
  authors: [{ name: 'G3 Logistics', url: SITE_URL }],
  creator: 'G3 Logistics',
  publisher: 'G3 Logistics',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'G3 Logistics',
    title: 'G3 Logistics — Soluciones de transporte de carga para empresas',
    description:
      'Flota propia, seguimiento en tiempo real y monitoreo satelital 24/7. Cotización en menos de 4 horas hábiles.',
    locale: 'es_MX',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'G3 Logistics — Soluciones de transporte de carga para empresas',
    description:
      'Resolvemos la logística de tu empresa con flota propia.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  category: 'business',
};

const ORG_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}#organization`,
  name: 'G3 Logistics',
  legalName: 'G3 Logistics',
  url: SITE_URL,
  logo: `${SITE_URL}/brand/g3-logistics-positivo.svg`,
  description:
    'Empresa mexicana de autotransporte federal de carga que resuelve la logística de las empresas con flota propia, seguimiento en tiempo real y monitoreo satelital 24/7.',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'MX',
    addressRegion: 'CDMX',
    addressLocality: 'Miguel Hidalgo',
  },
  areaServed: { '@type': 'Country', name: 'México' },
  foundingDate: '2018',
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'sales',
      email: 'fletes@g3logistics.mx',
      areaServed: 'MX',
      availableLanguage: ['Spanish'],
    },
    {
      '@type': 'ContactPoint',
      contactType: 'billing',
      email: 'facturacion@g3logistics.mx',
      areaServed: 'MX',
      availableLanguage: ['Spanish'],
    },
  ],
};

const SERVICE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Autotransporte federal de carga',
  provider: { '@id': `${SITE_URL}#organization` },
  areaServed: { '@type': 'Country', name: 'México' },
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Modalidades de transporte',
    itemListElement: [
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Flete completo nacional' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Transporte dedicado' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Transporte con temperatura controlada' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Transporte de carga a granel' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Logística a la medida' } },
    ],
  },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSON_LD) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SERVICE_JSON_LD) }}
        />
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
