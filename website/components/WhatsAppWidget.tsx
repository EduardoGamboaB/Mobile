import { whatsappLink } from '../lib/site';

function WaGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3Z" />
    </svg>
  );
}

// Botón flotante + popup. Sin dependencias de React en el cliente: el
// comportamiento (abrir, cerrar, auto-abrir una vez por sesión) lo agrega
// el script de mejora progresiva de components/Enhance.tsx.
export function WhatsAppWidget() {
  return (
    <aside className="wa" aria-label="Contacto por WhatsApp">
      <div className="wa__pop" id="wa-pop" role="dialog" aria-labelledby="wa-title" hidden>
        <button type="button" className="wa__close" data-wa-close aria-label="Cerrar">×</button>
        <p className="wa__title" id="wa-title">¿Necesitas mover carga?</p>
        <p className="wa__text">
          Escríbenos por WhatsApp y un ejecutivo de G3 Logistics te
          responde con una propuesta para tu operación.
        </p>
        <a className="btn wa__cta" href={whatsappLink()} target="_blank" rel="noopener noreferrer">
          <WaGlyph /> Chatear por WhatsApp
        </a>
      </div>
      <a
        className="wa__fab"
        href={whatsappLink()}
        target="_blank"
        rel="noopener noreferrer"
        aria-controls="wa-pop"
        aria-expanded="false"
        data-wa-toggle
      >
        <WaGlyph />
        <span className="wa__fab-label">WhatsApp</span>
      </a>
    </aside>
  );
}
