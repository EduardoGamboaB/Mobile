import Link from 'next/link';
import type { Metadata } from 'next';
import { BUSINESS, LEGAL, LOCATION_LABEL } from '../../lib/site';

export const metadata: Metadata = {
  title: 'Aviso de privacidad',
  description:
    'Aviso de privacidad integral de G3 Logistics: qué datos personales recabamos, para qué los usamos, con quién los compartimos y cómo ejercer tus derechos ARCO.',
  alternates: { canonical: '/aviso-de-privacidad/' },
  openGraph: {
    title: 'Aviso de privacidad · G3 Logistics',
    url: '/aviso-de-privacidad/',
    images: [{ url: '/og-g3logistics.jpg', width: 1200, height: 630 }],
  },
};

export default function AvisoPrivacidadPage() {
  return (
    <>
      <section className="hero hero--center hero--compact">
        <div className="container">
          <span className="eyebrow">Legal</span>
          <h1>Aviso de privacidad integral</h1>
          <p className="lead">Última actualización: {LEGAL.updated}</p>
        </div>
      </section>

      <section className="section">
        <div className="container legal">
          <h2>1. Responsable del tratamiento</h2>
          <p>
            {LEGAL.name} (en adelante, &ldquo;G3 Logistics&rdquo;), con domicilio en{' '}
            {LEGAL.address}, es responsable del tratamiento de los datos personales que
            nos proporciones, conforme a la Ley Federal de Protección de Datos Personales
            en Posesión de los Particulares (la &ldquo;Ley&rdquo;) y demás normativa
            aplicable. Para cualquier asunto relacionado con tus datos personales puedes
            escribir a <a href={`mailto:${BUSINESS.emailFletes}`}>{BUSINESS.emailFletes}</a>.
          </p>

          <h2>2. Datos personales que recabamos</h2>
          <p>Recabamos datos que nos proporcionas directamente a través del formulario de contacto, WhatsApp, teléfono o correo electrónico:</p>
          <ul>
            <li><strong>Identificación y contacto:</strong> nombre, correo electrónico, teléfono y número de WhatsApp.</li>
            <li><strong>Datos laborales y de la empresa:</strong> empresa en la que trabajas o que representas.</li>
            <li><strong>Datos de tu solicitud:</strong> tipo de servicio, origen, destino, tipo de carga, frecuencia y comentarios.</li>
          </ul>
          <p>
            También podemos obtener de forma automática datos técnicos de navegación, como
            dirección IP, tipo de navegador, páginas visitadas y fecha y hora de la visita.
            <strong> No recabamos datos personales sensibles</strong> ni datos financieros a
            través de este sitio.
          </p>

          <h2>3. Finalidades del tratamiento</h2>
          <h3>Finalidades primarias (necesarias para atenderte)</h3>
          <ul>
            <li>Atender tu solicitud, contactarte y enviarte cotizaciones.</li>
            <li>Prestar, coordinar y dar seguimiento a los servicios de transporte contratados.</li>
            <li>Emitir facturas, Carta Porte y demás documentos fiscales y legales.</li>
            <li>Cumplir obligaciones legales y requerimientos de autoridades.</li>
          </ul>

          <h3>Finalidades secundarias (mercadotecnia y aprovechamiento comercial)</h3>
          <p>
            Al proporcionarnos tus datos, aceptas que G3 Logistics los utilice también para
            las siguientes finalidades de mercadotecnia, publicidad y prospección comercial:
          </p>
          <ul>
            <li>Enviarte información comercial, promociones, boletines y contenido de nuestro blog por correo, teléfono, WhatsApp u otros medios.</li>
            <li>Registrar y gestionar tu información en nuestras herramientas de relación con clientes (CRM) y automatización de mercadotecnia.</li>
            <li>Analizar, segmentar y perfilar la información para diseñar estrategias comerciales, campañas y publicidad dirigida, incluida la publicidad en redes sociales y buscadores.</li>
            <li>Realizar estudios de mercado, encuestas de satisfacción y estadísticas, y medir la efectividad de nuestras campañas.</li>
            <li>Ofrecerte nuevos servicios y dar seguimiento comercial a tu empresa.</li>
          </ul>
          <p>
            <strong>Si no deseas que tus datos se usen para estas finalidades secundarias</strong>,
            marca la casilla &ldquo;No deseo que mis datos se usen para fines de mercadotecnia y
            publicidad&rdquo; en el formulario o, en cualquier momento, escríbenos a{' '}
            <a href={`mailto:${BUSINESS.emailFletes}`}>{BUSINESS.emailFletes}</a> con el asunto
            &ldquo;Mercadotecnia&rdquo;. Negarte no afectará la atención de tu solicitud ni los
            servicios que contrates.
          </p>

          <h2>4. Transferencias y remisiones</h2>
          <p>
            Para cumplir las finalidades anteriores, tus datos pueden ser tratados por
            proveedores que actúan por cuenta de G3 Logistics como encargados, bajo
            obligaciones de confidencialidad y seguridad, entre ellos: servicios de
            infraestructura en la nube y correo electrónico (Google Cloud), plataforma de CRM
            y automatización de mercadotecnia (HubSpot) y mensajería (WhatsApp). Algunos de
            estos proveedores almacenan la información en servidores ubicados fuera de México.
          </p>
          <p>
            Sin requerir tu consentimiento, podemos transferir tus datos a autoridades
            competentes cuando una ley lo exija o para atender requerimientos fundados y
            motivados, y en los demás supuestos previstos por la Ley.{' '}
            <strong>G3 Logistics no vende tus datos personales.</strong>
          </p>

          <h2>5. Derechos ARCO y revocación del consentimiento</h2>
          <p>
            Tienes derecho a <strong>acceder</strong> a tus datos, <strong>rectificarlos</strong>{' '}
            si son inexactos, <strong>cancelarlos</strong> cuando consideres que no se requieren
            para las finalidades señaladas, y <strong>oponerte</strong> a su tratamiento para
            fines específicos (derechos ARCO), así como a revocar el consentimiento otorgado.
          </p>
          <p>Para ejercerlos, envía una solicitud a <a href={`mailto:${BUSINESS.emailFletes}`}>{BUSINESS.emailFletes}</a> que incluya:</p>
          <ul>
            <li>Tu nombre y un medio para comunicarte la respuesta.</li>
            <li>Copia de una identificación oficial o, en su caso, documentos que acrediten la representación legal.</li>
            <li>La descripción clara de los datos y del derecho que deseas ejercer.</li>
            <li>Cualquier documento que facilite la localización de tus datos.</li>
          </ul>
          <p>
            Te responderemos en un plazo máximo de 20 días hábiles y, de resultar procedente,
            haremos efectiva la solicitud dentro de los 15 días hábiles siguientes, en los
            términos de la Ley.
          </p>

          <h2>6. Limitar el uso o divulgación de tus datos</h2>
          <p>
            Además de la casilla del formulario, puedes pedir en cualquier momento que dejemos
            de enviarte comunicaciones comerciales escribiendo a{' '}
            <a href={`mailto:${BUSINESS.emailFletes}`}>{BUSINESS.emailFletes}</a> o usando el
            enlace para darte de baja incluido en nuestros correos.
          </p>

          <h2>7. Medidas de seguridad y conservación</h2>
          <p>
            Aplicamos medidas de seguridad administrativas, técnicas y físicas para proteger tus
            datos contra daño, pérdida, alteración, destrucción o uso, acceso o tratamiento no
            autorizado. Conservamos tus datos durante el tiempo necesario para cumplir las
            finalidades descritas y las obligaciones legales aplicables; después, los
            bloqueamos y suprimimos.
          </p>

          <h2>8. Cookies y tecnologías similares</h2>
          <p>
            Este sitio puede usar cookies, almacenamiento local y tecnologías similares para su
            funcionamiento, para recordar tus preferencias y para obtener estadísticas de uso y
            medir campañas. Puedes deshabilitarlas desde la configuración de tu navegador; algunas
            funciones del sitio podrían verse afectadas.
          </p>

          <h2>9. Cambios a este aviso</h2>
          <p>
            Podemos modificar este aviso de privacidad por cambios legales, en nuestros servicios
            o en nuestras prácticas. Publicaremos cualquier cambio en esta página, indicando la
            fecha de la última actualización.
          </p>

          <h2>10. Autoridad</h2>
          <p>
            Si consideras que tu derecho a la protección de datos personales ha sido vulnerado,
            puedes acudir a la autoridad competente en materia de protección de datos personales
            en posesión de los particulares, conforme a la Ley.
          </p>

          <p className="legal__meta">
            {LEGAL.name} · {LOCATION_LABEL}, {BUSINESS.countryName}. Consulta también nuestros{' '}
            <Link href="/terminos-y-condiciones/">Términos y condiciones</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
