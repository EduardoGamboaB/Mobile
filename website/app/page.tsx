import Link from 'next/link';
import { Icon } from '../components/Icon';
import { ContactForm } from '../components/ContactForm';
import { whatsappLink } from '../lib/site';
import { Carousel } from '../components/Carousel';
import { Faq } from '../components/Faq';
import { SLIDES } from '../lib/slides';

const SOLUCIONES = [
  { icon: 'truck' as const,  t: 'Flete completo nacional',     d: 'Viajes punto a punto con unidad completa para tu carga, en rutas nacionales y con fecha comprometida.' },
  { icon: 'route' as const,  t: 'Transporte dedicado',         d: 'Unidades y operadores asignados a tu operación, con frecuencia fija y ventanas de entrega acordadas.' },
  { icon: 'bell' as const,   t: 'Transporte refrigerado',      d: 'Unidades thermo con temperatura controlada y registro por viaje, para perecederos y cadena de frío.' },
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
            <span className="eyebrow">Transporte de carga · Los Mochis, Sinaloa</span>
            <h1>Resolvemos la logística de tu empresa con flota propia.</h1>
            <p className="lead">
              Diseñamos el servicio de transporte que tu operación necesita y
              lo ejecutamos con <strong>unidades propias</strong>, operadores
              capacitados, <strong>seguimiento en tiempo real</strong> y{' '}
              <strong>monitoreo satelital 24/7</strong>.
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
            <div className="preview__caption">Tus viajes de hoy</div>
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

      {/* ---------------------------- Carrusel ---------------------------- */}
      {SLIDES.length > 0 && (
      <section className="section section--carousel" aria-labelledby="carrusel-titulo">
        <div className="container">
          <div className="section__head">
            <span className="eyebrow">Así operamos</span>
            <h2 id="carrusel-titulo">Transporte, logística y seguimiento en cada viaje.</h2>
          </div>
          <Carousel slides={SLIDES} label="Imágenes de nuestra operación" />
        </div>
      </section>
      )}

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

      {/* --------------------- Seguimiento y seguridad -------------------- */}
      <section className="section section--dark">
        <div className="container">
          <div className="section__head">
            <span className="eyebrow">Seguimiento y seguridad</span>
            <h2>Visibilidad total de tu carga, de la recolección a la entrega.</h2>
            <p>
              Sabes dónde está tu carga, en qué etapa va y recibes la
              evidencia de su entrega, mientras un centro de monitoreo
              vigila cada unidad las 24 horas.
            </p>
          </div>

          <div className="grid grid--3">
            <div className="card">
              <div className="card__icon"><Icon name="phone" /></div>
              <h3>Evidencia de cada entrega</h3>
              <p>Lo que pasa en carretera, registrado en el momento.</p>
              <ul className="list-check mb-0">
                <li>Fotos, báscula y firma de entrega al instante</li>
                <li>Inspección NOM-068 y control de horas NOM-087</li>
                <li>Registro continuo aun en tramos sin señal</li>
                <li>Reporte inmediato de cualquier incidente</li>
              </ul>
            </div>
            <div className="card">
              <div className="card__icon"><Icon name="chart" /></div>
              <h3>Control de cada viaje</h3>
              <p>Una torre de control que ve toda la operación y actúa a tiempo.</p>
              <ul className="list-check mb-0">
                <li>Folio y estatus de cada viaje en vivo</li>
                <li>Incidencias atendidas con ubicación y foto</li>
                <li>Carta Porte 3.0 emitida sin errores</li>
                <li>Costos de cada viaje claros y comprobados</li>
              </ul>
            </div>
            <div className="card">
              <div className="card__icon"><Icon name="map" /></div>
              <h3>Monitoreo satelital 24/7</h3>
              <p>Rastreo GPS y protocolos de reacción ante cualquier incidente.</p>
              <ul className="list-check mb-0">
                <li>Ubicación de la unidad en tiempo real</li>
                <li>Geocercas y rutas autorizadas con alertas</li>
                <li>Paro de motor remoto ante robo o desvío</li>
                <li>Liga de seguimiento para que veas tu carga en vivo</li>
              </ul>
            </div>
          </div>

          <div className="section__foot">
            <Link href="/seguimiento/" className="btn btn--primary">
              Ver el seguimiento <Icon name="arrow" />
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

      {/* ----------------------- Preguntas frecuentes ---------------------- */}
      <section className="section" aria-labelledby="faq-titulo">
        <div className="container" style={{ maxWidth: 820 }}>
          <div className="section__head">
            <span className="eyebrow">Preguntas frecuentes</span>
            <h2 id="faq-titulo">Transporte de carga desde Los Mochis, Sinaloa, a todo México.</h2>
          </div>
          <Faq />
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
