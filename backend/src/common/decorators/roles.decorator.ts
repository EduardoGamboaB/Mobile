import { SetMetadata } from '@nestjs/common';

export type Role = 'driver' | 'dispatcher' | 'admin' | 'owner';
export const ROLES_KEY = 'g3:roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
