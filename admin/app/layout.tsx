import type { Metadata } from 'next';
import './globals.css';
import { Bootstrap } from './bootstrap';
import { buildCsp } from '../security-headers';

export const metadata: Metadata = {
  title: 'G3 Admin',
  description: 'Panel de operación logística — G3 Logistics',
  referrer: 'strict-origin-when-cross-origin',
};

// CSP también como <meta>: el export estático se sirve sin headers propios.
const CSP_META = buildCsp({ meta: true });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta httpEquiv="Content-Security-Policy" content={CSP_META} />
      </head>
      <body>
        <Bootstrap />
        {children}
      </body>
    </html>
  );
}
