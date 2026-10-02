/**
 * Headers de seguridad de G3 Admin (una sola fuente):
 * - next.config.js los aplica en `next dev` / `next start`;
 * - app/layout.tsx emite la CSP también como <meta> (el export estático no
 *   lleva headers propios);
 * - deploy/deploy.sh los configura en el backend bucket del Load Balancer.
 *
 * CSP: Next.js (App Router, export estático) inyecta scripts inline para la
 * hidratación y la app usa atributos `style`, así que script-src y
 * style-src llevan 'unsafe-inline' (no hay servidor que genere nonces).
 * connect-src solo permite el propio origen y el API (NEXT_PUBLIC_G3_API_URL).
 */

/** Origen (esquema + host + puerto) de una URL, o null si no es válida. */
function originOf(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return u.origin;
  } catch {
    return null;
  }
}

/**
 * @param {{ apiUrl?: string, dev?: boolean, meta?: boolean }} opts
 *   meta: variante para <meta http-equiv> (sin frame-ancestors, que ahí se ignora).
 */
function buildCsp({ apiUrl = process.env.NEXT_PUBLIC_G3_API_URL, dev = process.env.NODE_ENV !== 'production', meta = false } = {}) {
  const api = originOf(apiUrl);
  const connect = ["'self'"];
  if (api) connect.push(api);
  // Fast Refresh de `next dev` usa websocket.
  if (dev) connect.push('ws:', 'wss:');
  const script = ["'self'", "'unsafe-inline'"];
  // React Refresh evalúa código en desarrollo.
  if (dev) script.push("'unsafe-eval'");

  const directives = [
    ["default-src", "'self'"],
    ['script-src', ...script],
    ['style-src', "'self'", "'unsafe-inline'"],
    ['img-src', "'self'", 'data:', 'blob:'],
    ['font-src', "'self'", 'data:'],
    ['connect-src', ...connect],
    ['object-src', "'none'"],
    ['base-uri', "'self'"],
    ['form-action', "'self'"],
    ['manifest-src', "'self'"],
    ['worker-src', "'self'", 'blob:'],
  ];
  if (!meta) directives.push(['frame-ancestors', "'none'"]);
  return directives.map((d) => d.join(' ')).join('; ');
}

/** @param {{ apiUrl?: string, dev?: boolean }} opts */
function securityHeaders(opts = {}) {
  const dev = opts.dev ?? process.env.NODE_ENV !== 'production';
  const headers = [
    { key: 'Content-Security-Policy', value: buildCsp({ ...opts, dev }) },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=(), clipboard-write=(self)',
    },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ];
  if (!dev) headers.push({ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' });
  return headers;
}

module.exports = { buildCsp, securityHeaders, originOf };
