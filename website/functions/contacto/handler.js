'use strict';

// Lógica del formulario de contacto, separada del transporte (SMTP) para
// poder probarla sin enviar correos reales.

const FIELDS = {
  nombre:     { label: 'Nombre',               required: true,  max: 120 },
  empresa:    { label: 'Empresa',              required: true,  max: 160 },
  correo:     { label: 'Correo',               required: true,  max: 160 },
  telefono:   { label: 'Teléfono / WhatsApp',  required: true,  max: 40 },
  servicio:   { label: 'Servicio',             required: true,  max: 120 },
  origen:     { label: 'Origen',               required: false, max: 120 },
  destino:    { label: 'Destino',              required: false, max: 120 },
  carga:      { label: 'Tipo de carga',        required: false, max: 200 },
  frecuencia: { label: 'Frecuencia',           required: false, max: 60 },
  mensaje:    { label: 'Mensaje',              required: false, max: 3000, multiline: true },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+0-9 ()-]{10,}$/;

function clean(value, max, multiline = false) {
  if (typeof value !== 'string') return '';
  // Sin caracteres de control y, salvo en el mensaje, sin saltos de línea:
  // los campos de una línea terminan en cabeceras del correo (asunto, reply-to).
  let v = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  if (!multiline) v = v.replace(/[\r\n\t]+/g, ' ');
  return v.trim().slice(0, max);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function validate(body) {
  const data = {};
  const errors = [];
  for (const [key, f] of Object.entries(FIELDS)) {
    data[key] = clean(body[key], f.max, f.multiline);
    if (f.required && !data[key]) errors.push(key);
  }
  if (data.correo && !EMAIL_RE.test(data.correo)) errors.push('correo');
  if (data.telefono && !PHONE_RE.test(data.telefono)) errors.push('telefono');
  return { data, errors: [...new Set(errors)] };
}

function buildEmail(data, { to, from }) {
  const rows = Object.entries(FIELDS).filter(([k]) => data[k]);
  const text = [
    'Nueva solicitud de cotización desde www.g3logistics.mx',
    '',
    ...rows.map(([k, f]) => `${f.label}: ${data[k]}`),
  ].join('\n');
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#101A30">
<h2 style="color:#1F2F55;margin:0 0 12px">Nueva solicitud de cotización</h2>
<p style="margin:0 0 16px;color:#4A5468">Enviada desde el formulario de www.g3logistics.mx</p>
<table cellpadding="8" style="border-collapse:collapse">
${rows.map(([k, f]) => `<tr><td style="border-bottom:1px solid #D5D9E2;color:#4A5468;vertical-align:top"><strong>${escapeHtml(f.label)}</strong></td><td style="border-bottom:1px solid #D5D9E2;white-space:pre-line">${escapeHtml(data[k])}</td></tr>`).join('\n')}
</table>
<p style="margin-top:16px;color:#4A5468;font-size:13px">Responde a este correo para contestarle directamente a ${escapeHtml(data.nombre)}.</p>
</body></html>`;
  return {
    from,
    to,
    replyTo: `"${data.nombre.replace(/"/g, '')}" <${data.correo}>`,
    subject: `Cotización: ${data.servicio} — ${data.empresa}`,
    text,
    html,
  };
}

// Límite simple por IP en memoria (por instancia): 5 envíos cada 10 minutos.
function createRateLimiter({ limit = 5, windowMs = 10 * 60 * 1000, now = Date.now } = {}) {
  const hits = new Map();
  return (key) => {
    const t = now();
    const list = (hits.get(key) || []).filter((x) => t - x < windowMs);
    list.push(t);
    hits.set(key, list);
    if (hits.size > 5000) hits.clear();
    return list.length <= limit;
  };
}

function createHandler({ sendMail, env = process.env, log = console, rateLimit = createRateLimiter() }) {
  const allowed = (env.ALLOWED_ORIGINS || 'https://www.g3logistics.mx,https://g3logistics.mx')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const to = env.MAIL_TO || 'fletes@g3logistics.mx';
  const from = env.MAIL_FROM || 'G3 Logistics <no-reply@g3logistics.mx>';

  return async function contacto(req, res) {
    const origin = req.get ? req.get('origin') : req.headers && req.headers.origin;
    if (origin && (allowed.includes(origin) || allowed.includes('*'))) {
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Vary', 'Origin');
    }
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Accept');
    res.set('Access-Control-Max-Age', '3600');

    if (req.method === 'OPTIONS') return res.status(204).send('');
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });
    if (origin && !allowed.includes(origin) && !allowed.includes('*')) {
      return res.status(403).json({ ok: false, error: 'origin_not_allowed' });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    // Honeypot: los bots llenan el campo oculto; respondemos ok sin enviar.
    if (body.website) return res.status(200).json({ ok: true });

    const ip = String((req.headers && req.headers['x-forwarded-for']) || req.ip || 'unknown').split(',')[0].trim();
    if (!rateLimit(ip)) return res.status(429).json({ ok: false, error: 'too_many_requests' });

    const { data, errors } = validate(body);
    if (errors.length) return res.status(400).json({ ok: false, error: 'invalid', fields: errors });

    // Respaldo en Cloud Logging: la solicitud queda registrada aunque falle el correo.
    log.info(JSON.stringify({ severity: 'INFO', message: 'lead_recibido', lead: data }));
    try {
      await sendMail(buildEmail(data, { to, from }));
    } catch (err) {
      log.error(JSON.stringify({ severity: 'ERROR', message: 'envio_fallido', error: String(err && err.message || err), lead: data }));
      return res.status(502).json({ ok: false, error: 'send_failed' });
    }
    return res.status(200).json({ ok: true });
  };
}

module.exports = { createHandler, createRateLimiter, validate, buildEmail, FIELDS };
