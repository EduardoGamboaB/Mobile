'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHandler, createRateLimiter, validate } = require('./handler');

const ORIGIN = 'https://www.g3logistics.mx';
const VALID = {
  nombre: 'Ana Pérez', empresa: 'Acme SA de CV', correo: 'ana@acme.mx',
  telefono: '668 123 4567', servicio: 'Flete completo nacional',
  origen: 'Los Mochis', destino: 'Monterrey', mensaje: 'Dos viajes por semana',
};

function mockRes() {
  return {
    statusCode: 200, headers: {}, body: undefined,
    set(k, v) { this.headers[k] = v; return this; },
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
    send(b) { this.body = b; return this; },
  };
}
function mockReq({ method = 'POST', origin = ORIGIN, body = VALID, ip = '1.1.1.1' } = {}) {
  const headers = { origin, 'x-forwarded-for': ip };
  return { method, body, headers, get: (h) => headers[h.toLowerCase()] };
}
const silent = { info() {}, error() {} };

function setup(opts = {}) {
  const sent = [];
  const handler = createHandler({
    sendMail: opts.sendMail || (async (m) => { sent.push(m); }),
    env: { MAIL_FROM: 'G3 <web@g3logistics.mx>', ...(opts.env || {}) },
    log: silent,
    rateLimit: opts.rateLimit || (() => true),
  });
  return { handler, sent };
}

test('envía la solicitud a fletes@g3logistics.mx con reply-to del cliente', async () => {
  const { handler, sent } = setup();
  const res = mockRes();
  await handler(mockReq(), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'fletes@g3logistics.mx');
  assert.match(sent[0].replyTo, /ana@acme\.mx/);
  assert.match(sent[0].subject, /Flete completo nacional/);
  assert.match(sent[0].text, /Origen: Los Mochis/);
  assert.equal(res.headers['Access-Control-Allow-Origin'], ORIGIN);
});

test('responde el preflight CORS', async () => {
  const { handler, sent } = setup();
  const res = mockRes();
  await handler(mockReq({ method: 'OPTIONS' }), res);
  assert.equal(res.statusCode, 204);
  assert.equal(res.headers['Access-Control-Allow-Methods'], 'POST, OPTIONS');
  assert.equal(sent.length, 0);
});

test('rechaza orígenes no permitidos', async () => {
  const { handler, sent } = setup();
  const res = mockRes();
  await handler(mockReq({ origin: 'https://sitio-ajeno.com' }), res);
  assert.equal(res.statusCode, 403);
  assert.equal(sent.length, 0);
  assert.equal(res.headers['Access-Control-Allow-Origin'], undefined);
});

test('rechaza métodos distintos de POST', async () => {
  const { handler } = setup();
  const res = mockRes();
  await handler(mockReq({ method: 'GET' }), res);
  assert.equal(res.statusCode, 405);
});

test('valida campos obligatorios, correo y teléfono', async () => {
  const { handler, sent } = setup();
  const res = mockRes();
  await handler(mockReq({ body: { ...VALID, nombre: '', correo: 'no-es-correo', telefono: '123' } }), res);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body.fields.sort(), ['correo', 'nombre', 'telefono']);
  assert.equal(sent.length, 0);
});

test('honeypot: responde ok sin enviar', async () => {
  const { handler, sent } = setup();
  const res = mockRes();
  await handler(mockReq({ body: { ...VALID, website: 'http://spam' } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(sent.length, 0);
});

test('límite de envíos por IP', async () => {
  let t = 0;
  const { handler, sent } = setup({ rateLimit: createRateLimiter({ limit: 2, windowMs: 1000, now: () => t }) });
  for (let i = 0; i < 3; i++) { const r = mockRes(); await handler(mockReq(), r); if (i === 2) assert.equal(r.statusCode, 429); }
  assert.equal(sent.length, 2);
  t = 5000;
  const r = mockRes(); await handler(mockReq(), r);
  assert.equal(r.statusCode, 200);
});

test('si falla el SMTP responde 502', async () => {
  const { handler } = setup({ sendMail: async () => { throw new Error('smtp caído'); } });
  const res = mockRes();
  await handler(mockReq(), res);
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.error, 'send_failed');
});

test('escapa HTML e impide inyección de cabeceras', async () => {
  const { handler, sent } = setup();
  await handler(mockReq({ body: { ...VALID, nombre: 'Ana\r\nBcc: x@y.com', mensaje: '<script>alert(1)</script>' } }), mockRes());
  assert.ok(!/[\r\n]/.test(sent[0].replyTo));
  assert.ok(!sent[0].html.includes('<script>'));
  assert.ok(sent[0].html.includes('&lt;script&gt;'));
});

test('recorta valores demasiado largos', () => {
  const { data } = validate({ ...VALID, mensaje: 'x'.repeat(10000) });
  assert.equal(data.mensaje.length, 3000);
});
