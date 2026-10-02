import type { AuditActorDto, UserRole } from '@g3/contracts';
import { AuthError } from '../errors';

/** Metadatos de la petición para auditoría (los inyecta el gateway). */
export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}

/** Usuario autenticado que ejecuta una acción (headers x-user-* del gateway). */
export interface ActorContext extends RequestMeta {
  userId: string;
  companyId: string;
  role: UserRole;
}

export const ADMIN_ROLES: readonly UserRole[] = ['owner', 'admin'];
export const ALL_ROLES: readonly UserRole[] = ['owner', 'admin', 'dispatcher', 'driver', 'viewer'];

export function assertAdmin(actor: ActorContext): void {
  if (!ADMIN_ROLES.includes(actor.role)) {
    throw new AuthError(403, 'Solo owner o admin pueden realizar esta acción');
  }
}

export function auditActor(actor: { userId: string; role: UserRole }): AuditActorDto {
  return { type: 'user', userId: actor.userId, role: actor.role };
}

export const NO_META: RequestMeta = { ip: null, userAgent: null };
