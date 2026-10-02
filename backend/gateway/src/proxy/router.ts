export interface ServiceUrls {
  auth: string;
  billing: string;
  drivers: string;
  fleet: string;
  trips: string;
  alerts: string;
  ai: string;
  integrations: string;
}

const ROUTES: { prefix: RegExp; service: keyof ServiceUrls }[] = [
  { prefix: /^\/api\/auth(\/|$)/, service: 'auth' },
  { prefix: /^\/api\/companies(\/|$)/, service: 'auth' },
  { prefix: /^\/api\/users(\/|$)/, service: 'auth' },
  { prefix: /^\/api\/audit(\/|$)/, service: 'auth' },
  { prefix: /^\/api\/subscriptions(\/|$)/, service: 'billing' },
  { prefix: /^\/api\/webhooks\/stripe(\/|$)/, service: 'billing' },
  { prefix: /^\/api\/drivers(\/|$)/, service: 'drivers' },
  { prefix: /^\/api\/tractors(\/|$)/, service: 'fleet' },
  { prefix: /^\/api\/trailers(\/|$)/, service: 'fleet' },
  { prefix: /^\/api\/devices(\/|$)/, service: 'fleet' },
  { prefix: /^\/api\/vehicles(\/|$)/, service: 'fleet' },
  { prefix: /^\/api\/telemetry(\/|$)/, service: 'fleet' },
  { prefix: /^\/api\/trips(\/|$)/, service: 'trips' },
  { prefix: /^\/api\/expense-policy(\/|$)/, service: 'trips' },
  { prefix: /^\/api\/alerts(\/|$)/, service: 'alerts' },
  { prefix: /^\/api\/incidents(\/|$)/, service: 'alerts' },
  { prefix: /^\/api\/alert-rules(\/|$)/, service: 'alerts' },
  { prefix: /^\/api\/notification-contacts(\/|$)/, service: 'alerts' },
  { prefix: /^\/api\/ai(\/|$)/, service: 'ai' },
  { prefix: /^\/api\/integrations(\/|$)/, service: 'integrations' },
];

export function resolveUpstream(path: string, urls: ServiceUrls): string | null {
  for (const r of ROUTES) {
    if (r.prefix.test(path)) return urls[r.service];
  }
  return null;
}

/**
 * Rutas internas (servicio → servicio) que el gateway NUNCA expone, aunque
 * su prefijo se rutee: responden 404. `/api/integrations/internal/*`
 * devuelve secretos en claro.
 */
const BLOCKED: RegExp[] = [/^\/api\/integrations\/internal(\/|$)/i];

export function isBlockedPath(path: string): boolean {
  return candidates(path).some((p) => BLOCKED.some((r) => r.test(p)));
}

/**
 * Variantes normalizadas de la ruta: tal cual y decodificada, con `\`→`/`,
 * segmentos `.`/`..` resueltos (como lo haría `fetch` al reenviar) y `//`
 * colapsadas. Así `/api/integrations/x/../internal`, `%69nternal` o
 * `//internal` no se saltan el bloqueo.
 */
function candidates(path: string): string[] {
  const raw = [path];
  try {
    raw.push(decodeURIComponent(path));
  } catch {
    // codificación inválida: se evalúa solo la ruta cruda
  }
  return raw.map((p) => {
    const slashes = p.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
    let resolved = slashes;
    try {
      resolved = new URL(slashes.startsWith('/') ? slashes : `/${slashes}`, 'http://gateway.local').pathname;
    } catch {
      // se queda la versión sin resolver
    }
    return resolved.replace(/\/{2,}/g, '/');
  });
}
