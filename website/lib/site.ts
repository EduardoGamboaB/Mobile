// Datos de contacto del sitio. El número de WhatsApp va en formato
// internacional sin "+" ni espacios (52 + 10 dígitos), como lo pide wa.me.
// PENDIENTE: reemplazar el número de ejemplo por el número comercial real.
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '520000000000';

export const WHATSAPP_GREETING =
  'Hola G3 Logistics, me interesa cotizar un servicio de transporte.';

// Endpoint opcional para recibir el formulario (Formspree, backend propio…).
// Si queda vacío, el formulario arma el mensaje y lo abre en WhatsApp.
export const FORM_ENDPOINT = process.env.NEXT_PUBLIC_FORM_ENDPOINT || '';

export function whatsappLink(message: string = WHATSAPP_GREETING): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
