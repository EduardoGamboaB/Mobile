import Link from 'next/link';
import { Brand } from './Brand';
import { BUSINESS, LOCATION_LABEL, MAPS_URL, whatsappLink } from '../lib/site';

export function Footer() {
  return (
    <footer className="site">
      <div className="container">
        <div className="footer__cols">
          <div>
            <Brand />
            <p style={{ marginTop: 14, fontSize: '0.92rem', color: 'rgba(255,255,255,0.65)' }}>
              Autotransporte federal de carga desde {LOCATION_LABEL}. Resolvemos
              la logística de las empresas con flota propia, seguimiento en
              tiempo real y monitoreo satelital 24/7.
            </p>
          </div>

          <div>
            <h2 className="footer__title">Servicios</h2>
            <ul>
              <li><Link href="/servicios/">Flete completo y dedicado</Link></li>
              <li><Link href="/servicios/">Temperatura controlada</Link></li>
              <li><Link href="/servicios/#cobertura">Flota y cobertura</Link></li>
              <li><Link href="/contacto/">Cotizar servicio</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="footer__title">Empresa</h2>
            <ul>
              <li><Link href="/nosotros/">Nosotros</Link></li>
              <li><Link href="/seguimiento/">Seguimiento</Link></li>
              <li><Link href="/contacto/">Contacto</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="footer__title">Contacto</h2>
            <ul>
              <li><a href={whatsappLink()} target="_blank" rel="noopener noreferrer">WhatsApp {BUSINESS.phoneDisplay}</a></li>
              <li><a href={`tel:${BUSINESS.phoneE164}`}>Llamar: {BUSINESS.phoneDisplay}</a></li>
              <li><a href={`mailto:${BUSINESS.emailFletes}`}>{BUSINESS.emailFletes}</a></li>
              <li><a href={`mailto:${BUSINESS.emailFacturacion}`}>{BUSINESS.emailFacturacion}</a></li>
              <li><a href={MAPS_URL} target="_blank" rel="noopener noreferrer">{LOCATION_LABEL}, {BUSINESS.countryName}</a></li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} G3 Logistics · {LOCATION_LABEL}, {BUSINESS.countryName}</span>
          <span>Permiso SICT vigente · Monitoreo satelital 24/7</span>
        </div>
      </div>
    </footer>
  );
}
