import Link from 'next/link';
import { Icon } from '../components/Icon';
import { ContactForm } from '../components/ContactForm';
import { whatsappLink } from '../lib/site';

const SOLUCIONES = [
  { icon: 'truck' as const,  t: 'Flete completo nacional',     d: 'Viajes punto a punto con unidad completa para tu carga, en rutas nacionales y con fecha comprometida.' },
  { icon: 'route' as const,  t: 'Transporte dedicado',         d: 'Unidades y operadores asignados a tu operación, con frecuencia fija y ventanas de entrega acordadas.' },
  { icon: 'bell' as const,   t: 'Temperatura controlada',      d: 'Unidades thermo con registro de temperatura por viaje para producto sensible y cadena de frío.' },
  { icon: 'chart' as const,  t: 'Carga a granel',              d: 'Movimiento de producto a granel con báscula de origen y destino documentada en cada viaje.' },
  { icon: 'sparkles' as const, t: 'Logística a la medida',     d: 'Analizamos tu volumen, rutas y temporadas, y diseñamos el esquema que baja tu costo por entrega.' },
  { icon: 'shield' as const, t: 'Cumplimiento y documentación', d: 'Carta Porte 3.0, NOM-068 y NOM-087 en cada viaje. Tú recibes evidencia; nosotros cuidamos el cumplimiento.' },
];

const SECTORES = [
  { name: 'Manufactura',               desc: 'Insumos a planta y producto terminado a centros de distribución.' },
  { name: 'Consumo y retail',          desc: 'Abasto a CEDIS y reposición con ventanas de entrega estrictas.' },
  { name: 'Agroindustria y alimentos', desc: 'Granos, insumos agrícolas y alimento con o sin temperatura controlada.' },
  { name: 'Construcción e industria',  desc: 'Materiales, equipo e insumos industriales para obra y planta.' },
  { name: 'Automotriz y autopartes',   desc: 'Refacciones y componentes con trazabilidad y fecha comprometida.' },
  { name: 'Química e insumos',         desc: 'Materias primas industriales con documentación y protocolos de manejo.' },
];

export default function HomePage() {
  return (
    <>
      {/* ----------------------------- Hero ----------------------------- */}
      <section className="hero">
        <div className="container hero__grid">
          <div>
            <span className="eyebrow">Autotransporte federal de carga</span>
            <h1>Resolvemos la logística de tu empresa con flota propia.</h1>
            <p className="lead">
              Diseñamos el servicio de transporte que tu operación necesita y
              lo ejecutamos con <strong>unidades propias</strong>, operadores
              capacitados y tecnología: nuestro <strong>TMS desarrollado in
              house</strong> y el monitoreo satelital 24/7 de{' '}
              <strong>TotalProtect</strong>.
            </p>
            <div className="hero__cta">
              <Link href="/contacto/" className="btn btn--primary">
                Cotizar un servicio <Icon name="arrow" />
              </Link>
              <a href={whatsappLink()} className="btn btn--ghost" target="_blank" rel="noopener noreferrer">
                Escríbenos por WhatsApp
              </a>
            </div>

            <div className="hero__stats">
              <div>
                <div className="hero__stat-num">100%</div>
                <div className="hero__stat-label">Unidades propias</div>
              </div>
              <div>
                <div className="hero__stat-num">24/7</div>
                <div className="hero__stat-label">Monitoreo satelital</div>
              </div>
              <div>
                <div className="hero__stat-num">&lt; 4 hrs</div>
                <div className="hero__stat-label">Cotización formal</div>
              </div>
              <div>
                <div className="hero__stat-num">CP 3.0</div>
                <div className="hero__stat-label">Carta Porte en cada viaje</div>
              </div>
            </div>
          </div>

          <div className="preview" aria-hidden>
            <div className="preview__chrome"><span /><span /><span /></div>
            <div className="preview__caption">TMS G3 · Viajes de hoy</div>
            <div className="preview__rows">
              <div className="preview__row">
                <span>G3-2026-00134 · Producto terminado · Querétaro → Monterrey</span>
                <span className="preview__pill preview__pill--ok">En tránsito</span>
              </div>
              <div className="preview__row">
                <span>G3-2026-00133 · Refacciones · Saltillo → Cd. Juárez</span>
                <span className="preview__pill preview__pill--ok">Entregado · POD</span>
              </div>
              <div className="preview__row">
                <span>G3-2026-00132 · Insumos · Manzanillo → Guadalajara</span>
                <span className="preview__pill preview__pill--wait">Cargando</span>
              </div>
              <div className="preview__row">
                <span>G3-2026-00131 · Thermo +4 °C · Culiacán → CDMX</span>
                <span className="preview__pill preview__pill--ok">Temperatura ok</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------- Soluciones -------------------------- */}
      <section className="section">
        <div className="container">
          <div className="section__head">
            <span className="eyebrow">Soluciones</span>
            <h2>Partimos de tu necesidad, no de un tipo de unidad.</h2>
            <p>
              Cada empresa mueve su carga distinto. Entendemos tu operación y
              asignamos la unidad, la ruta y el esquema de servicio que la
              resuelven.
            </p>
          </div>

          <div className="grid grid--3">
            {SOLUCIONES.map((s) => (
              <div key={s.t} className="card">
                <div className="card__icon"><Icon name={s.icon} /></div>
                <h3>{s.t}</h3>
                <p className="mb-0">{s.d}</p>
              </div>
            ))}
          </div>

          <div className="section__foot">
            <Link href="/servicios/" className="btn btn--dark">
              Ver servicios <Icon name="arrow" />
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------ Cómo trabajamos ------------------------ */}
      <section className="section section--tint">
        <div className="container">
          <div className="section__head">
            <span className="eyebrow">Cómo trabajamos</span>
            <h2>De tu requerimiento a la entrega, con un solo responsable.</h2>
          </div>
          <ol className="steps">
            <li className="card">
              <span className="steps__num">1</span>
              <h3>Entendemos tu operación</h3>
              <p className="mb-0">Volumen, rutas, frecuencias, ventanas de entrega y requisitos de tu carga.</p>
            </li>
            <li className="card">
              <span className="steps__num">2</span>
              <h3>Te proponemos el esquema</h3>
              <p className="mb-0">Cotización formal con desglose en menos de 4 horas hábiles: unidad, ruta y nivel de servicio.</p>
            </li>
            <li className="card">
              <span className="steps__num">3</span>
              <h3>Operamos con flota propia</h3>
              <p className="mb-0">Unidades y operadores de G3, monitoreo 24/7 y evidencias digitales de cada entrega.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* --------------------------- Tecnología -------------------------- */}
      <section className="section section--dark">
        <div className="container">
          <div className="section__head">
            <span className="eyebrow">Tecnología</span>
            <h2>Visibilidad total de tu carga, de la recolección a la entrega.</h2>
            <p>
              Operamos con dos capas de tecnología: un TMS propio que
              controla cada viaje y la plataforma de monitoreo satelital de
              TotalProtect que vigila cada unidad.
            </p>
          </div>

          <div className="grid grid--2">
            <div className="card">
              <div className="card__icon"><Icon name="phone" /></div>
              <h3>TMS G3 · desarrollado in house</h3>
              <p>Nuestro sistema de gestión de transporte, hecho por nuestro equipo para nuestra operación.</p>
              <ul className="list-check mb-0">
                <li>Viajes con folio y estatus de la recolección a la entrega</li>
                <li>Evidencias digitales: carga, báscula, descarga y POD</li>
                <li>Carta Porte 3.0 (CFDI 4.0) generada desde el viaje</li>
                <li>App del operador con bitácora NOM-087 e inspección NOM-068</li>
              </ul>
            </div>
            <div className="card">
              <div className="card__icon"><Icon name="map" /></div>
              <h3>Monitoreo satelital TotalProtect</h3>
              <p>Rastreo GPS y centro de monitoreo 24/7 con protocolos de reacción ante cualquier incidente.</p>
              <ul className="list-check mb-0">
                <li>Ubicación de la unidad en tiempo real</li>
                <li>Geocercas y rutas autorizadas con alertas</li>
                <li>Paro de motor remoto ante robo o desvío</li>
                <li>Liga de seguimiento para que veas tu carga en vivo</li>
              </ul>
            </div>
          </div>

          <div className="section__foot">
            <Link href="/tecnologia/" className="btn btn--primary">
              Conocer la tecnología <Icon name="arrow" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------- Sectores --------------------------- */}
      <section className="section">
        <div className="container">
          <div className="section__head">
            <span className="eyebrow">Sectores</span>
            <h2>Movemos la carga de empresas de todos los giros.</h2>
          </div>

          <div className="grid grid--3">
            {SECTORES.map((s) => (
              <div key={s.name} className="card">
                <h3>{s.name}</h3>
                <p className="mb-0">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------- Contacto --------------------------- */}
      <section className="section section--tint" id="cotizar">
        <div className="container split split--top">
          <div>
            <span className="eyebrow">Cotiza tu servicio</span>
            <h2>Cuéntanos qué necesitas mover.</h2>
            <p>
              Llena el formulario y te enviamos una propuesta formal en menos
              de 4 horas hábiles. Si lo prefieres, escríbenos directo por
              WhatsApp.
            </p>
            <ul className="list-check">
              <li>Propuesta con desglose por concepto</li>
              <li>Un ejecutivo asignado a tu cuenta</li>
              <li>Seguimiento de cada viaje en tiempo real</li>
            </ul>
            <a href={whatsappLink()} className="btn btn--ghost-dark" target="_blank" rel="noopener noreferrer">
              Escríbenos por WhatsApp <Icon name="arrow" />
            </a>
          </div>
          <ContactForm id="cotizar-form" />
        </div>
      </section>
    </>
  );
}
