export type Slide = {
  src: string;       // ruta de la imagen grande (1280px)
  srcSmall: string;  // versión de 640px para móvil
  width: number;
  height: number;
  alt: string;
  title: string;
  text: string;
};

function Chevron({ dir }: { dir: 'prev' | 'next' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      {dir === 'prev' ? <path d="m15 6-6 6 6 6" /> : <path d="m9 6 6 6-6 6" />}
    </svg>
  );
}

// Carrusel accesible. Sin JavaScript funciona como una fila deslizable con
// scroll-snap (gesto nativo en móvil). components/Enhance.tsx le agrega
// flechas, indicadores, avance automático y pausa.
export function Carousel({ slides, label }: { slides: Slide[]; label: string }) {
  return (
    <div className="carousel" data-carousel role="region" aria-roledescription="carrusel" aria-label={label}>
      <div className="carousel__track" data-carousel-track tabIndex={0} aria-live="off">
        {slides.map((s, i) => (
          <figure
            key={s.src}
            className="carousel__slide"
            role="group"
            aria-roledescription="diapositiva"
            aria-label={`${i + 1} de ${slides.length}: ${s.title}`}
          >
            <img
              src={s.src}
              srcSet={`${s.srcSmall} 640w, ${s.src} ${s.width}w`}
              sizes="(min-width: 1180px) 1116px, 100vw"
              width={s.width}
              height={s.height}
              alt={s.alt}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
            />
            <figcaption className="carousel__caption">
              <strong>{s.title}</strong>
              <span>{s.text}</span>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="carousel__controls">
        <button type="button" className="carousel__btn" data-carousel-prev aria-label="Imagen anterior">
          <Chevron dir="prev" />
        </button>
        <span className="carousel__count" aria-hidden="true">
          <span data-carousel-count>1</span> / {slides.length}
        </span>
        <div className="carousel__dots">
          {slides.map((s, i) => (
            <button
              key={s.src}
              type="button"
              className="carousel__dot"
              data-carousel-dot={i}
              aria-label={`Ir a la imagen ${i + 1}: ${s.title}`}
              aria-current={i === 0 ? 'true' : undefined}
            />
          ))}
        </div>
        <button type="button" className="carousel__btn" data-carousel-next aria-label="Imagen siguiente">
          <Chevron dir="next" />
        </button>
        <button type="button" className="carousel__btn carousel__pause" data-carousel-pause aria-label="Pausar el carrusel" aria-pressed="false">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className="carousel__icon-pause"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className="carousel__icon-play"><path d="M8 5v14l11-7z" /></svg>
        </button>
      </div>
    </div>
  );
}
