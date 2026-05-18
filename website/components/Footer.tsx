import Link from 'next/link';
import { Brand } from './Brand';

export function Footer() {
  return (
    <footer className="site">
      <div className="container">
        <div className="footer__cols">
          <div>
            <Brand />
            <p style={{ marginTop: 14, fontSize: '0.92rem', color: 'rgba(255,255,255,0.65)' }}>
              Empresa mexicana de transporte de carga terrestre. Operamos flota
              propia y desarrollamos la tecnología que la hace eficiente —
              ahora disponible para otros transportistas.
            </p>
          </div>

          <div>
            <h4>Servicios</h4>
            <ul>
              <li><Link href="/servicios/">Transporte de carga</Link></li>
              <li><Link href="/servicios/#cobertura">Rutas y cobertura</Link></li>
              <li><Link href="/contacto/?intent=fletes">Cotizar viaje</Link></li>
            </ul>
          </div>

          <div>
            <h4>Productos</h4>
            <ul>
              <li><Link href="/productos/admin/">G3 Admin</Link></li>
              <li><Link href="/productos/drive/">G3 Drive</Link></li>
              <li><Link href="/precios/">Precios</Link></li>
            </ul>
          </div>

          <div>
            <h4>Empresa</h4>
            <ul>
              <li><Link href="/nosotros/">Nosotros</Link></li>
              <li><Link href="/contacto/">Contacto</Link></li>
              <li><a href="mailto:fletes@g3logistics.mx">fletes@g3logistics.mx</a></li>
              <li><a href="mailto:tecnologia@g3logistics.mx">tecnologia@g3logistics.mx</a></li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} G3 Logistics — Hecho en México</span>
          <span>Datos hospedados en GCP us-central1</span>
        </div>
      </div>
    </footer>
  );
}
