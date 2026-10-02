/**
 * Endpoints internos (servicio→servicio, `x-internal-token`) que nunca deben
 * alcanzarse desde fuera aunque compartan prefijo con rutas públicas: el
 * gateway responde 404 sin reenviar. Defensa en profundidad: el servicio
 * además exige el token interno.
 */
const INTERNAL_ONLY = [/^\/api\/trips\/internal(\/|$)/i];

export function isInternalOnlyPath(path: string): boolean {
  return INTERNAL_ONLY.some((r) => r.test(path));
}
