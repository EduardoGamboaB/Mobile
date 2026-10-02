/**
 * Utilidades HTTP compartidas por los controllers del auth-service.
 * El gateway verifica el JWT e inyecta x-user-id / x-company-id / x-user-role;
 * aquí además re-leemos al usuario de la DB para usar su rol VIGENTE (un
 * cambio de rol aplica de inmediato, sin esperar a que expire el JWT).
 */
import { HttpException } from '@nestjs/common';
import { AuthError } from './errors';
import type { AuthContainer } from './container';
import type { ActorContext, RequestMeta } from './security/actor';

export interface HttpRequestLike {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
}

function header(req: HttpRequestLike, name: string): string | null {
  const v = req.headers[name.toLowerCase()];
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim() : null;
}

export function metaFrom(req: HttpRequestLike): RequestMeta {
  // El gateway reconstruye los headers y fija `x-client-ip` desde req.ip
  // (con trust proxy), así que el cliente no puede inyectarlo. El auth-service
  // solo acepta tráfico del gateway (Cloud Run ingress interno).
  const ip = header(req, 'x-client-ip') ?? req.ip ?? null;
  return { ip: ip ? ip.slice(0, 64) : null, userAgent: header(req, 'user-agent') };
}

export async function actorFrom(c: AuthContainer, req: HttpRequestLike): Promise<ActorContext> {
  const userId = header(req, 'x-user-id');
  const companyId = header(req, 'x-company-id');
  if (!userId || !companyId) throw new AuthError(401, 'No autenticado');
  const user = await c.users.findById(userId);
  if (!user || user.companyId !== companyId) throw new AuthError(401, 'No autenticado');
  return { userId: user.id, companyId: user.companyId, role: user.role, ...metaFrom(req) };
}

/** Traduce errores de dominio a HttpException con cuerpo estándar. */
export async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AuthError) {
      throw new HttpException({ statusCode: e.status, error: errorName(e.status), message: e.message }, e.status);
    }
    if (e instanceof HttpException) throw e;
    // Mensaje genérico: el detalle queda en logs, no en la respuesta.
    // eslint-disable-next-line no-console
    console.error('[auth-service]', e);
    throw new HttpException({ statusCode: 500, error: 'Internal Server Error', message: 'Error interno' }, 500);
  }
}

function errorName(status: number): string {
  return (
    {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      429: 'Too Many Requests',
      501: 'Not Implemented',
    } as Record<number, string>
  )[status] ?? 'Error';
}
