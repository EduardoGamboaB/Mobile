import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

const SITE_URL = 'https://www.g3logistics.mx';

export const viewport: Viewport = {
  themeColor: '#0a1633',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'G3 Logistics — Transporte de carga en México',
    template: '%s | G3 Logistics',
  },
  description:
    'Empresa mexicana de transporte terrestre de carga. Flota propia, cobertura en 32 estados, trazabilidad en vivo y cumplimiento NOM. Cotiza tu viaje en menos de 4 horas hábiles.',
  keywords: [
    'transporte de carga México',
    'transportistas México',
    'autotransporte',
    'logística México',
    'fletes terrestres',
    'flota propia',
    'carga refrigerada México',
    'carga seca México',
    'sobredimensionada México',
    'cotizar flete',
    'G3 Logistics',
    'trazabilidad de carga',
    'NOM-068 SICT',
    'NOM-087 SICT',
    'Carta Porte 3.0',
  ],
  authors: [{ name: 'G3 Logistics', url: SITE_URL }],
  creator: 'G3 Logistics',
  publisher: 'G3 Logistics',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'G3 Logistics',
    title: 'G3 Logistics — Transporte de carga en México',
    description:
      'Flota propia, 32 estados, torre de control 24/7 y trazabilidad en vivo. Cotiza tu viaje en menos de 4 horas.',
    locale: 'es_MX',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'G3 Logistics — Transporte de carga en México',
    description:
      'Empresa mexicana de transporte terrestre. Flota propia y trazabilidad en vivo.',
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
  '@type': 'MovingCompany',
  '@id': `${SITE_URL}#organization`,
  name: 'G3 Logistics',
  legalName: 'G3 Logistics',
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  description:
    'Empresa mexicana de transporte terrestre de carga con flota propia, cobertura nacional y torre de control 24/7.',
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
      contactType: 'sales',
      email: 'empresas@g3logistics.mx',
      areaServed: 'MX',
      availableLanguage: ['Spanish'],
    },
    {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'soporte@g3logistics.mx',
      areaServed: 'MX',
      availableLanguage: ['Spanish'],
    },
  ],
};

const SERVICE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Transporte terrestre de carga',
  provider: { '@id': `${SITE_URL}#organization` },
  areaServed: { '@type': 'Country', name: 'México' },
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Servicios de transporte',
    itemListElement: [
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Carga seca' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Carga refrigerada' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Carga sobredimensionada' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Servicio dedicado y spot' } },
    ],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-MX">
      <head>
        <meta name="format-detection" content="telephone=no" />
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
      </body>
    </html>
  );
}
