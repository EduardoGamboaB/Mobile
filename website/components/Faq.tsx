import { BUSINESS, LOCATION_LABEL } from '../lib/site';

export const FAQ: { q: string; a: string }[] = [
  {
    q: '¿Dónde se encuentra G3 Logistics?',
    a: `Estamos en ${LOCATION_LABEL}, ${BUSINESS.countryName}. Desde ahí operamos nuestra flota propia y atendemos rutas de carga a todo el país.`,
  },
  {
    q: '¿Qué tipo de transporte de carga ofrecen?',
    a: 'Flete completo nacional, transporte dedicado con unidades exclusivas, carga con temperatura controlada, carga a granel y esquemas de logística a la medida para empresas.',
  },
  {
    q: '¿Ofrecen transporte refrigerado?',
    a: `Sí. Tenemos unidades refrigeradas (thermo) con temperatura controlada y registro por viaje para perecederos, alimentos y productos que requieren cadena de frío, desde ${LOCATION_LABEL} a todo México.`,
  },
  {
    q: '¿Hasta dónde llegan sus rutas?',
    a: 'Tenemos cobertura nacional en rutas troncales, con fuerte presencia en Sinaloa, Sonora y el Pacífico norte, el Bajío y el centro del país, además de acceso a los puertos de Topolobampo, Mazatlán, Guaymas y Manzanillo.',
  },
  {
    q: '¿Las unidades son propias o subcontratan la carga?',
    a: 'Todas las unidades y los operadores son de G3 Logistics. No subcontratamos tu carga, así respondemos por el servicio de principio a fin.',
  },
  {
    q: '¿Cómo puedo cotizar un flete?',
    a: `Llena el formulario de contacto, escríbenos por WhatsApp o llámanos al ${BUSINESS.phoneDisplay}, o envía un correo a ${BUSINESS.emailFletes}. Respondemos con una cotización formal en menos de 4 horas hábiles.`,
  },
  {
    q: '¿Cómo sé dónde está mi carga?',
    a: 'Cada unidad tiene rastreo GPS y monitoreo satelital 24/7. Te compartimos el estatus del viaje, su ubicación en vivo y la evidencia de la entrega.',
  },
  {
    q: '¿Emiten Carta Porte?',
    a: 'Sí. Cada viaje sale con su CFDI 4.0 con complemento Carta Porte 3.0, inspección NOM-068 y bitácora de horas NOM-087.',
  },
];

// Preguntas frecuentes: <details> nativo (accesible y sin JavaScript) más
// datos estructurados FAQPage para buscadores.
export function Faq() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  return (
    <div className="faq">
      {FAQ.map((f) => (
        <details key={f.q} className="faq__item">
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
