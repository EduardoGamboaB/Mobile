/**
 * Errores de dominio con `status` HTTP y `toJSON()`; `HttpErrorFilter` los
 * traduce sin acoplar el servicio a Nest (mismo patrón que fleet/alerts).
 */
export class DomainError extends Error {
  constructor(
    readonly status: number,
    readonly error: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = new.target.name;
  }

  toJSON() {
    return { statusCode: this.status, error: this.error, message: this.message, ...(this.details ?? {}) };
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(400, 'Bad Request', message, details);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'No autenticado') {
    super(401, 'Unauthorized', message);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'No tienes permiso para esta acción') {
    super(403, 'Forbidden', message);
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string) {
    super(404, 'Not Found', message);
  }
}

export class BadGatewayError extends DomainError {
  constructor(message: string) {
    super(502, 'Bad Gateway', message);
  }
}
