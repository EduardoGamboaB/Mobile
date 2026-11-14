// Datos del negocio: fuente única para todo el sitio y los datos
// estructurados (JSON-LD). Mantener nombre, teléfono y ubicación idénticos en
// todos lados ayuda a Google a asociar el sitio con el negocio local.

export const SITE_URL = 'https://www.g3logistics.mx';

export const BUSINESS = {
  name: 'G3 Logistics',
  phoneDisplay: '+52 668 125 5045',
  phoneE164: '+526681255045',
  emailFletes: 'fletes@g3logistics.mx',
  emailFacturacion: 'facturacion@g3logistics.mx',
  city: 'Los Mochis',
  state: 'Sinaloa',
  stateCode: 'MX-SIN',
  country: 'MX',
  countryName: 'México',
  // Centro de Los Mochis. Si se publica una dirección exacta, actualizar aquí.
  lat: 25.7905,
  lng: -108.9859,
  hours: [
    { days: 'Lunes a viernes', opens: '08:00', closes: '19:00', schema: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
    { days: 'Sábados', opens: '09:00', closes: '14:00', schema: ['Saturday'] },
  ],
} as const;

export const LOCATION_LABEL = `${BUSINESS.city}, ${BUSINESS.state}`;
// Cuando exista el Perfil de Negocio en Google, sustituir por su enlace de Maps.
export const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${BUSINESS.city}, ${BUSINESS.state}, México`)}`;

// WhatsApp en formato internacional sin "+" ni espacios, como lo pide wa.me.
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '526681255045';

export const WHATSAPP_GREETING =
  'Hola G3 Logistics, me interesa cotizar un servicio de transporte.';

// URL de la Cloud Run function del formulario (functions/contacto). La pone
// deploy/deploy.sh al compilar. Si queda vacía (desarrollo), el formulario
// arma el mensaje y lo abre en WhatsApp.
export const FORM_ENDPOINT = process.env.NEXT_PUBLIC_FORM_ENDPOINT || '';

export function whatsappLink(message: string = WHATSAPP_GREETING): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
