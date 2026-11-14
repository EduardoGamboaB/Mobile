'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHubspot, splitName } = require('./hubspot');
const { createHandler, FIELDS } = require('./handler');

const DATA = {
  nombre: 'Ana María Pérez', empresa: 'Agrícola del Fuerte', correo: 'Ana@Agricola.mx',
  telefono: '668 123 4567', servicio: 'Flete completo nacional', origen: 'Los Mochis', destino: 'Guadalajara',
  carga: '', frecuencia: 'Semanal', mensaje: 'Dos viajes <b>por</b> semana',
};

function mockFetch(responses) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    const r = responses.shift();
    return { ok: r.status < 300, status: r.status, text: async () => JSON.stringify(r.body || {}) };
  };
  return { impl, calls };
}

test('separa nombre y apellido', () => {
  assert.deepEqual(splitName('Ana'), { firstname: 'Ana', lastname: '' });
  assert.deepEqual(splitName(' Luis  Ramírez Soto '), { firstname: 'Luis', lastname: 'Ramírez Soto' });
});

test('crea/actualiza el contacto por correo y agrega una nota asociada', async () => {
  const { impl, calls } = mockFetch([{ status: 200, body: { results: [{ id: '901' }] } }, { status: 201, body: { id: 'n1' } }]);
  const register = createHubspot({ token: 'pat-test', fetchImpl: impl, fields: FIELDS });
  const id = await register(DATA, { marketing: true });
  assert.equal(id, '901');

  assert.equal(calls[0].url, 'https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer pat-test');
  const input = calls[0].body.inputs[0];
  assert.equal(input.idProperty, 'email');
  assert.equal(input.id, 'ana@agricola.mx');
  assert.equal(input.properties.firstname, 'Ana');
  assert.equal(input.properties.lastname, 'María Pérez');
  assert.equal(input.properties.company, 'Agrícola del Fuerte');
  assert.equal(input.properties.hs_lead_status, 'NEW');
  assert.match(input.properties.message, /Ruta|Origen: Los Mochis/);
  assert.match(input.properties.message, /mercadotecnia: aceptado/);

  assert.equal(calls[1].url, 'https://api.hubapi.com/crm/v3/objects/notes');
  assert.equal(calls[1].body.associations[0].to.id, '901');
  assert.equal(calls[1].body.associations[0].types[0].associationTypeId, 202);
  assert.ok(calls[1].body.properties.hs_note_body.includes('&lt;b&gt;por&lt;/b&gt;'));
});

test('propaga errores de la API de HubSpot', async () => {
  const { impl } = mockFetch([{ status: 401, body: { message: 'token inválido' } }]);
  const register = createHubspot({ token: 'malo', fetchImpl: impl, fields: FIELDS });
  await assert.rejects(register(DATA, { marketing: true }), /401/);
});

function res() {
  return { statusCode: 200, headers: {}, body: null, set(k, v) { this.headers[k] = v; }, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; }, send(b) { this.body = b; return this; } };
}
const req = (body) => ({ method: 'POST', body, headers: { origin: 'https://www.g3logistics.mx' }, get(h) { return this.headers[h.toLowerCase()]; } });
const VALID = { nombre: 'Ana Pérez', empresa: 'Acme', correo: 'ana@acme.mx', telefono: '6681234567', servicio: 'Flete completo nacional' };
const silent = { info() {}, error() {} };

test('envía correo y registra en HubSpot; respeta la exclusión de mercadotecnia', async () => {
  const mails = []; const leads = [];
  const h = createHandler({ sendMail: async (m) => mails.push(m), registerLead: async (d, o) => leads.push(o), env: {}, log: silent, rateLimit: () => true });
  const r = res(); await h(req({ ...VALID, no_marketing: 'si' }), r);
  assert.equal(r.statusCode, 200);
  assert.equal(mails.length, 1); assert.equal(leads.length, 1);
  assert.equal(leads[0].marketing, false);
  assert.match(mails[0].text, /mercadotecnia: rechazado/);
});

test('si HubSpot falla pero el correo sale, responde ok (degradado)', async () => {
  const h = createHandler({ sendMail: async () => {}, registerLead: async () => { throw new Error('caído'); }, env: {}, log: silent, rateLimit: () => true });
  const r = res(); await h(req(VALID), r);
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.body.degraded, ['hubspot']);
});

test('si el correo falla pero HubSpot registra, responde ok (degradado)', async () => {
  const h = createHandler({ sendMail: async () => { throw new Error('smtp'); }, registerLead: async () => '1', env: {}, log: silent, rateLimit: () => true });
  const r = res(); await h(req(VALID), r);
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.body.degraded, ['correo']);
});

test('si fallan correo y HubSpot, responde 502', async () => {
  const h = createHandler({ sendMail: async () => { throw new Error('smtp'); }, registerLead: async () => { throw new Error('hs'); }, env: {}, log: silent, rateLimit: () => true });
  const r = res(); await h(req(VALID), r);
  assert.equal(r.statusCode, 502);
});
