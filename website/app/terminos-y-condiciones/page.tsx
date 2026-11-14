import Link from 'next/link';
import type { Metadata } from 'next';
import { BUSINESS, LEGAL, LOCATION_LABEL } from '../../lib/site';

export const metadata: Metadata = {
  title: 'Términos y condiciones',
  description:
    'Términos y condiciones de uso del sitio web de G3 Logistics, empresa de transporte de carga en Los Mochis, Sinaloa.',
  alternates: { canonical: '/terminos-y-condiciones/' },
  openGraph: {
    title: 'Términos y condiciones · G3 Logistics',
    url: '/terminos-y-condiciones/',
    images: [{ url: '/og-g3logistics.jpg', width: 1200, height: 630 }],
  },
};

export default function TerminosPage() {
  return (
    <>
      <section className="hero hero--center hero--compact">
        <div className="container">
          <span className="eyebrow">Legal</span>
          <h1>Términos y condiciones de uso</h1>
          <p className="lead">Última actualización: {LEGAL.updated}</p>
        </div>
      </section>

      <section className="section">
        <div className="container legal">
          <h2>1. Aceptación</h2>
          <p>
            Estos términos regulan el uso del sitio web www.g3logistics.mx (el
            &ldquo;Sitio&rdquo;), operado por {LEGAL.name} (&ldquo;G3 Logistics&rdquo;), con
            domicilio en {LEGAL.address}. Al navegar en el Sitio, enviar el formulario de
            contacto o comunicarte con nosotros por los medios aquí publicados, aceptas estos
            términos y el <Link href="/aviso-de-privacidad/">Aviso de privacidad</Link>. Si no
            estás de acuerdo, te pedimos no usar el Sitio.
          </p>

          <h2>2. Uso del Sitio</h2>
          <p>Te comprometes a usar el Sitio de forma lícita y a no:</p>
          <ul>
            <li>Proporcionar información falsa, incompleta o de terceros sin su autorización.</li>
            <li>Enviar spam, software malicioso o cualquier contenido que dañe el Sitio o a terceros.</li>
            <li>Intentar acceder sin autorización a sistemas, cuentas o información de G3 Logistics.</li>
            <li>Copiar, extraer de forma automatizada o revender el contenido del Sitio.</li>
          </ul>

          <h2>3. Información, cotizaciones y servicios</h2>
          <p>
            La información del Sitio sobre servicios, cobertura, tiempos y capacidades es
            general e informativa y puede cambiar sin previo aviso. No constituye una oferta
            vinculante. Las condiciones de cada servicio de transporte, incluidos precio,
            tiempos, responsabilidades, seguros y límites de responsabilidad, se rigen por la
            cotización formal aceptada, el contrato correspondiente, la Carta Porte y la
            legislación aplicable al autotransporte federal de carga.
          </p>

          <h2>4. Datos que nos proporcionas</h2>
          <p>
            Al enviar el formulario o contactarnos, declaras que la información es verdadera y
            que tienes facultades para proporcionarla. Aceptas que G3 Logistics trate esos datos
            conforme al <Link href="/aviso-de-privacidad/">Aviso de privacidad</Link>, tanto para
            atender tu solicitud como para las finalidades de mercadotecnia, publicidad y
            aprovechamiento comercial ahí descritas, salvo que marques la casilla de exclusión
            del formulario o nos lo solicites en cualquier momento.
          </p>

          <h2>5. Blog y contenidos</h2>
          <p>
            Los artículos del blog tienen fines informativos y de divulgación. No constituyen
            asesoría legal, fiscal ni técnica; verifica la normativa vigente o consulta a un
            especialista antes de tomar decisiones con base en ellos.
          </p>

          <h2>6. Propiedad intelectual</h2>
          <p>
            La marca G3 Logistics, el logotipo, los textos, diseños y demás contenidos del Sitio
            son propiedad de G3 Logistics o de sus licenciantes y están protegidos por la
            legislación de propiedad industrial e intelectual. No se otorga ninguna licencia
            para usarlos sin autorización previa y por escrito. Las fotografías utilizadas son de
            dominio público o cuentan con licencia que permite su uso.
          </p>

          <h2>7. Enlaces a terceros</h2>
          <p>
            El Sitio puede incluir enlaces a servicios de terceros, como WhatsApp o Google Maps.
            G3 Logistics no es responsable del contenido, disponibilidad ni políticas de esos
            servicios, que se rigen por sus propios términos.
          </p>

          <h2>8. Limitación de responsabilidad</h2>
          <p>
            G3 Logistics procura que el Sitio funcione de manera continua y que su información
            sea correcta, pero no garantiza que esté libre de errores o interrupciones. En la
            medida permitida por la ley, G3 Logistics no será responsable por daños derivados del
            uso o la imposibilidad de uso del Sitio, ni por decisiones tomadas con base en su
            contenido informativo.
          </p>

          <h2>9. Cambios a estos términos</h2>
          <p>
            Podemos actualizar estos términos en cualquier momento. La versión vigente será la
            publicada en esta página con su fecha de actualización.
          </p>

          <h2>10. Legislación aplicable y jurisdicción</h2>
          <p>
            Estos términos se rigen por las leyes federales de los Estados Unidos Mexicanos.
            Para cualquier controversia, las partes se someten a los tribunales competentes de
            {' '}{LOCATION_LABEL}, renunciando a cualquier otro fuero que pudiera corresponderles.
          </p>

          <h2>11. Contacto</h2>
          <p>
            Para dudas sobre estos términos escríbenos a{' '}
            <a href={`mailto:${BUSINESS.emailFletes}`}>{BUSINESS.emailFletes}</a> o llámanos al{' '}
            <a href={`tel:${BUSINESS.phoneE164}`}>{BUSINESS.phoneDisplay}</a>.
          </p>
        </div>
      </section>
    </>
  );
}
