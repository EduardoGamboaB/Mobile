import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

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
    default: 'G3 Logistics — Transporte agroindustrial en México',
    template: '%s | G3 Logistics',
  },
  description:
    'Especialistas en transporte de granos, fertilizantes y carga agroindustrial. Flota propia de jaula granelera y thermo, con cumplimiento NOM SICT y trazabilidad viaje por viaje.',
  keywords: [
    'transporte agroindustrial México',
    'jaula granelera',
    'transporte de granos',
    'transporte de fertilizantes',
    'jaula thermo',
    'transporte agrícola',
    'flete de grano',
    'transporte de urea',
    'transporte de semilla certificada',
    'transportista agro México',
    'cotizar flete agro',
    'G3 Logistics',
    'NOM-068 SICT',
    'NOM-087 SICT',
    'Carta Porte 3.0',
    'trazabilidad de carga agro',
  ],
  authors: [{ name: 'G3 Logistics', url: SITE_URL }],
  creator: 'G3 Logistics',
  publisher: 'G3 Logistics',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'G3 Logistics',
    title: 'G3 Logistics — Transporte agroindustrial en México',
    description:
      'Especialistas en jaula granelera y thermo. Granos, fertilizantes y carga agroindustrial. Cotización en menos de 4 horas.',
    locale: 'es_MX',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'G3 Logistics — Transporte agroindustrial en México',
    description:
      'Jaula granelera + thermo. Especialistas del sector agro con torre de control 24/7.',
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
  logo: `${SITE_URL}/brand/g3-logistics-positivo.svg`,
  description:
    'Empresa mexicana especializada en transporte agroindustrial: jaula granelera y thermo para granos, fertilizantes y carga del sector agro.',
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
  serviceType: 'Transporte agroindustrial · granos y fertilizantes',
  provider: { '@id': `${SITE_URL}#organization` },
  areaServed: { '@type': 'Country', name: 'México' },
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Modalidades de transporte',
    itemListElement: [
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Jaula granelera · grano a granel' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Thermo · carga con temperatura controlada' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Plataforma · próximamente 2026' } },
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
      </body>
    </html>
  );
}
