'use strict';

// Registro de cada solicitud en HubSpot (CRM v3):
//   1. Crea o actualiza el contacto por correo (batch upsert, idProperty=email).
//   2. Agrega una nota con el detalle de la solicitud asociada al contacto.
// Requiere un token de app privada con los permisos
// crm.objects.contacts.write y crm.objects.contacts.read (las notas usan los mismos).

const API = 'https://api.hubapi.com';
const NOTE_TO_CONTACT = 202; // associationTypeId HUBSPOT_DEFINED nota → contacto

// En México lo común son dos apellidos: la primera palabra es el nombre y el
// resto, los apellidos ("Luis Ramírez Soto" → Luis / Ramírez Soto).
function splitName(full) {
  const parts = full.trim().split(/\s+/);
  return { firstname: parts[0], lastname: parts.slice(1).join(' ') };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function summary(data, fields, marketing) {
  const rows = Object.entries(fields).filter(([k]) => data[k]).map(([k, f]) => `${f.label}: ${data[k]}`);
  rows.push(`Uso de datos para mercadotecnia: ${marketing ? 'aceptado' : 'rechazado por el titular'}`);
  return rows;
}

function createHubspot({ token, fetchImpl = fetch, fields, apiBase = API }) {
  async function call(path, body) {
    const r = await fetchImpl(`${apiBase}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    if (!r.ok) throw new Error(`HubSpot ${path} → ${r.status}: ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : {};
  }

  return async function registerLead(data, { marketing }) {
    const lines = summary(data, fields, marketing);
    const { firstname, lastname } = splitName(data.nombre);
    const upsert = await call('/crm/v3/objects/contacts/batch/upsert', {
      inputs: [{
        idProperty: 'email',
        id: data.correo.toLowerCase(),
        properties: {
          email: data.correo.toLowerCase(),
          firstname,
          lastname,
          company: data.empresa,
          phone: data.telefono,
          message: lines.join('\n').slice(0, 65000),
          hs_lead_status: 'NEW',
        },
      }],
    });
    const contactId = upsert.results && upsert.results[0] && upsert.results[0].id;
    if (!contactId) throw new Error('HubSpot no devolvió el id del contacto');

    await call('/crm/v3/objects/notes', {
      properties: {
        hs_timestamp: new Date().toISOString(),
        hs_note_body: `<p><strong>Solicitud de cotización desde www.g3logistics.mx</strong></p><p>${lines.map(escapeHtml).join('<br>')}</p>`,
      },
      associations: [{ to: { id: contactId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: NOTE_TO_CONTACT }] }],
    });
    return contactId;
  };
}

module.exports = { createHubspot, splitName };
