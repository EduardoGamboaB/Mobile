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
              Empresa mexicana especialista en transporte agroindustrial.
              Jaula granelera y thermo para granos, fertilizantes y carga
              del sector agro.
            </p>
          </div>

          <div>
            <h4>Servicios</h4>
            <ul>
              <li><Link href="/servicios/">Jaula granelera</Link></li>
              <li><Link href="/servicios/">Thermo</Link></li>
              <li><Link href="/servicios/#cobertura">Cobertura agrícola</Link></li>
              <li><Link href="/contacto/">Cotizar viaje</Link></li>
            </ul>
          </div>

          <div>
            <h4>Empresa</h4>
            <ul>
              <li><Link href="/nosotros/">Nosotros</Link></li>
              <li><Link href="/contacto/">Contacto</Link></li>
            </ul>
          </div>

          <div>
            <h4>Contacto</h4>
            <ul>
              <li><a href="mailto:fletes@g3logistics.mx">fletes@g3logistics.mx</a></li>
              <li><a href="mailto:empresas@g3logistics.mx">empresas@g3logistics.mx</a></li>
              <li><a href="mailto:soporte@g3logistics.mx">soporte@g3logistics.mx</a></li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} G3 Logistics — Hecho en México</span>
          <span>Concesión SICT vigente · Datos en GCP us-central1</span>
        </div>
      </div>
    </footer>
  );
}
