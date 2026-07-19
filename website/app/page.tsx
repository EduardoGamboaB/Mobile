import Link from 'next/link';
import { Icon } from '../components/Icon';

export default function HomePage() {
  return (
    <>
      {/* ----------------------------- Hero ----------------------------- */}
      <section className="hero">
        <div className="container hero__grid">
          <div>
            <span className="eyebrow">Transportista mexicano</span>
            <h1>
              Movemos tu carga por todo México con trazabilidad en vivo.
            </h1>
            <p className="lead">
              Flota propia de tractocamiones. Operadores capacitados.
              Cobertura en 32 estados. Y una torre de control que te dice
              dónde está tu carga en tiempo real — sin llamadas, sin correos
              de seguimiento.
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
                <span className="preview__pill preview__pill--ok">Recolectando</span>
              </div>
              <div className="preview__row">
                <span>G3-2026-00131 · Reefer +4°C</span>
                <span className="preview__pill preview__pill--ok">Temperatura ok</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------- Servicios de carga ---------------------- */}
      <section className="section">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span className="eyebrow">Servicios de transporte</span>
            <h2>Cuatro tipos de carga, cobertura nacional.</h2>
          </div>

          <div className="grid grid--4">
            {[
              { icon: 'truck' as const,   name: 'Carga seca',        desc: 'Caja 53\' y 48\' para mercancía general, producto terminado y materias primas.' },
              { icon: 'shield' as const,  name: 'Refrigerada',       desc: 'Cadena de frío entre -20°C y +20°C para alimentos, perecederos y farma.' },
              { icon: 'route' as const,   name: 'Sobredimensionada', desc: 'Plataforma y lowboy para maquinaria, estructuras y carga indivisible.' },
              { icon: 'wallet' as const,  name: 'Dedicado / Spot',   desc: 'Unidad asignada a tu operación, o flete puntual con cotización en horas.' },
            ].map((s) => (
              <div key={s.name} className="card">
                <div className="card__icon"><Icon name={s.icon} /></div>
                <h3>{s.name}</h3>
                <p style={{ marginBottom: 0 }}>{s.desc}</p>
              </div>
            ))}
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
            <h2>Transporte con la operación conectada.</h2>
            <p style={{ maxWidth: 640, margin: '0 auto' }}>
              No somos una intermediaria de fletes. Somos una empresa mexicana
              de transporte con flota propia, torre de control 24/7 y una
              plataforma tecnológica desarrollada in-house que nos permite darte
              visibilidad real en cada viaje.
            </p>
          </div>

          <div className="grid grid--3">
            {[
              { icon: 'map' as const,       t: 'Trazabilidad en vivo',   d: 'Cada tracto reporta posición, velocidad y estatus cada 30 segundos. Te compartimos el enlace de tu viaje.' },
              { icon: 'shield' as const,    t: 'Cumplimiento NOM',       d: 'Inspección pre-viaje NOM-068 y bitácora de horas de servicio NOM-087 registradas por cada operador.' },
              { icon: 'sparkles' as const,  t: 'Torre de control 24/7',  d: 'Dispatcher humano de guardia en todo momento. En incidencias te llamamos antes que preguntes.' },
              { icon: 'wallet' as const,    t: 'Cotización en 4 hrs',    d: 'Cotización formal, con desglose y sin sorpresas, en menos de 4 horas hábiles.' },
              { icon: 'cam' as const,       t: 'Evidencias digitales',   d: 'Carta porte sellada, foto de descarga y remisiones en tu correo antes de bajar el candado.' },
              { icon: 'lock' as const,      t: 'Seguros y custodia',     d: 'Cobertura de responsabilidad civil y carga. Servicios de custodia armada para carga sensible.' },
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
            <h2>Operamos donde la operación no perdona errores.</h2>
          </div>

          <div className="grid grid--3">
            {[
              { name: 'Automotriz',            desc: 'JIT a planta y centros de distribución.' },
              { name: 'Manufactura',           desc: 'Materias primas y producto terminado.' },
              { name: 'Alimentos y bebidas',   desc: 'Frío continuo y temperatura ambiente.' },
              { name: 'Farmacéutica',          desc: 'Cadena de frío con registro auditable.' },
              { name: 'Comercio y retail',     desc: 'Cross-dock y reposición a tienda.' },
              { name: 'Construcción',          desc: 'Plataforma para estructuras y maquinaria.' },
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
              <p>Cuéntanos origen, destino, tipo de carga y fecha — te respondemos por correo o WhatsApp.</p>
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
