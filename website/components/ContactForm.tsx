import { Icon } from './Icon';
import { FORM_ENDPOINT, WHATSAPP_NUMBER } from '../lib/site';

const SERVICIOS = [
  'Flete completo nacional',
  'Transporte dedicado (unidades exclusivas)',
  'Carga con temperatura controlada',
  'Carga a granel',
  'Proyecto especial / carga recurrente',
  'Aún no lo sé — quiero asesoría',
];

// Formulario de contacto. Funciona como HTML puro y lo mejora el script de
// components/Enhance.tsx: valida, y envía al endpoint configurado o, si no
// hay endpoint, abre WhatsApp con la solicitud ya redactada.
export function ContactForm({ id = 'contacto-form' }: { id?: string }) {
  return (
    <form
      id={id}
      className="card contact-form"
      method="POST"
      action={FORM_ENDPOINT || undefined}
      data-contact-form
      data-endpoint={FORM_ENDPOINT}
      data-wa={WHATSAPP_NUMBER}
      noValidate
    >
      <div className="form">
        <div className="form-row">
          <label>
            Nombre *
            <input type="text" name="nombre" required autoComplete="name" />
          </label>
          <label>
            Empresa *
            <input type="text" name="empresa" required autoComplete="organization" />
          </label>
        </div>

        <div className="form-row">
          <label>
            Correo *
            <input type="email" name="correo" required autoComplete="email" inputMode="email" />
          </label>
          <label>
            Teléfono / WhatsApp *
            <input type="tel" name="telefono" required autoComplete="tel" inputMode="tel" placeholder="10 dígitos" pattern="[+0-9 ()-]{10,}" />
          </label>
        </div>

        <label>
          ¿Qué necesitas resolver? *
          <select name="servicio" required defaultValue="">
            <option value="" disabled>Selecciona una opción</option>
            {SERVICIOS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>

        <div className="form-row">
          <label>
            Origen
            <input type="text" name="origen" placeholder="Ciudad o estado" />
          </label>
          <label>
            Destino
            <input type="text" name="destino" placeholder="Ciudad o estado" />
          </label>
        </div>

        <div className="form-row">
          <label>
            Tipo de carga
            <input type="text" name="carga" placeholder="Ej. producto terminado, insumos, refacciones" />
          </label>
          <label>
            Frecuencia
            <select name="frecuencia" defaultValue="Un viaje">
              <option>Un viaje</option>
              <option>Semanal</option>
              <option>Varias veces por semana</option>
              <option>Diario / dedicado</option>
            </select>
          </label>
        </div>

        <label>
          Mensaje
          <textarea name="mensaje" rows={3} placeholder="Cuéntanos tu operación: volumen, ventanas de entrega, requisitos especiales…" />
        </label>

        {/* Honeypot anti-spam: los bots lo llenan, las personas no lo ven. */}
        <label className="hp" aria-hidden="true">
          No llenar
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>

        <button type="submit" className="btn btn--primary">
          Enviar solicitud <Icon name="arrow" />
        </button>
        <p className="form__status" role="status" aria-live="polite" data-form-status />
        <p className="form__legal">
          Al enviar aceptas que G3 Logistics te contacte por correo, teléfono o
          WhatsApp para atender tu solicitud.
        </p>
      </div>
    </form>
  );
}
