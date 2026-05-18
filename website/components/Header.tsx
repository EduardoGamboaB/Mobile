import Link from 'next/link';
import { Brand } from './Brand';

export function Header() {
  return (
    <header className="site">
      <div className="container site__inner">
        <Brand />
        <nav>
          <Link href="/productos/admin/">G3 Admin</Link>
          <Link href="/productos/drive/">G3 Drive</Link>
          <Link href="/precios/">Precios</Link>
          <Link href="/contacto/">Contacto</Link>
          <Link href="/contacto/" className="btn btn--primary">
            Solicitar demo
          </Link>
        </nav>
      </div>
    </header>
  );
}
