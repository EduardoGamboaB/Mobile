import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Inyecta el `companyId` del JWT en el contexto de la request para que
 * los servicios lo lean sin reimplementarlo. Combinado con `TenantEntity`
 * (column companyId NOT NULL indexada) garantiza aislamiento por tenant.
 *
 * Los servicios deben siempre filtrar por `companyId` en queries; este
 * interceptor no fuerza eso, sólo provee la información. La protección
 * dura está en RLS de Postgres (migración inicial) + revisión de PR.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest();
    if (req.user?.companyId) {
      req.companyId = req.user.companyId;
    }
    return next.handle();
  }
}
