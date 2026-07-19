import Link from 'next/link';
import { Icon } from '../components/Icon';

export default function HomePage() {
  return (
    <>
      {/* ----------------------------- Hero ----------------------------- */}
      <section className="hero">
        <div className="container hero__grid">
          <div>
            <span className="eyebrow">Transporte agroindustrial</span>
            <h1>
              Movemos granos, fertilizantes y carga agroindustrial en México.
            </h1>
            <p className="lead">
              Especialistas en <strong>jaula granelera</strong> y{' '}
              <strong>thermo</strong>. Flota propia de 12 unidades operando
              sobre corredores agrícolas del Bajío y el norte del país,
              con torre de control 24/7 y trazabilidad viaje por viaje.
            </p>
            <div className="hero__cta">
              <Link href="/contacto/" className="btn btn--primary">
                Cotizar un viaje <Icon name="arrow" />
              </Link>
              <Link href="/servicios/" className="btn btn--ghost">
                Ver servicios
              </Link>
            </div>

            <div className="hero__stats">
              <div>
                <div className="hero__stat-num">12</div>
                <div className="hero__stat-label">Unidades propias</div>
              </div>
              <div>
                <div className="hero__stat-num">100%</div>
                <div className="hero__stat-label">Sector agro</div>
              </div>
              <div>
                <div className="hero__stat-num">&lt; 4 hrs</div>
                <div className="hero__stat-label">Cotización formal</div>
              </div>
              <div>
                <div className="hero__stat-num">24/7</div>
                <div className="hero__stat-label">Torre de control</div>
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
                <span>G3-2026-00134 · Maíz · Los Mochis → Guadalajara</span>
                <span className="preview__pill preview__pill--ok">En tránsito</span>
              </div>
              <div className="preview__row">
                <span>G3-2026-00133 · Urea · Manzanillo → Bajío</span>
                <span className="preview__pill preview__pill--ok">Entregado</span>
              </div>
              <div className="preview__row">
                <span>G3-2026-00132 · Sorgo · Cd. Obregón → Cuautitlán</span>
                <span className="preview__pill preview__pill--ok">Recolectando</span>
              </div>
              <div className="preview__row">
                <span>G3-2026-00131 · Thermo +12°C · Semilla · Irapuato</span>
                <span className="preview__pill preview__pill--ok">Temperatura ok</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------- Modalidades ---------------------- */}
      <section className="section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span className="eyebrow">Modalidades</span>
            <h2>Equipo diseñado para carga agrícola.</h2>
            <p style={{ maxWidth: 620, margin: '0 auto' }}>
              Dos modalidades activas hoy y una tercera en incorporación,
              todas al servicio del sector agro y agroindustrial.
            </p>
          </div>

          <div className="grid grid--3">
            <div className="card">
              <div className="card__icon"><Icon name="truck" /></div>
              <h3>Jaula granelera</h3>
              <p>
                Para grano a granel: maíz, sorgo, trigo, soya, cebada,
                girasol y afines. Descarga por gravedad, compatibilidad
                con silos y patios de acopio.
              </p>
              <ul className="list-check" style={{ margin: 0 }}>
                <li>Capacidad hasta 30 toneladas por unidad</li>
                <li>Piso limpio · sin residuos entre viajes</li>
                <li>Compatibilidad con básculas de silo</li>
              </ul>
            </div>

            <div className="card">
              <div className="card__icon"><Icon name="shield" /></div>
              <h3>Thermo</h3>
              <p>
                Para carga agroindustrial sensible a temperatura:
                semillas, biológicos, fertilizantes que requieren rango
                controlado y perecederos agri.
              </p>
              <ul className="list-check" style={{ margin: 0 }}>
                <li>Registro de temperatura por viaje (auditable)</li>
                <li>Rango controlado según ficha técnica del producto</li>
                <li>Cadena de frío continua desde origen a destino</li>
              </ul>
            </div>

            <div className="card" style={{ position: 'relative' }}>
              <span className="badge" style={{ position: 'absolute', top: 18, right: 18 }}>
                Próximamente
              </span>
              <div className="card__icon"><Icon name="route" /></div>
              <h3>Plataforma</h3>
              <p>
                En incorporación para 2026: maquinaria agrícola,
                fertilizante ensacado en tarima, estructuras de silo y
                carga indivisible del sector.
              </p>
              <ul className="list-check" style={{ margin: 0 }}>
                <li>Maquinaria agrícola y de labranza</li>
                <li>Fertilizante y agroquímico ensacado</li>
                <li>Estructuras de silo, tolvas y equipo</li>
              </ul>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link href="/servicios/" className="btn btn--dark">
              Ver detalle de servicios <Icon name="arrow" />
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------- Diferenciadores G3 ------------------------ */}
      <section className="section section--dark">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span className="eyebrow">Por qué G3</span>
            <h2>Un transportista que entiende el ciclo agrícola.</h2>
            <p style={{ maxWidth: 640, margin: '0 auto' }}>
              El agro no perdona errores de tiempo — una tolva llena
              detiene una planta, una semilla mal transportada arruina
              una temporada. Operamos entendiendo eso.
            </p>
          </div>

          <div className="grid grid--3">
            {[
              { icon: 'map' as const,      t: 'Trazabilidad viaje por viaje', d: 'Cada unidad reporta posición y estatus. Compartimos el enlace del viaje contigo desde origen hasta descarga en silo o planta.' },
              { icon: 'shield' as const,   t: 'Cumplimiento NOM SICT',        d: 'Inspección pre-viaje NOM-068 y bitácora de horas NOM-087 en cada operación. Documentación completa por auditoría.' },
              { icon: 'sparkles' as const, t: 'Torre de control 24/7',        d: 'Dispatcher humano de guardia todo el día. En temporada alta, coordinamos ventanas de descarga con el silo o la planta.' },
              { icon: 'wallet' as const,   t: 'Cotización en 4 hrs',          d: 'Cotización formal con desglose por concepto, en menos de 4 horas hábiles — no importa si es cierre de temporada.' },
              { icon: 'cam' as const,      t: 'Evidencias digitales',         d: 'Carta porte sellada, boleta de báscula y foto de descarga en tu correo antes de bajar el candado.' },
              { icon: 'lock' as const,     t: 'Seguros y custodia',           d: 'Cobertura de responsabilidad civil y carga. Custodia armada disponible para corredores sensibles.' },
            ].map((f) => (
              <div key={f.t} className="card">
                <div className="card__icon"><Icon name={f.icon} /></div>
                <h3>{f.t}</h3>
                <p style={{ marginBottom: 0 }}>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------- Sectores atendidos ---------------------- */}
      <section className="section section--tint">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span className="eyebrow">Sectores que atendemos</span>
            <h2>Vivimos del ciclo agrícola mexicano.</h2>
          </div>

          <div className="grid grid--3">
            {[
              { name: 'Agricultura de granos',    desc: 'Maíz, sorgo, trigo, soya, cebada, cártamo y girasol.' },
              { name: 'Fertilizantes',            desc: 'Urea, DAP, MAP, sulfato y mezclas físicas a granel.' },
              { name: 'Semillas y agroinsumos',   desc: 'Semilla certificada, biológicos y agroquímico.' },
              { name: 'Acopio y silos',           desc: 'Bodegas de acopio, silos y centros de distribución agro.' },
              { name: 'Agroindustria',            desc: 'Molinos, cerveceras, engordas y plantas alimenticias.' },
              { name: 'Cooperativas',             desc: 'Cooperativas y uniones de productores rurales.' },
            ].map((s) => (
              <div key={s.name} className="card">
                <h3>{s.name}</h3>
                <p style={{ marginBottom: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------- CTA final ------------------------ */}
      <section className="section">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>Cotiza tu viaje en menos de 4 horas hábiles.</h2>
              <p>Cuéntanos origen, destino, producto y fecha objetivo — te respondemos por correo o WhatsApp.</p>
            </div>
            <Link href="/contacto/" className="btn btn--dark">
              Solicitar cotización <Icon name="arrow" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
