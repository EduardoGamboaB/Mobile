import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: unknown = { statusCode: status, message: 'Error inesperado' };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      body = typeof r === 'string' ? { statusCode: status, message: r } : r;
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      body = { statusCode: status, message: exception.message };
    }

    res.status(status).json({
      ...((typeof body === 'object' && body) || {}),
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
