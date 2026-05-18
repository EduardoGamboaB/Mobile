import type { Metadata } from 'next';
import './globals.css';
import { Bootstrap } from './bootstrap';

export const metadata: Metadata = {
  title: 'G3 Admin',
  description: 'Panel de operación logística — G3 Logistics',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Bootstrap />
        {children}
      </body>
    </html>
  );
}
