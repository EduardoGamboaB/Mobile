import Link from 'next/link';
import { Brand } from './Brand';
import { whatsappLink } from '../lib/site';

export function Footer() {
  return (
    <footer className="site">
      <div className="container">
        <div className="footer__cols">
          <div>
            <Brand />
            <p style={{ marginTop: 14, fontSize: '0.92rem', color: 'rgba(255,255,255,0.65)' }}>
              Autotransporte federal de carga. Resolvemos la logística de
              las empresas con flota propia, TMS propio y monitoreo
              satelital 24/7.
            </p>
          </div>

          <div>
            <h4>Servicios</h4>
            <ul>
              <li><Link href="/servicios/">Flete completo y dedicado</Link></li>
              <li><Link href="/servicios/">Temperatura controlada</Link></li>
              <li><Link href="/servicios/#cobertura">Flota y cobertura</Link></li>
              <li><Link href="/contacto/">Cotizar servicio</Link></li>
            </ul>
          </div>

          <div>
            <h4>Empresa</h4>
            <ul>
              <li><Link href="/nosotros/">Nosotros</Link></li>
              <li><Link href="/tecnologia/">Tecnología</Link></li>
              <li><Link href="/contacto/">Contacto</Link></li>
            </ul>
          </div>

          <div>
            <h4>Contacto</h4>
            <ul>
              <li><a href={whatsappLink()} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>
              <li><a href="mailto:fletes@g3logistics.mx">fletes@g3logistics.mx</a></li>
              <li><a href="mailto:empresas@g3logistics.mx">empresas@g3logistics.mx</a></li>
              <li><a href="mailto:soporte@g3logistics.mx">soporte@g3logistics.mx</a></li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} G3 Logistics — Hecho en México</span>
          <span>Permiso SICT vigente · Monitoreo satelital TotalProtect</span>
        </div>
      </div>
    </footer>
  );
}
