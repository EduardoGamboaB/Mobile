import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest();
    const start = Date.now();
    const { method, originalUrl } = req;
    const company = req.user?.companyId ?? '-';

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        const res = ctx.switchToHttp().getResponse();
        this.logger.log(
          `${method} ${originalUrl} ${res.statusCode} · ${ms}ms · tenant=${company}`,
        );
      }),
    );
  }
}
