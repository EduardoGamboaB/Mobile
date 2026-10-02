import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';

/**
 * Traduce errores de dominio con `status` + `toJSON()` (DomainError,
 * UpgradeRequiredError, TierLimitExceededError) a su código HTTP en lugar
 * del 500 por defecto de Nest.
 */
@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      res.status(exception.getStatus()).json(exception.getResponse());
      return;
    }
    const e = exception as { status?: unknown; message?: string; toJSON?: () => unknown };
    if (typeof e?.status === 'number' && e.status >= 400 && e.status < 600) {
      res.status(e.status).json(typeof e.toJSON === 'function' ? e.toJSON() : { statusCode: e.status, message: e.message });
      return;
    }
    res.status(500).json({ statusCode: 500, error: 'Internal Server Error', message: e?.message ?? 'Error' });
  }
}
