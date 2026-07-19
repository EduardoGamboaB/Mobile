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
    default: 'G3 Logistics — Transportistas en México con tecnología propia',
    template: '%s | G3 Logistics',
  },
  description:
    'Operamos transporte de carga en México y construimos la tecnología que lo hace posible. Mueve tu carga con nosotros o lleva G3 Admin y G3 Drive a tu propia flota.',
  keywords: [
    'transporte de carga México',
    'transportistas México',
    'autotransporte',
    'logística México',
    'fletes terrestres',
    'gestión de flota',
    'TMS México',
    'G3 Logistics',
    'app conductores',
    'mapa en vivo',
    'OCR carta porte',
  ],
  authors: [{ name: 'G3 Logistics', url: SITE_URL }],
  creator: 'G3 Logistics',
  publisher: 'G3 Logistics',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'G3 Logistics',
    title: 'G3 Logistics — Transportistas en México con tecnología propia',
    description:
      'Movemos tu carga y construimos los productos (G3 Admin + G3 Drive) que lo hacen posible.',
    locale: 'es_MX',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'G3 Logistics',
    description:
      'Transportistas en México que construyen su propia tecnología. Mueve tu carga o lleva nuestros productos a tu flota.',
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
  name: 'G3 Logistics',
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  description:
    'Empresa mexicana de transporte de carga terrestre que opera flota propia y desarrolla la tecnología (G3 Admin y G3 Drive) usada para gestionarla.',
  address: { '@type': 'PostalAddress', addressCountry: 'MX' },
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
      email: 'tecnologia@g3logistics.mx',
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
  serviceType: 'Transporte de carga terrestre',
  provider: { '@type': 'Organization', name: 'G3 Logistics' },
  areaServed: { '@type': 'Country', name: 'México' },
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Servicios de transporte',
    itemListElement: [
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Carga seca' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Carga refrigerada' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Carga sobredimensionada' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Dedicado / Spot' } },
    ],
  },
};

const SOFTWARE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'G3 Admin + G3 Drive',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, iOS, Android',
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'MXN',
    lowPrice: '0',
    highPrice: '2499',
    offerCount: '5',
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_JSON_LD) }}
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
