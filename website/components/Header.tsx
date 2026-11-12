import Link from 'next/link';
import { Brand } from './Brand';

const LINKS: { href: string; label: string }[] = [
  { href: '/servicios/', label: 'Servicios' },
  { href: '/tecnologia/', label: 'Tecnología' },
  { href: '/nosotros/', label: 'Nosotros' },
  { href: '/contacto/', label: 'Contacto' },
];

export function Header() {
  return (
    <header className="site">
      <div className="container site__inner">
        <Brand />
        <nav aria-label="Navegación principal">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}>{l.label}</Link>
          ))}
          <Link href="/contacto/" className="btn btn--primary">
            Cotizar
          </Link>

          <details className="mobile-menu">
            <summary className="menu-toggle" aria-label="Abrir menú">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </summary>
            <div className="menu-panel">
              {LINKS.map((l) => (
                <Link key={l.href} href={l.href}>{l.label}</Link>
              ))}
              <Link href="/contacto/" className="btn btn--primary menu-panel__cta">
                Cotizar
              </Link>
            </div>
          </details>
        </nav>
      </div>
    </header>
  );
}
