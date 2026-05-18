import Link from 'next/link';
import { Icon } from '../components/Icon';
import { PricingTable } from '../components/PricingTable';

export default function HomePage() {
  return (
    <>
      {/* ----------------------------- Hero ----------------------------- */}
      <section className="hero">
        <div className="container hero__grid">
          <div>
            <span className="eyebrow">G3 Logistics</span>
            <h1>
              Transportistas en México. Construimos la tecnología que usamos.
            </h1>
            <p className="lead">
              Operamos una flota de carga terrestre y desarrollamos los
              productos que la hacen eficiente:&nbsp;
              <strong>G3 Admin</strong> para la oficina y&nbsp;
              <strong>G3 Drive</strong> para el conductor. Ahora también para
              tu flota.
            </p>
            <div className="hero__cta">
              <Link href="/contacto/?intent=fletes" className="btn btn--primary">
                Cotizar un viaje <Icon name="arrow" />
              </Link>
              <Link href="/productos/admin/" className="btn btn--ghost">
                Ver nuestros productos
              </Link>
            </div>

            <div className="hero__stats">
              <div>
                <div className="hero__stat-num">+1,200</div>
                <div className="hero__stat-label">Viajes / mes</div>
              </div>
              <div>
                <div className="hero__stat-num">32</div>
                <div className="hero__stat-label">Estados con cobertura</div>
              </div>
              <div>
                <div className="hero__stat-num">99.4%</div>
                <div className="hero__stat-label">Entregas a tiempo</div>
              </div>
              <div>
                <div className="hero__stat-num">24/7</div>
                <div className="hero__stat-label">Mapa en vivo</div>
              </div>
            </div>
          </div>

          <div className="preview" aria-hidden>
            <div className="preview__chrome"><span /><span /><span /></div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Operación G3 · Hoy
            </div>
            <div className="preview__rows">
              <div className="preview__row">
                <span>G3-2026-00134 · CDMX → Mty</span>
                <span className="preview__pill preview__pill--ok">En tránsito</span>
              </div>
              <div className="preview__row">
                <span>G3-2026-00133 · GDL → Tampico</span>
                <span className="preview__pill preview__pill--ok">Entregado</span>
              </div>
              <div className="preview__row">
                <span>G3-2026-00132 · QRO → Puebla</span>
                <span className="preview__pill preview__pill--wait">Esperando pago</span>
              </div>
              <div className="preview__row">
                <span>Alerta: Licencia próx. a vencer · Pedro P.</span>
                <span className="preview__pill preview__pill--wait">Acción</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------- Dos caminos: cliente o flota ----------------- */}
      <section className="section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span className="eyebrow">Dos formas de trabajar con G3</span>
            <h2>Mueve tu carga con nosotros, o lleva nuestra tecnología a tu flota.</h2>
          </div>

          <div className="grid grid--2">
            <div className="card" style={{ borderTop: '4px solid var(--road-500)' }}>
              <div className="card__icon"><Icon name="truck" /></div>
              <h3>¿Necesitas mover carga?</h3>
              <p>
                Cotiza un viaje con nuestra flota. Seca, refrigerada,
                sobredimensionada o dedicada. Operamos en 32 estados con
                trazabilidad completa desde nuestra propia tecnología.
              </p>
              <ul className="list-check" style={{ marginTop: 8 }}>
                <li>Cotización en menos de 4 horas hábiles</li>
                <li>Posición del tracto en vivo durante todo el viaje</li>
                <li>Evidencias de entrega digitales con OCR</li>
                <li>Atención en español por humanos, no chatbots</li>
              </ul>
              <Link href="/servicios/" className="btn btn--dark" style={{ marginTop: 'auto' }}>
                Ver servicios de carga <Icon name="arrow" />
              </Link>
            </div>

            <div className="card" style={{ borderTop: '4px solid var(--navy-700)' }}>
              <div className="card__icon"><Icon name="sparkles" /></div>
              <h3>¿Tienes flota propia?</h3>
              <p>
                Los mismos productos que usamos para operar (G3 Admin y G3
                Drive) están disponibles para otros transportistas. Probados
                en kilómetros reales, no en demo controlada.
              </p>
              <ul className="list-check" style={{ marginTop: 8 }}>
                <li>Plan gratuito con 1 unidad — sin tarjeta</li>
                <li>Escala a flotas empresariales (30+ unidades)</li>
                <li>API + integración ERP en planes Business+</li>
                <li>Soporte directo del equipo que construye los productos</li>
              </ul>
              <Link href="/productos/admin/" className="btn btn--dark" style={{ marginTop: 'auto' }}>
                Ver G3 Admin <Icon name="arrow" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------- Servicios de carga ---------------------- */}
      <section className="section section--tint">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span className="eyebrow">Servicios de transporte</span>
            <h2>Cuatro tipos de carga, cobertura nacional.</h2>
          </div>

          <div className="grid grid--4">
            {[
              { icon: 'truck' as const, name: 'Carga seca', desc: 'Caja 53\' y 48\' para mercancía general, producto terminado y materias primas.' },
              { icon: 'shield' as const, name: 'Refrigerada', desc: 'Cadena de frío entre -20°C y +20°C para alimentos, perecederos y farma.' },
              { icon: 'route' as const, name: 'Sobredimensionada', desc: 'Plataforma y lowboy para maquinaria, estructuras y carga indivisible.' },
              { icon: 'wallet' as const, name: 'Dedicado / Spot', desc: 'Unidad asignada a tu operación, o flete puntual con cotización en horas.' },
            ].map((s) => (
              <div key={s.name} className="card">
                <div className="card__icon"><Icon name={s.icon} /></div>
                <h3>{s.name}</h3>
                <p style={{ marginBottom: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <Link href="/servicios/" className="btn btn--dark">
              Ver detalle de servicios <Icon name="arrow" />
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------- Productos: G3 Admin + Drive --------------- */}
      <section className="section section--dark">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span className="eyebrow">Productos tech</span>
            <h2>La suite que opera nuestra flota.</h2>
            <p style={{ maxWidth: 620, margin: '0 auto' }}>
              No los compramos. Los construimos porque ninguna herramienta del
              mercado servía para cómo operamos. Hoy son productos
              independientes que puedes contratar para tu flota.
            </p>
          </div>

          <div className="grid grid--2">
            <div className="card">
              <div className="card__icon"><Icon name="chart" /></div>
              <h3>G3 Admin</h3>
              <p>
                Panel web para owners y dispatchers: viajes con folio
                automático, mapa en vivo, autorización de pagos, scoring de
                conductores y unidades, alertas inteligentes.
              </p>
              <Link href="/productos/admin/" className="btn btn--ghost" style={{ marginTop: 16 }}>
                Conocer G3 Admin <Icon name="arrow" />
              </Link>
            </div>

            <div className="card">
              <div className="card__icon"><Icon name="phone" /></div>
              <h3>G3 Drive</h3>
              <p>
                App móvil para el conductor: bitácora en un toque, evidencias
                con cámara y OCR, chat con dispatcher, botón SOS y modo
                offline para zonas sin señal.
              </p>
              <Link href="/productos/drive/" className="btn btn--ghost" style={{ marginTop: 16 }}>
                Conocer G3 Drive <Icon name="arrow" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------- Pricing --------------------------- */}
      <section className="section section--tint">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <span className="eyebrow">Precios de productos tech</span>
            <h2>Planes para llevar la suite a tu flota.</h2>
            <p style={{ maxWidth: 620, margin: '0 auto' }}>
              Si necesitas mover carga, ve a&nbsp;
              <Link href="/servicios/" style={{ color: 'var(--road-500)', textDecoration: 'underline' }}>servicios</Link>
              &nbsp;para cotizar. Esta tabla es para contratar el software.
            </p>
          </div>
          <div style={{ marginTop: 48 }}>
            <PricingTable />
          </div>
        </div>
      </section>

      {/* ---------------------------- CTA dual -------------------------- */}
      <section className="section section--dark">
        <div className="container">
          <div className="grid grid--2">
            <div className="cta-band" style={{ background: 'linear-gradient(135deg, var(--road-500), #ff5e1a)' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem' }}>Cotiza tu viaje</h2>
                <p>Operamos tu carga con nuestra flota.</p>
              </div>
              <Link href="/contacto/?intent=fletes" className="btn btn--dark">
                Solicitar
              </Link>
            </div>
            <div className="cta-band" style={{ background: 'linear-gradient(135deg, var(--navy-700), var(--navy-900))' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem' }}>Prueba la tech</h2>
                <p>Plan Free con 1 unidad, sin tarjeta.</p>
              </div>
              <Link href="/contacto/?intent=tech" className="btn btn--primary">
                Empezar
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
