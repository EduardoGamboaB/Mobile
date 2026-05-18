import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  sub: string;        // userId
  companyId: string;
  role: 'driver' | 'dispatcher' | 'admin' | 'owner';
  tier: 'free' | 'starter' | 'pro' | 'business' | 'enterprise';
  iat?: number;
  exp?: number;
}

/** Extrae el JWT payload validado del request. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const req = ctx.switchToHttp().getRequest();
    return req.user as JwtPayload;
  },
);

/** Atajo: companyId del usuario actual (tenant scope). */
export const CurrentCompany = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    return (req.user as JwtPayload).companyId;
  },
);
