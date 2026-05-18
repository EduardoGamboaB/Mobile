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
    default: 'G3 Logistics — Operación inteligente para transporte de carga',
    template: '%s | G3 Logistics',
  },
  description:
    'Suite completa para autotransportistas y flotas en México: G3 Admin (panel web) y G3 Drive (app móvil). Bitácora, evidencias con OCR, mapa en vivo, asistente IA. Desde plan gratuito.',
  keywords: [
    'logística México',
    'transporte de carga',
    'gestión de flota',
    'autotransporte',
    'bitácora digital',
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
    title: 'G3 Logistics — Operación inteligente para transporte de carga',
    description:
      'G3 Admin + G3 Drive: panel web y app móvil para autotransportistas y flotas en México.',
    locale: 'es_MX',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'G3 Logistics',
    description:
      'Operación inteligente para transporte de carga: panel + app móvil. Desde plan gratuito.',
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
    'Plataforma de gestión y operación para transporte de carga en México.',
  address: { '@type': 'PostalAddress', addressCountry: 'MX' },
  contactPoint: [
    {
      '@type': 'ContactPoint',
      contactType: 'sales',
      email: 'ventas@g3logistics.mx',
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

const SOFTWARE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'G3 Logistics',
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_JSON_LD) }}
        />
      </head>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
