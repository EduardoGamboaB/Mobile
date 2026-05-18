import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

export const metadata: Metadata = {
  title: 'G3 Logistics — Operación inteligente para transporte de carga',
  description:
    'Suite completa para autotransportistas y flotas: bitácora, evidencias con OCR, control de viajes, mapa en vivo y asistente IA. Desde plan gratuito.',
  metadataBase: new URL('https://www.g3logistics.mx'),
  openGraph: {
    title: 'G3 Logistics',
    description:
      'Operación inteligente para transporte de carga en México. G3 Admin + G3 Drive.',
    locale: 'es_MX',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-MX">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
