/**
 * Endpoints internos (servicio→servicio, `x-internal-token`) que nunca deben
 * alcanzarse desde fuera aunque compartan prefijo con rutas públicas: el
 * gateway responde 404 sin reenviar. Defensa en profundidad: el servicio
 * además exige el token interno.
 *
 * - /api/trips/internal/*         viaje activo por vehículo (fleet → trips)
 * - /api/integrations/internal/*  configuración CON secretos en claro
 * - /api/subscriptions/apply-tier, /start-trial  cambian el plan de cualquier compañía
 */
const INTERNAL_ONLY = [
  /^\/api\/trips\/internal(\/|$)/i,
  /^\/api\/integrations\/internal(\/|$)/i,
  /^\/api\/subscriptions\/(apply-tier|start-trial)(\/|$)/i,
];

export function isInternalOnlyPath(path: string): boolean {
  return candidates(path).some((p) => INTERNAL_ONLY.some((r) => r.test(p)));
}

/**
 * Variantes normalizadas de la ruta: tal cual y decodificada, con `\\`→`/`,
 * `//` colapsadas y segmentos `.`/`..` resueltos (como lo haría `fetch` al
 * reenviar). Así `/api/integrations/x/../internal`, `%69nternal` o
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
