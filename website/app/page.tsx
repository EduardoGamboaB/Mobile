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
            <span className="eyebrow">Suite G3 Logistics</span>
            <h1>
              Operación inteligente para el transporte de carga en México.
            </h1>
            <p className="lead">
              Una plataforma con dos productos integrados: <strong>G3 Admin</strong> para
              tu oficina y <strong>G3 Drive</strong> para tus conductores. Desde
              autotransportistas individuales hasta flotas empresariales.
            </p>
            <div className="hero__cta">
              <Link href="/contacto/" className="btn btn--primary">
                Solicitar demo <Icon name="arrow" />
              </Link>
              <Link href="/precios/" className="btn btn--ghost">
                Ver precios
              </Link>
            </div>

            <div className="hero__stats">
              <div>
                <div className="hero__stat-num">$0</div>
                <div className="hero__stat-label">Plan inicial</div>
              </div>
              <div>
                <div className="hero__stat-num">5</div>
                <div className="hero__stat-label">Planes escalables</div>
              </div>
              <div>
                <div className="hero__stat-num">6</div>
                <div className="hero__stat-label">Agentes de IA</div>
              </div>
              <div>
                <div className="hero__stat-num">24/7</div>
                <div className="hero__stat-label">Mapa en vivo</div>
              </div>
            </div>
          </div>

          <div className="preview" aria-hidden>
            <div className="preview__chrome"><span /><span /><span /></div>
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

      {/* --------------------- Value props (3 columnas) ----------------- */}
      <section className="section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span className="eyebrow">Por qué G3</span>
            <h2>Lo construimos para quien mueve la carga, no para reportes.</h2>
            <p style={{ maxWidth: 640, margin: '0 auto' }}>
              Cada función fue probada con autotransportistas reales antes de
              llegar a producción. Sin abstracciones inútiles, sin features
              fantasma — solo lo que mueve el negocio.
            </p>
          </div>

          <div className="grid grid--3">
            <div className="card">
              <div className="card__icon"><Icon name="route" /></div>
              <h3>De un tracto a una flota completa</h3>
              <p>
                Empieza gratis con tu primer tracto y crece sin migrar. Los
                mismos datos, el mismo flujo, el plan que se ajusta cada mes.
              </p>
            </div>
            <div className="card">
              <div className="card__icon"><Icon name="sparkles" /></div>
              <h3>IA donde sí mueve la aguja</h3>
              <p>
                OCR de evidencias, clasificación de bitácora, ruteo de
                incidentes y chat con dispatcher. Seis agentes que ahorran
                horas, no marketing.
              </p>
            </div>
            <div className="card">
              <div className="card__icon"><Icon name="wallet" /></div>
              <h3>Tu cobro, no del cliente</h3>
              <p>
                Cuando el conductor entrega, tú decides cuándo se libera el
                pago. Sin esperas de 45 días ni reclamos perdidos en correos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------ Producto: G3 Admin -------------------- */}
      <section className="section section--tint">
        <div className="container split">
          <div>
            <span className="eyebrow">Producto · Web</span>
            <h2>G3 Admin</h2>
            <p>
              El centro de mando para dueños y dispatchers. Captura viajes,
              autoriza pagos, monitorea el mapa en vivo y revisa el scoring de
              tus conductores y unidades — todo desde el navegador.
            </p>
            <ul className="list-check">
              <li>Captura de viajes con folio automático G3-AAAA-NNNNN</li>
              <li>Mapa en vivo con posición y velocidad de cada tracto</li>
              <li>Autorización manual de pagos al conductor (a partir de Starter)</li>
              <li>Scoring de conductores y unidades en tiempo real</li>
              <li>Alertas accionables (licencias, mantenimiento, SOS)</li>
              <li>Integración con tu ERP y exportación de reportes</li>
            </ul>
            <Link href="/productos/admin/" className="btn btn--dark">
              Conocer G3 Admin <Icon name="arrow" />
            </Link>
          </div>

          <div className="preview" style={{ background: 'var(--white)', border: '1px solid var(--ink-100)' }}>
            <div className="preview__chrome">
              <span style={{ background: '#e5e7eb' }} />
              <span style={{ background: '#e5e7eb' }} />
              <span style={{ background: '#e5e7eb' }} />
            </div>
            <div style={{ padding: '4px 4px 0', color: 'var(--ink-700)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--ink-500)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                Mapa en vivo · 4 unidades activas
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['T-101', 'CDMX → Mty', '88 km/h'],
                  ['T-203', 'GDL → Tampico', '76 km/h'],
                  ['T-117', 'QRO → Puebla', '64 km/h'],
                  ['T-088', 'Mty → Saltillo', '92 km/h'],
                ].map(([u, route, sp]) => (
                  <div key={u} style={{
                    background: 'var(--navy-50)', padding: '12px',
                    borderRadius: 10, fontSize: '0.85rem',
                  }}>
                    <strong style={{ color: 'var(--navy-900)' }}>{u}</strong>
                    <div style={{ color: 'var(--ink-500)' }}>{route}</div>
                    <div style={{ color: 'var(--road-500)', fontWeight: 700, marginTop: 2 }}>{sp}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------ Producto: G3 Drive -------------------- */}
      <section className="section">
        <div className="container split split--reverse">
          <div>
            <span className="eyebrow">Producto · Móvil</span>
            <h2>G3 Drive</h2>
            <p>
              La app para el conductor. Pensada para usarse en carretera, con
              guantes y poca señal. Bitácora en un toque, evidencias con
              cámara, chat con dispatcher y botón SOS siempre visible.
            </p>
            <ul className="list-check">
              <li>Bitácora con clasificación automática del gasto (combustible, casetas, etc.)</li>
              <li>Cámara con OCR para cartas porte, facturas y comprobantes</li>
              <li>Chat con dispatcher y compartir ubicación en vivo</li>
              <li>Botón SOS visible siempre, escala a admin y a seguridad</li>
              <li>Funciona offline — sincroniza cuando recupera señal</li>
              <li>Indicador de ingresos del viaje y del mes</li>
            </ul>
            <Link href="/productos/drive/" className="btn btn--dark">
              Conocer G3 Drive <Icon name="arrow" />
            </Link>
          </div>

          <div style={{ display: 'grid', placeItems: 'center' }}>
            <div className="phone" aria-hidden>
              <div className="phone__notch" />
              <div className="phone__screen">
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  Viaje activo
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--white)' }}>
                  G3-2026-00134
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                  CDMX → Monterrey · 720 km
                </div>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />

                <div style={{ background: 'rgba(255,122,69,0.18)', borderRadius: 10, padding: '12px 14px', color: '#ffd5c2' }}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8 }}>Ingreso del viaje</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginTop: 2 }}>$18,500</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  {[
                    ['Caseta 95', '$340'],
                    ['Diesel 180L', '$4,860'],
                    ['Comida operativa', '$220'],
                  ].map(([k, v]) => (
                    <div key={k} style={{
                      display: 'flex', justifyContent: 'space-between',
                      background: 'rgba(255,255,255,0.05)',
                      padding: '10px 12px', borderRadius: 8,
                      fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)',
                    }}>
                      <span>{k}</span>
                      <strong>{v}</strong>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
                  <button style={{ flex: 1, padding: '12px', border: 'none', borderRadius: 999, background: 'var(--road-500)', color: 'white', fontWeight: 700 }}>
                    Llegué
                  </button>
                  <button style={{ width: 48, padding: '12px', border: 'none', borderRadius: 999, background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 700 }} aria-label="SOS">
                    SOS
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------- Pricing --------------------------- */}
      <section className="section section--tint" id="precios">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <span className="eyebrow">Precios</span>
            <h2>Empieza gratis. Sube de plan solo cuando crezcas.</h2>
            <p style={{ maxWidth: 640, margin: '0 auto' }}>
              Cinco planes en MXN sin sorpresas. Si necesitas un plan más allá
              de Business, hablemos.
            </p>
          </div>
          <PricingTable />
        </div>
      </section>

      {/* ---------------------------- CTA ------------------------------ */}
      <section className="section section--dark">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>Habla con nosotros 30 minutos.</h2>
              <p>Te mostramos cómo G3 se conecta con tu operación actual.</p>
            </div>
            <Link href="/contacto/" className="btn btn--dark">
              Agendar demo <Icon name="arrow" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
