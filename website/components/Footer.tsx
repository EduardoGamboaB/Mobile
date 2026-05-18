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
              Plataforma de gestión y operación para transporte de carga en México.
              Diseñada para autotransportistas independientes hasta flotas
              empresariales.
            </p>
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
              <li><Link href="/contacto/">Contacto</Link></li>
              <li><a href="mailto:ventas@g3logistics.mx">ventas@g3logistics.mx</a></li>
              <li><a href="mailto:soporte@g3logistics.mx">Soporte</a></li>
            </ul>
          </div>

          <div>
            <h4>Legal</h4>
            <ul>
              <li><a href="/legal/terminos/">Términos</a></li>
              <li><a href="/legal/privacidad/">Aviso de privacidad</a></li>
              <li><a href="/legal/sla/">SLA Enterprise</a></li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} G3 Logistics — Hecho en México</span>
          <span>RFC en proceso · Datos hospedados en GCP us-central1</span>
        </div>
      </div>
    </footer>
  );
}
